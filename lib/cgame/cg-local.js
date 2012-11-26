var DEFAULT_MODEL = 'sarge';

var MAX_LOCAL_ENTITIES   = 512;

var PAIN_TWITCH_TIME = 200;

var FOOTSTEP = {
	NORMAL: 0,
	BOOT:   1,
	FLESH:  2,
	MECH:   3,
	ENERGY: 4,
	METAL:  5,
	SPLASH: 6,
	TOTAL:  7
};

var IMPACTSOUND = {
	DEFAULT: 0,
	METAL:   1,
	FLESH:   2
};

var ClientGame = function () {
	this.initialized           = false;
	this.frameInterpolation    = 0;                        // (float)( cg.time - cg.frame->serverTime ) / (cg.nextFrame->serverTime - cg.frame->serverTime)

	this.renderingThirdPerson  = false;
	this.thisFrameTeleport     = false;
	this.nextFrameTeleport     = false;
	this.time                  = 0;                        // this is the time value that the client is rendering at.
	this.oldTime               = 0;                        // time at last frame, used for missile trails and prediction checking
	this.frameTime             = 0;                        // cg.time - cg.oldTime
	this.physicsTime           = 0;                        // either cg.snap->time or cg.nextSnap->time
	this.latestSnapshotNum     = 0;                        // the number of snapshots the client system has received
	this.latestSnapshotTime    = 0;                        // the time from latestSnapshotNum, so we don't need to read the snapshot yet
	this.snap                  = null;                     // cg.snap->serverTime <= cg.time
	this.nextSnap              = null;                     // cg.nextSnap->serverTime > cg.time, or NULL
	this.entities              = new Array(MAX_GENTITIES);

	//
	this.pmove                 = new bg.PmoveInfo();
	this.solidEntities         = [];
	this.numSolidEntities      = 0;
	this.triggerEntities       = [];
	this.numTriggerEntities    = 0;
	
	// prediction state
	this.hyperspace            = false;                    // true if prediction has hit a trigger_teleport
	this.validPPS              = false;
	this.predictedErrorTime    = 0;
	this.predictedError        = [0, 0, 0];
	this.predictedPlayerState  = new sh.PlayerState();
	this.predictedPlayerEntity = new ClientEntity();

	// item resource info
	this.itemInfo              = [];
	this.weaponInfo            = [];                       // indexed by weapon num

	// input state sent to server
	this.weaponSelect          = 0;

	// auto rotating items
	this.autoAngles            = [0, 0, 0];
	this.autoAnglesFast        = [0, 0, 0];

	// view rendering
	this.refdef                = new re.RefDef();
	this.refdefViewAngles      = [0, 0 ,0];                // will be converted to refdef.viewaxis

	// scoreboard
	this.showScores            = false;

	// local entities
	this.localEntities         = null;
	this.activeLocalEntities   = null;                     // double linked list
	this.freeLocalEntities     = null;                     // single linked list

	// temp working variables for player view
	this.bobCycle              = 0;
	this.bobFracSin            = 0;
	this.xyspeed               = 0;

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
	this.media                = {};

	for (var i = 0; i < MAX_CLIENTS; i++) {
		this.clientinfo[i] = new ClientInfo();
	}
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
var PlayerEntity = function () {
	this.legs            = new LerpFrame();
	this.torso           = new LerpFrame();
	this.flag            = new LerpFrame();
	this.painTime        = 0;
	this.painDirection   = 0;                              // flip from 0 to 1
	this.lightningFiring = false;

	this.railFireTime    = 0;

	// Machinegun spinning.
	this.barrelAngle     = 0.0;
	this.barrelTime      = 0;
	this.barrelSpinning  = false;
};

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

// ClientEntity have a direct corespondence with GameEntity in the game, but
// only the EntityState is directly communicated to the cgame.
var ClientEntity =  function () {
	this.currentState  = new sh.EntityState();             // from cg.frame
	this.nextState     = new sh.EntityState();             // from cg.nextFrame, if available
	this.interpolate   = false;                            // true if next is valid to interpolate to
	this.currentValid  = false;                            // true if cg.frame holds this entity

	// int  muzzleFlashTime;  // move to playerEntity?
	this.previousEvent = 0;
	// int  teleportFlag;

	this.trailTime     = 0;                                // so missile trails can handle dropped initial packets
	// int  dustTrailTime;
	this.miscTime      = 0;

	this.snapshotTime  = 0;                                // last time this entity was found in a snapshot

	this.pe            = new PlayerEntity();
	/*
	int    errorTime;  // decay the error from this time
	vec3_t errorOrigin;
	vec3_t errorAngles;
	*/
	
	this.extrapolated  = false;                            // false if origin / angles is an interpolation
	this.rawOrigin     = [0, 0, 0];
	this.rawAngles     = [0, 0, 0];

	// Exact interpolated position of entity on this frame.
	this.lerpOrigin    = [0, 0, 0];
	this.lerpAngles    = [0, 0, 0];
};


/**********************************************************
 *
 * Local entities are created as a result of events or
 * predicted actions, and live independantly from all
 * server transmitted entities
 *
 **********************************************************/

// typedef struct markPoly_s {
// 	struct markPoly_s	*prevMark, *nextMark;
// 	int			time;
// 	qhandle_t	markShader;
// 	qboolean	alphaFade;		// fade alpha instead of rgb
// 	float		color[4];
// 	poly_t		poly;
// 	polyVert_t	verts[MAX_VERTS_ON_POLY];
// } markPoly_t;

var LE = {
	MARK:             0,
	EXPLOSION:        1,
	SPRITE_EXPLOSION: 2,
	FRAGMENT:         3,
	MOVE_SCALE_FADE:  4,
	FALL_SCALE_FADE:  5,
	FADE_RGB:         6,
	SCALE_FADE:       7,
	SCOREPLUM:        8
};

var LEF = {
	PUFF_DONT_SCALE: 0x0001,                               // do not scale size over time
	TUMBLE:          0x0002,                               // tumble over time, used for ejecting shells
	SOUND1:          0x0004,                               // sound 1 for kamikaze
	SOUND2:          0x0008                                // sound 2 for kamikaze
};

// Fragment local entities can leave marks on walls.
var LEMT = {
	NONE:  0,
	BURN:  1,
	BLOOD: 2
};

// Fragment local entities can make sounds on impacts.
var LEBS = {
	NONE:  0,
	BLOOD: 1,
	BRASS: 2
};

var LocalEntity = function () {
	this.reset();
};

LocalEntity.prototype.reset = function () {
	this.prev              = null;
	this.next              = null;
	this.leType            = 0;
	this.leFlags           = 0;

	this.startTime         = 0;
	this.endTime           = 0;
	this.fadeInTime        = 0;

	this.lifeRate          = 0;                            // 1.0 / (endTime - startTime)

	this.pos               = new sh.Trajectory();
	this.angles            = new sh.Trajectory();

	this.bounceFactor      = 0;                            // 0.0 = no bounce, 1.0 = perfect
	this.color             = [0, 0, 0, 0];
	this.radius            = 0;
	this.light             = 0;
	this.lightColor        = [0, 0, 0];
	this.leMarkType        = 0;                            // mark to leave on fragment impact
	this.leBounceSoundType = 0;

	this.refent            = new re.RefEntity();
};

/**********************************************************
 *
 * Entity info
 *
 **********************************************************/
var ClientInfo = function () {
	this.reset();
};

ClientInfo.prototype.reset = function () {
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

	// footstep_t footsteps;
	// gender_t gender;  // from model

	this.legsModel     = -1;
	this.legsSkin      = -1;

	this.torsoModel    = -1;
	this.torsoSkin     = -1;

	this.headModel     = -1;
	this.headSkin      = -1;

	this.animations    = new Array(ANIM.MAX_TOTALANIMATIONS);
	this.sounds        = new Array(customSoundNames.length);

	for (var i = 0; i < ANIM.MAX_TOTALANIMATIONS; i++) {
		this.animations[i] = new bg.Animation();
	}
};

var ItemInfo = function () {
	this.modelHandles = [];
	this.icon         = -1;
};

// Each WP.* weapon enum has an associated WeaponInfo that
// contains media references necessary to present the
// weapon and its effects.
var WeaponInfo = function () {
	//gitem_t			*item;

	this.handsModel     = null;  // the hands don't actually draw, they just position the weapon
	this.weaponModel    = null;
	this.barrelModel    = null;
	this.flashModel     = null;

	this.weaponMidpoint = [0, 0, 0];		// so it will rotate centered instead of by tag

	// this.flashDlight      = 0;
	// this.flashDlightColor = [0, 0, 0];
	this.flashSound     = [0, 0, 0, 0];		// fast firing weapons randomly choose

	this.weaponIcon     = 0;
	this.ammoIcon       = 0;

	this.ammoModel      = 0;

	this.missileModel   = 0;
	this.missileSound   = 0;
	this.missileTrailFunc   = null;
	// this.missileDlight      = 0;
	// this.missileDlightColor = [0, 0, 0];
	// this.missileRenderfx    = 0;

	// this.ejectBrassFunc     = null;

	this.trailRadius        = 0;
	this.trailTime        = 0;

	this.readySound     = 0;
	this.firingSound    = 0;
};