var DEFAULT_MODEL = 'sarge';
var DEFAULT_TEAM_MODEL = 'sarge';

var MAX_LOCAL_ENTITIES = 512;

// #define	POWERUP_BLINK_TIME	1000
// var FADE_TIME         = 200;
// #define	PULSE_TIME			200
// #define	DAMAGE_DEFLECT_TIME	100
// #define	DAMAGE_RETURN_TIME	400
// #define DAMAGE_TIME			500
var LAND_DEFLECT_TIME = 150;
var LAND_RETURN_TIME  = 300;
var STEP_TIME         = 200;
var DUCK_TIME         = 100;
var PAIN_TWITCH_TIME  = 200;
// #define	WEAPON_SELECT_TIME	1400
var ITEM_SCALEUP_TIME = 1000;
var ZOOM_TIME         = 150;
// #define	ITEM_BLOB_TIME		200
var MUZZLE_FLASH_TIME = 20;
var SINK_TIME         = 1000;  // time for fragments to sink into ground before going away
// #define	ATTACKER_HEAD_TIME	10000
var REWARD_TIME       = 3000;

var MAX_STEP_CHANGE = 32;

var MAX_REWARDSTACK = 10;
var MAX_SOUNDBUFFER = 20;

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

var GENDER = {
	MALE:   0,
	FEMALE: 1,
	NEUTER: 2
};

var ClientGame = function () {
	this.initialized           = false;
	this.frameInterpolation    = 0;                        // (float)( cg.time - cg.frame->serverTime ) / (cg.nextFrame->serverTime - cg.frame->serverTime)

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

	this.renderingThirdPerson  = false;

	this.timelimitWarnings     = 0;                        // 5 min, 1 min, overtime
	this.fraglimitWarnings     = 0;

	this.mapRestart            = false;                    // set on a map restart to set back the weapon

	//
	this.pmove                 = new BG.PmoveInfo();
	this.solidEntities         = [];
	this.numSolidEntities      = 0;
	this.triggerEntities       = [];
	this.numTriggerEntities    = 0;

	// Prediction state.
	this.hyperspace            = false;                    // true if prediction has hit a trigger_teleport
	this.validPPS              = false;
	this.predictedErrorTime    = 0;
	this.predictedError        = vec3.create();
	this.predictedPlayerState  = new QS.PlayerState();
	this.predictedPlayerEntity = new ClientEntity();

	this.stepChange            = 0;                        // for stair up smoothing
	this.stepTime              = 0;
	this.duckChange            = 0;                        // for duck viewheight smoothing
	this.duckTime              = 0;
	this.landChange            = 0;                        // for landing hard
	this.landTime              = 0;

	// Item resource info.
	this.itemInfo              = [];

	// Input state sent to server.
	this.weaponSelect          = 0;

	// Auto rotating items.
	this.autoAngles            = vec3.create();
	this.autoAnglesFast        = vec3.create();

	// View rendering.
	this.refdef                = new RE.RefDef();
	this.refdefViewAngles      = vec3.create();            // will be converted to refdef.viewaxis

	// Zoom key.
	this.zoomed                = false;
	this.zoomTime              = 0;
	this.zoomSensitivity       = 0;

	// Teamboard.
	this.teams                 = null;

	// Scoreboard.
	this.scoresRequestTime     = 0;
	this.showScores            = false;

	// Low ammo warning state.
	this.lowAmmoWarning        = 0;  // 1 = low, 2 = empty

	// Crosshair client ID.
	this.crosshairName         = 0;
	this.crosshairNameTime     = 0;

	// Powerup active flashing.
	this.powerupActive         = 0;
	this.powerupTime           = 0;

	// Reward medals.
	this.rewardStack           = 0;
	this.rewardTime            = 0;
	this.rewardCount           = new Array(MAX_REWARDSTACK);
	this.rewardShader          = new Array(MAX_REWARDSTACK);
	this.rewardSound           = new Array(MAX_REWARDSTACK);

	// Sound buffer mainly for announcer sounds.
	this.soundBufferIn         = 0;
	this.soundBufferOut        = 0;
	this.soundTime             = 0;
	this.soundBuffer           = new Array(MAX_SOUNDBUFFER);

	// Warmup countdown.
	this.lastGamestate         = 0;
	this.warmupCount           = 0;

	// Local entities.
	this.localEntities         = null;
	this.activeLocalEntities   = null;                     // double linked list
	this.freeLocalEntities     = null;                     // single linked list

	// Temp working variables for player view.
	this.bobCycle              = 0;
	this.bobFracSin            = 0;
	this.xyspeed               = 0;

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.entities[i] = new ClientEntity();
	}
};

/**
 * The client game static (cgs) structure hold everything
 * loaded or calculated from the gamestate. It will NOT
 * be cleared when a tournement restart is done, allowing
 * all clients to begin playing instantly.
 */
var ClientGameStatic = function () {
	this.gameState            = null;
	this.mapname              = null;
	this.processedSnapshotNum = 0;                         // the number of snapshots cgame has requested

	// Parsed from serverinfo.
	this.maxclients           = 0;
	this.mapname              = 0;
	this.timelimit            = 0;
	this.fraglimit            = 0;
	this.capturelimit         = 0;

	// Parsed from arenainfo.
	this.arena                = null;
	this.arenas               = [];

	// this.voteTime             = 0;
	// this.voteYes              = 0;
	// this.voteNo               = 0;
	// this.voteModified         = false;                     // beep whenever changed
	// this.voteString           = null;

	// this.teamVoteTime         = new Array(2);
	// this.teamVoteYes          = new Array(2);
	// this.teamVoteNo           = new Array(2);
	// this.teamVoteModified     = new Array(2);              // beep whenever changed
	// this.teamVoteString       = new Array(2);

	this.levelStartTime       = 0;

	// Locally derived information from gamestate.
	this.gameModels           = new Array(QS.MAX_MODELS);
	this.gameSounds           = new Array(QS.MAX_SOUNDS);

	this.inlineDrawModels     = null;
	this.inlineModelMidpoints = null;

	this.clientinfo           = new Array(MAX_CLIENTS);
	this.media                = {};

	for (var i = 0; i < MAX_CLIENTS; i++) {
		this.clientinfo[i] = new ClientInfo();
	}
};

var ArenaInfo = function () {
	this.name            = null;
	this.gametype        = 0;
	this.gamestate       = 0;
	this.playersPerTeam  = 0;
	this.roundlimit      = 0;
	this.warmupTime      = 0;
	this.winningTeam     = null;
	this.score1          = 0;
	this.score2          = 0;
	this.intermission    = 0;
	this.redflag         = 0;
	this.blueflag        = 0;
	this.neutralflag     = 0;
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
	this.reset();
};

LerpFrame.prototype.reset = function () {
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
var ClientEntity = function () {
	this.currentState  = new QS.EntityState();             // from cg.frame
	this.nextState     = new QS.EntityState();             // from cg.nextFrame, if available
	this.interpolate   = false;                            // true if next is valid to interpolate to
	this.currentValid  = false;                            // true if cg.frame holds this entity

	this.muzzleFlashTime = 0;  // move to playerEntity?
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
	this.rawOrigin     = vec3.create();
	this.rawAngles     = vec3.create();

	// Exact interpolated position of entity on this frame.
	this.lerpOrigin    = vec3.create();
	this.lerpAngles    = vec3.create();
};

/**********************************************************
 *
 * Local entities are created as a result of events or
 * predicted actions, and live independantly from all
 * server transmitted entities
 *
 **********************************************************/

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
	this.fadeTime          = 0;
	this.alphaFade         = false;

	this.pos               = new QS.Trajectory();
	this.angles            = new QS.Trajectory();

	this.bounceFactor      = 0;                            // 0.0 = no bounce, 1.0 = perfect
	this.color             = [0, 0, 0, 0];
	this.radius            = 0;
	this.light             = 0;
	this.lightColor        = vec3.create();
	this.leMarkType        = 0;                            // mark to leave on fragment impact
	this.leBounceSoundType = 0;

	this.refent            = new RE.RefEntity();
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
	this.arena         = ARENANUM_NONE;
	this.name          = null;
	this.team          = TEAM.FREE;
	this.group         = null;

	// this.powerups      = 0;                                // so can display quad/flag status

	// When clientinfo is changed, the loading of models/skins/sounds
	// can be deferred until you are dead, to prevent hitches in
	// gameplay.
	this.modelName     = null;
	this.skinName      = null;
	this.headModelName = null;
	this.headSkinName  = null;

	this.fixedlegs     = false;                            // true if legs yaw is always the same as torso yaw
	this.fixedtorso    = false;                            // true if torso never changes yaw

	this.footsteps     = FOOTSTEP.NORMAL;
	this.gender        = GENDER.NEUTER;

	this.legsModel     = -1;
	this.legsSkin      = -1;

	this.torsoModel    = -1;
	this.torsoSkin     = -1;

	this.headModel     = -1;
	this.headSkin      = -1;

	this.animations    = new Array(ANIM.MAX_TOTALANIMATIONS);
	this.sounds        = new Array(customSoundNames.length);

	for (var i = 0; i < ANIM.MAX_TOTALANIMATIONS; i++) {
		this.animations[i] = new BG.Animation();
	}
};

var ItemInfo = function () {
	this.models         = {};
	this.shaders        = {};
	this.gfx            = {};
	this.sounds         = {};

	// Used by weapons with barrels.
	this.weaponMidpoint = vec3.create();  // so it will rotate centered instead of by tag

	// Used by missiles.
	this.trailRadius    = 0;
	this.trailTime      = 0;
};