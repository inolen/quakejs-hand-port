var DEFAULT_MODEL = 'sarge';

var CMD_BACKUP = 64;
var CMD_MASK   = (CMD_BACKUP - 1);

var ClientGame = function () {
	this.initialized          = false;
	this.frameInterpolation   = 0;                         // (float)( cg.time - cg.frame->serverTime ) / (cg.nextFrame->serverTime - cg.frame->serverTime)

	this.thisFrameTeleport    = false;
	this.nextFrameTeleport    = false;
	this.time                 = 0;                         // this is the time value that the client is rendering at.
	this.oldTime              = 0;                         // time at last frame, used for missile trails and prediction checking
	this.frameTime            = 0;                         // cg.time - cg.oldTime
	this.physicsTime          = 0;                         // either cg.snap->time or cg.nextSnap->time
	this.latestSnapshotNum    = 0;                         // the number of snapshots the client system has received
	this.latestSnapshotTime   = 0;                         // the time from latestSnapshotNum, so we don't need to read the snapshot yet
	this.snap                 = null;                      // cg.snap->serverTime <= cg.time
	this.nextSnap             = null;                      // cg.nextSnap->serverTime > cg.time, or NULL
	this.entities             = new Array(MAX_GENTITIES);
	
	// prediction state
	this.hyperspace           = false;                     // true if prediction has hit a trigger_teleport
	this.validPPS             = false;
	this.predictedErrorTime   = 0;
	this.predictedError       = [0, 0, 0];
	this.predictedPlayerState = null;

	// item resource info
	this.itemInfo             = new Array();

	// auto rotating items
	this.autoAngles           = [0, 0, 0];
	this.autoAnglesFast       = [0, 0, 0];

	// view rendering
	this.refdef               = new RefDef();
	this.refdefViewAngles     = [0, 0 ,0];                 // will be converted to refdef.viewaxis

	// scoreboard
	this.showScores           = false;

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.entities[i] = new ClientEntity();
	}
};

var ClientGameStatic = function () {
	this.gameState            = null;
	this.mapname              = null;
	this.processedSnapshotNum = 0;               // the number of snapshots cgame has requested

	// locally derived information from gamestate
	this.clientinfo           = new Array(MAX_CLIENTS);
};

/**
 * Player entities need to track more information
 * than any other type of entity.
 *
 * Note that not every player entity is a client entity,
 * because corpses after respawn are outside the normal
 * client numbering range.

 * When changing animation, set animationTime to frameTime + lerping time.
 * The current lerp will finish out, then it will lerp to the new animation.
*/
var LerpFrame = function () {
	this.oldFrame        = 0;
	this.oldFrameTime    = 0;                              // time when ->oldFrame was exactly on

	this.frame           = 0;
	this.frameTime       = 0;                              // time when ->frame will be exactly on

	this.backlerp        = 0.0;

	this.yawAngle        = 0.0;
	this.yawing          = false;
	this.pitchAngle      = 0.0;
	this.pitching        = false;

	this.animationNumber = 0;
	this.animation       = null;
	this.animationTime   = 0;
};


var PlayerEntity = function () {
	this.legs            = new LerpFrame();
	this.torso           = new LerpFrame();
	this.flag            = new LerpFrame();
	this.paintTime       = 0;
	this.painDirection   = 0;	// flip from 0 to 1
	this.lightningFiring = false;

	this.railFireTime    = 0;

	// Machinegun spinning.
	this.barrelAngle     = 0.0;
	this.barrelTime      = 0;
	this.barrelSpinning  = false;
};

// ClientEntity have a direct corespondence with GameEntity in the game, but
// only the EntityState is directly communicated to the cgame.
var ClientEntity =  function () {
	this.currentState = new EntityState();       // from cg.frame
	this.nextState    = new EntityState();       // from cg.nextFrame, if available
	this.interpolate  = false;                   // true if next is valid to interpolate to
	this.currentValid = false;                   // true if cg.frame holds this entity

	/*
	int				muzzleFlashTime;	// move to playerEntity?
	int				previousEvent;
	int				teleportFlag;

	int				trailTime;		// so missile trails can handle dropped initial packets
	int				dustTrailTime;
	int				miscTime;
	*/

	this.snapShotTime = 0;                    // last time this entity was found in a snapshot

	this.pe           = new PlayerEntity();
	/*
	int				errorTime;		// decay the error from this time
	vec3_t			errorOrigin;
	vec3_t			errorAngles;
	*/
	
	this.extrapolated = false;                   // false if origin / angles is an interpolation
	this.rawOrigin    = [0, 0, 0];
	this.rawAngles    = [0, 0, 0];

	// exact interpolated position of entity on this frame
	this.lerpOrigin = [0, 0, 0];
	this.lerpAngles = [0, 0, 0];
};


var ClientInfo = function () {
	this.infoValid     = false;
	this.name          = null;

	// When clientinfo is changed, the loading of models/skins/sounds
	// can be deferred until you are dead, to prevent hitches in
	// gameplay.
	this.modelName     = null;
	this.skinName      = null;
	this.headModelName = null;
	this.headSkinName  = null;

	this.fixedlegs     = false;		// true if legs yaw is always the same as torso yaw
	this.fixedtorso    = false;		// true if torso never changes yaw

	// footstep_t		footsteps;
	// gender_t		gender;			// from model

	this.legsModel     = -1;
	this.legsSkin      = -1;

	this.torsoModel    = -1;
	this.torsoSkin     = -1;

	this.headModel     = -1;
	this.headSkin      = -1;

	this.animations    = new Animation(Animations.MAX_TOTALANIMATIONS);

	for (var i = 0; i < Animations.MAX_TOTALANIMATIONS; i++) {
		this.animations[i] = new Animation();
	}
};

var ItemInfo = function () {
	this.modelHandles = [];
	this.icon         = -1;
};