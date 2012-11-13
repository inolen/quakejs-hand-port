define('shared/shared', ['shared/qmath'], function (qm) {

var BASE_FOLDER = 'baseq3';
var MAX_QPATH = 64;

// TODO Moved to cl-constants once it's created.
var CMD_BACKUP = 64;

// TODO Move to com
var Err = {
	FATAL:      0,                                         // exit the entire game with a popup window
	DROP:       1,
	DISCONNECT: 2,                                         // client disconnected from the server
};

/**
 * Cvars
 * 
 * TODO Move to com
 */
var Cvar = function (defaultValue, flags) {
	var currentValue = defaultValue;
	var cvar = function (newValue) {
		if (arguments.length) {
			var oldValue = currentValue;

			// Convert the new value to the same type
			// as the default value.
			if (typeof(defaultValue) === 'string') {
				currentValue = newValue.toString();
			} else if (defaultValue % 1 === 0) {
				currentValue = parseInt(newValue, 10);
			} else {
				currentValue = parseFloat(newValue);
			}
		} else {
			return currentValue;
		}
	};

	cvar.flags = flags;

	return cvar;
};

var CvarFlags = {
	ARCHIVE:    0x0001,                                    // save to config file
	USERINFO:   0x0002,                                    // sent to server on connect or change
	SERVERINFO: 0x0004,                                    // sent in response to front end requests
	SYSTEMINFO: 0x0008                                     // these cvars will be duplicated on all clients
};

var MAX_DRAWSURFS  = 0x10000;
var ENTITYNUM_BITS = 10;// can't be increased without changing drawsurf bit packing
var MAX_ENTITIES   = (1 << ENTITYNUM_BITS);

// TODO This should be moved back to re-defines, we should have
// ReRefDef that has the appended internal state.
var DrawSurface = function () {
	this.sort    = 0;                                      // bit combination for fast compares
	this.surface = -1;                                     // any of surface*_t
};

var RefDef = function () {
	this.x              = 0;
	this.y              = 0;
	this.width          = 0;
	this.height         = 0;
	this.fovX           = 0;
	this.fovY           = 0;
	this.vieworg        = [0, 0, 0];
	this.viewaxis       = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	// Time in milliseconds for shader effects and other time dependent rendering issues.
	this.time           = 0;
	this.drawSurfs      = new Array(MAX_DRAWSURFS);
	this.numDrawSurfs   = 0;
	this.refEntities    = new Array(MAX_ENTITIES);
	this.numRefEntities = 0;

	for (var i = 0; i < MAX_DRAWSURFS; i++) {
		this.drawSurfs[i] = new DrawSurface();
	}

	for (var i = 0; i < MAX_ENTITIES; i++) {
		this.refEntities[i] = new RefEntity();
	}
};

RefDef.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new RefDef();
	}

	to.x = this.x;
	to.y = this.y;
	to.width = this.width;
	to.height = this.height;
	to.fovX = this.fovX;
	to.fovY = this.fovY;
	vec3.set(this.vieworg, to.vieworg);
	vec3.set(this.viewaxis[0], to.viewaxis[0]);
	vec3.set(this.viewaxis[1], to.viewaxis[1]);
	vec3.set(this.viewaxis[2], to.viewaxis[2]);
	to.time = this.time;

	// Shallow copy is OK.
	to.drawSurfs = this.drawSurfs;
	to.numDrawSurfs = this.numDrawSurfs;
	to.refEntities = this.refEntities;
	to.numRefEntities = this.numRefEntities;

	return to;
};

var RefEntityType = {
	MODEL:               0,
	POLY:                1,
	SPRITE:              2,
	BEAM:                3,
	RAIL_CORE:           4,
	RAIL_RINGS:          5,
	LIGHTNING:           6,
	PORTALSURFACE:       7,                                // doesn't draw anything, just info for portals
	MAX_REF_ENTITY_TYPE: 8
};

var RenderFx = {
	MINLIGHT:        0x0001,                               // allways have some light (viewmodel, some items)
	THIRD_PERSON:    0x0002,                               // don't draw through eyes, only mirrors (player bodies, chat sprites)
	FIRST_PERSON:    0x0004,                               // only draw through eyes (view weapon, damage blood blob)
	DEPTHHACK:       0x0008,                               // for view weapon Z crunching
	NOSHADOW:        0x0040,                               // don't add stencil shadows
	LIGHTING_ORIGIN: 0x0080,                               // use refEntity->lightingOrigin instead of refEntity->origin
	                                                       // for lighting.  This allows entities to sink into the floor
	                                                       // with their origin going solid, and allows all parts of a
	                                                       // player to get the same lighting
	SHADOW_PLANE:    0x0100,                               // use refEntity->shadowPlane
	WRAP_FRAMES:     0x0200                                // mod the model frames by the maxframes to allow continuous
};

// TODO move to shared
var RefEntity = function () {
	this.index              = 0;                           // internal use only
	this.reType             = 0;
	this.renderfx           = 0;
	this.origin             = [0, 0, 0];
	this.lightingOrigin     = [0, 0, 0];                   // so multi-part models can be lit identically (RF_LIGHTING_ORIGIN)
	this.axis               = [                            // rotation vectors
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	this.frame              = 0;
	// previous data for frame interpolation
	this.oldOrigin          = [0, 0, 0];
	this.oldFrame           = 0;
	this.backlerp           = 0;
	// model
	this.hModel             = 0;
	// texturing
	this.skinNum            = 0;                          // inline skin index
	this.customSkin         = 0;                          // NULL for default skin
	this.customShader       = 0;                          // use one image for the entire thing

	// internal use only	
	this.lightingCalculated = false;
	this.lightDir           = [0, 0, 0];                   // normalized direction towards light
	this.ambientLight       = [0, 0, 0];                   // color normalized to 0-255
	this.directedLight      = [0, 0, 0];                   // color normalized to 0-255
};

RefEntity.prototype.clone = function (refent) {
	if (typeof(refent) === 'undefined') {
		refent = new RefEntity();
	}

	refent.index = this.index;
	refent.reType = this.reType;
	refent.renderfx = this.renderfx;
	vec3.set(this.origin, refent.origin);
	vec3.set(this.lightingOrigin, refent.lightingOrigin);
	vec3.set(this.axis[0], refent.axis[0]);
	vec3.set(this.axis[1], refent.axis[1]);
	vec3.set(this.axis[2], refent.axis[2]);
	refent.frame = this.frame;
	vec3.set(this.oldOrigin, refent.oldOrigin);
	refent.oldFrame = this.oldFrame;
	refent.backlerp = this.backlerp;
	refent.hModel = this.hModel;
	refent.skinNum = this.skinNum;
	refent.customSkin = this.customSkin;
	refent.customShader = this.customShader;
	refent.lightingCalculated = this.lightingCalculated;
	vec3.set(this.lightDir, refent.lightDir);
	vec3.set(this.ambientLight, refent.ambientLight);
	vec3.set(this.directedLight, refent.directedLight);


	return refent;
};

var ViewParms = function () {
	this.or               = new Orientation();
	// this.world            = new Orientation();
	this.pvsOrigin        = [0, 0, 0];                     // may be different than or.origin for portals
	this.x                = 0;
	this.y                = 0;
	this.width            = 0;
	this.height           = 0;
	this.fovX             = 0;
	this.fovY             = 0;
	this.frustum          = [
		new qm.Plane(),
		new qm.Plane(),
		new qm.Plane(),
		new qm.Plane()
	];
	this.visBounds        = [
		[0, 0, 0],
		[0, 0, 0]
	];
	this.zFar             = 0;
	this.projectionMatrix = mat4.create();
	this.frameSceneNum    = 0;
	this.frameCount       = 0;
};

ViewParms.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new ViewParms();
	}

	this.or.clone(to.or);
	// this.world.clone(to.world);
	vec3.set(this.pvsOrigin, to.pvsOrigin);
	to.x = this.x;
	to.y = this.y;
	to.width = this.width;
	to.height = this.height;
	to.fovX = this.fovX;
	to.fovY = this.fovY;
	this.frustum[0].clone(to.frustum[0]);
	this.frustum[1].clone(to.frustum[1]);
	this.frustum[2].clone(to.frustum[2]);
	this.frustum[3].clone(to.frustum[3]);
	vec3.set(this.visBounds[0], to.visBounds[0]);
	vec3.set(this.visBounds[1], to.visBounds[1]);
	to.zFar = this.zFar;
	mat4.set(this.projectionMatrix, to.projectionMatrix);
	to.frameSceneNum = this.frameSceneNum;
	to.frameCount = this.frameCount;

	return to;
};

/**
 * Communicated across the network
 */
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

var MAX_CLIENTS            = 32;                           // absolute limit
var MAX_GENTITIES          = 1024;
var MAX_MODELS             = 256;                          // these are sent over the net as 8 bits
var MAX_SOUNDS             = 256;                          // so they cannot be blindly increased

var ENTITYNUM_NONE         = MAX_GENTITIES-1;
var ENTITYNUM_WORLD        = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL   = MAX_GENTITIES-2;

var MOVE_RUN = 120;                                        // if forwardmove or rightmove are >= MOVE_RUN,
	                                                       // then BUTTON_WALKING should be set

var NetAdrType = {
	NAD:      0,
	LOOPBACK: 1,
	IP:       2
};

var NetSrc = {
	CLIENT : 0,
	SERVER: 1
};

var NetAdr = function (type, ip, port) {
	this.type = type;
	this.ip   = ip;
	this.port = port;
};

var Buttons = {
	ATTACK:       1,
	TALK:         2,                                       // displays talk balloon and disables actions
	USE_HOLDABLE: 4,
	GESTURE:      8,
	WALKING:      16,                                      // walking can't just be infered from MOVE_RUN
	                                                       // because a key pressed late in the frame will
	                                                       // only generate a small move value for that frame
	                                                       // walking will use different animations and
	                                                       // won't generate footsteps
	AFFIRMATIVE:  32,
	NEGATIVE:     64,
	GETFLAG:      128,
	GUARDBASE:    256,
	PATROL:       512,
	FOLLOWME:     1024,
	ANY:          2048                                     // any key whatsoever
};

var UserCmd = function () {
	this.serverTime  = 0;
	this.angles      = [0, 0, 0];
	this.forwardmove = 0;
	this.rightmove   = 0;
	this.upmove      = 0;
	this.buttons     = 0;
	this.weapon      = 0;
};

UserCmd.prototype.clone = function (cmd) {
	if (typeof(cmd) === 'undefined') {
		cmd = new UserCmd();
	}

	cmd.serverTime = this.serverTime;
	vec3.set(this.angles, cmd.angles);
	cmd.forwardmove = this.forwardmove;
	cmd.rightmove = this.rightmove;
	cmd.upmove = this.upmove;
	cmd.buttons = this.buttons;
	cmd.weapon = this.weapon;

	return cmd;
};

/**
 * Player state
 */
var MAX_STATS              = 16;
var MAX_PERSISTANT         = 16;
var MAX_POWERUPS           = 16;
var MAX_WEAPONS            = 16;
var MAX_PS_EVENTS          = 2;
var PMOVEFRAMECOUNTBITS = 6;

var PlayerState = function () {
	this.clientNum         = 0;                            // ranges from 0 to MAX_CLIENTS-1
	this.commandTime       = 0;                            // cmd->serverTime of last executed command
	this.pm_type           = 0;
	this.pm_flags          = 0;                            // ducked, jump_held, etc
	this.origin            = [0, 0, 0];
	this.velocity          = [0, 0, 0];
	this.viewangles        = [0, 0, 0];
	this.delta_angles      = [0, 0, 0];                    // add to command angles to get view direction
	                                                      // changed by spawns, rotating objects, and teleporters
	this.speed             = 0;
	this.gravity           = 0;
	this.groundEntityNum   = ENTITYNUM_NONE;               // ENTITYNUM_NONE = in air

	this.weapon            = 0;                            // copied to entityState_t->weapon
	this.weaponState       = 0;
	this.weaponTime        = 0;
	this.legsTimer         = 0;                            // don't change low priority animations until this runs out
	this.legsAnim          = 0;                            // mask off ANIM_TOGGLEBIT

	this.torsoTimer        = 0;                            // don't change low priority animations until this runs out
	this.torsoAnim         = 0;                            // mask off ANIM_TOGGLEBIT

	this.movementDir       = 0;                            // a number 0 to 7 that represents the relative angle
	                                                       // of movement to the view angle (axial and diagonals)
	                                                       // when at rest, the value will remain unchanged
	                                                       // used to twist the legs during strafing
	this.stats             = new Array(MAX_STATS);
	this.persistant        = new Array(MAX_PERSISTANT);    // stats that aren't cleared on death
	this.powerups          = new Array(MAX_POWERUPS);      // level.time that the powerup runs out
	this.ammo              = new Array(MAX_WEAPONS);

	this.eventSequence     = 0;                            // pmove generated events
	this.events            = new Array(MAX_PS_EVENTS);
	this.eventParms        = new Array(MAX_PS_EVENTS);

	this.externalEvent     = 0;                            // events set on player from another source
	this.externalEventParm = 0;
	this.externalEventTime = 0;

	this.jumppad_ent       = 0;                            // jumppad entity hit this frame
	this.jumppad_frame     = 0;
	this.pmove_framecount  = 0;

	for (var i = 0; i < MAX_STATS; i++) {
		this.stats[i] = 0;
	}
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		this.persistant[i] = 0;
	}
	for (var i = 0; i < MAX_POWERUPS; i++) {
		this.powerups[i] = 0;
	}
	for (var i = 0; i < MAX_WEAPONS; i++) {
		this.ammo[i] = 0;
	}
};

// deep copy
PlayerState.prototype.clone = function (ps) {
	if (typeof(ps) === 'undefined') {
		ps = new PlayerState();
	}

	ps.clientNum            = this.clientNum;
	ps.commandTime          = this.commandTime;
	ps.pm_type              = this.pm_type;
	ps.pm_flags             = this.pm_flags;
	vec3.set(this.origin, ps.origin);
	vec3.set(this.velocity, ps.velocity);
	vec3.set(this.viewangles, ps.viewangles);
	vec3.set(this.delta_angles, ps.delta_angles);
	ps.speed                = this.speed;
	ps.gravity              = this.gravity;
	ps.groundEntityNum      = this.groundEntityNum;
	ps.weapon               = this.weapon;
	ps.weaponState          = this.weaponState;
	ps.weaponTime           = this.weaponTime;
	ps.legsTimer            = this.legsTimer;
	ps.legsAnim             = this.legsAnim;
	ps.torsoTimer           = this.torsoTimer;
	ps.torsoAnim            = this.torsoAnim;
	ps.movementDir          = this.movementDir;
	for (var i = 0; i < MAX_STATS; i++) {
		ps.stats[i] = this.stats[i];
	}
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		ps.persistant[i] = this.persistant[i];
	}
	for (var i = 0; i < MAX_POWERUPS; i++) {
		ps.powerups[i] = this.powerups[i];
	}
	for (var i = 0; i < MAX_WEAPONS; i++) {
		ps.ammo[i] = this.ammo[i];
	}
	ps.eventSequence        = this.eventSequence;
	for (var i = 0; i < MAX_PS_EVENTS; i++) {
		ps.events[i] = this.events[i];
		ps.eventParms[i] = this.eventParms[i];
	}
	ps.jumppad_ent          = this.jumppad_ent;
	ps.jumppad_frame        = this.jumppad_frame;
	ps.pmove_framecount     = this.pmove_framecount;

	return ps;
};

var TrajectoryType = {
	STATIONARY:  0,
	INTERPOLATE: 1,                              // non-parametric, but interpolate between snapshots
	LINEAR:      2,
	LINEAR_STOP: 3,
	SINE:        4,                              // value = base + sin( time / duration ) * delta
	GRAVITY:     5
};

var Trajectory = function () {
	this.trType     = 0;
	this.trTime     = 0;
	this.trDuration = 0;
	this.trBase     = [0, 0, 0];
	this.trDelta    = [0, 0, 0];
};

Trajectory.prototype.clone = function (tr) {
	if (typeof(tr) === 'undefined') {
		tr = TrajectoryType();
	}

	tr.trType = this.trType;
	tr.trTime = this.trTime;
	tr.trDuration = this.trDuration;
	vec3.set(this.trBase, tr.trBase);
	vec3.set(this.trDelta, tr.trDelta);

	return tr;
};

var Orientation = function () {
	this.origin      = vec3.create();                      // in world coordinates
	this.axis        = [                                   // orientation in world
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	// Used by renderer.
	this.viewOrigin  = vec3.create();                      // viewParms->or.origin in local coordinates
	this.modelMatrix = mat4.create();
};

Orientation.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new Orientation();
	}

	vec3.set(this.origin, to.origin);
	vec3.set(this.axis[0], to.axis[0]);
	vec3.set(this.axis[1], to.axis[1]);
	vec3.set(this.axis[2], to.axis[2]);
	vec3.set(this.viewOrigin, to.viewOrigin);
	mat4.set(this.modelMatrix, to.modelMatrix);

	return to;
};

/**********************************************************
 * EntityState is the information conveyed from the server
 * in an update message about entities that the client will
 * need to render in some way. Different eTypes may use the
 * information in different ways. The messages are delta
 * compressed, so it doesn't really matter if the structure
 * size is fairly large
 **********************************************************/
var EntityState = function () {
	this.number          = 0;                              // entity index
	this.eType           = 0;                              // entityType_t
	this.eFlags          = 0;
	this.pos             = new Trajectory();               // for calculating position
	this.apos            = new Trajectory();               // for calculating angles
	this.time            = 0;
	this.time2           = 0;
	this.origin          = [0, 0, 0];
	this.origin2         = [0, 0, 0];
	this.angles          = [0, 0, 0];
	this.angles2         = [0, 0, 0];
	this.groundEntityNum = ENTITYNUM_NONE;                 // ENTITYNUM_NONE = in air
	this.modelIndex      = 0;
	this.modelIndex2     = 0;
	this.clientNum       = 0;                              // 0 to (MAX_CLIENTS - 1), for players and corpses
	this.frame           = 0;
	this.solid           = 0;                              // for client side prediction, trap_linkentity sets this properly
	this.event           = 0;                              // impulse events -- muzzle flashes, footsteps, etc
	this.eventParm       = 0;
	// For players.
	this.weapon          = 0                               // determines weapon and flash model, etc
	this.legsAnim        = 0;                              // mask off ANIM_TOGGLEBIT
	this.torsoAnim       = 0;                              // mask off ANIM_TOGGLEBIT
};

// deep copy
EntityState.prototype.clone = function (es) {
	if (typeof(es) === 'undefined') {
		es = new EntityState();
	}

	es.number            = this.number;
	es.eType             = this.eType;
	es.eFlags            = this.eFlags;
	this.pos.clone(es.pos);
	this.apos.clone(es.apos);
	es.time              = this.time;
	es.time2             = this.time2;
	vec3.set(this.origin,  es.origin);
	vec3.set(this.origin2, es.origin2);
	vec3.set(this.angles,  es.angles);
	vec3.set(this.angles2, es.angles2);
	es.groundEntityNum   = this.groundEntityNum;
	es.modelIndex        = this.modelIndex;
	es.modelindex2       = this.modelIndex2;
	es.clientNum         = this.clientNum;
	es.frame             = this.frame;
	es.solid             = this.solid;
	es.event             = this.event;
	es.eventParm         = this.eventParm;
	es.weapon            = this.weapon;
	es.legsAnim          = this.legsAnim;
	es.torsoAnim         = this.torsoAnim;

	return es;
};

/**
 * BSP Defines
 */
var Lumps = {
	ENTITIES:     0,
	SHADERS:      1,
	PLANES:       2,
	NODES:        3,
	LEAFS:        4,
	LEAFSURFACES: 5,
	LEAFBRUSHES:  6,
	MODELS:       7,
	BRUSHES:      8,
	BRUSHSIDES:   9,
	DRAWVERTS:    10,
	DRAWINDEXES:  11,
	FOGS:         12,
	SURFACES:     13,
	LIGHTMAPS:    14,
	LIGHTGRID:    15,
	VISIBILITY:   16,
	NUM_LUMPS:    17
};

var MapSurfaceType = {
	BAD:           0,
	PLANAR:        1,
	PATCH:         2,
	TRIANGLE_SOUP: 3,
	FLARE:         4
};

var SurfaceFlags = {
	NODAMAGE:    0x1,                            // never give falling damage
	SLICK:       0x2,                            // effects game physics
	SKY:         0x4,                            // lighting from environment map
	LADDER:      0x8,
	NOIMPACT:    0x10,                           // don't make missile explosions
	NOMARKS:     0x20,                           // don't leave missile marks
	FLESH:       0x40,                           // make flesh sounds and effects
	NODRAW:      0x80,                           // don't generate a drawsurface at all
	HINT:        0x100,                          // make a primary bsp splitter
	SKIP:        0x200,                          // completely ignore, allowing non-closed brushes
	NOLIGHTMAP:  0x400,                          // surface doesn't need a lightmap
	POINTLIGHT:  0x800,                          // generate lighting info at vertexes
	METALSTEPS:  0x1000,                         // clanking footsteps
	NOSTEPS:     0x2000,                         // no footstep sounds
	NONSOLID:    0x4000,                         // don't collide against curves with this set
	LIGHTFILTER: 0x8000,                         // act as a light filter during q3map -light
	ALPHASHADOW: 0x10000,                        // do per-pixel light shadow casting in q3map
	NODLIGHT:    0x20000,                        // don't dlight even if solid (solid lava, skies)
	DUST:        0x40000                         // leave a dust trail when walking on this surface
};

var lumps_t = function () {
	this.fileofs  = 0;                           // int32
	this.filelen = 0;                           // int32
};

var dheader_t = function () {
	this.ident    = null;                        // byte * 4 (string)
	this.version  = 0;                           // int32
	this.lumps    = new Array(Lumps.NUM_LUMPS);  // lumps_t * Lumps.NUM_LUMPS

	for (var i = 0; i < Lumps.NUM_LUMPS; i++) {
		this.lumps[i] = new lumps_t();
	}
};

var dmodel_t = function () {
	this.mins         = [0, 0, 0];               // float32 * 3
	this.maxs         = [0, 0, 0];               // float32 * 3
	this.firstSurface = 0;                       // int32
	this.numSurfaces  = 0;                       // int32
	this.firstBrush   = 0;                       // int32
	this.numBrushes   = 0;                       // int32
};
dmodel_t.size = 40;

var dshader_t = function () {
	this.shaderName = null;                      // byte * MAX_QPATH (string)
	this.flags      = 0;                         // int32
	this.contents   = 0;                         // int32
};
dshader_t.size = 72;

var dplane_t = function () {
	this.normal = [0, 0, 0];                     // float32 * 3
	this.dist   = 0;                             // float32
};
dplane_t.size = 16;

var dnode_t = function () {
	this.planeNum    = 0;                        // int32
	this.childrenNum = [0, 0];                   // int32 * 2
	this.mins        = [0, 0, 0];                // int32 * 3
	this.maxs        = [0, 0, 0];                // int32 * 3
};
dnode_t.size = 36;

var dleaf_t = function () {
	this.cluster          = 0;                   // int32
	this.area             = 0;                   // int32
	this.mins             = [0, 0, 0];           // int32 * 3
	this.maxs             = [0, 0, 0];           // int32 * 3
	this.firstLeafSurface = 0;                   // int32
	this.numLeafSurfaces  = 0;                   // int32
	this.firstLeafBrush   = 0;                   // int32
	this.numLeafBrushes   = 0;                   // int32
};
dleaf_t.size = 48;

var dbrushside_t = function () {
	this.planeNum = 0;                           // int32
	this.shader   = 0;                           // int32
};
dbrushside_t.size = 8;

var dbrush_t = function () {
	this.side     = 0;                           // int32
	this.numsides = 0;                           // int32
	this.shader   = 0;                           // int32
};
dbrush_t.size = 12;

var dfog_t = function () {
	this.shader      = null;                     // byte * MAX_QPATH (string)
	this.brushNum    = 0;                        // int32
	this.visibleSide = 0;                        // int32
};
dfog_t.size = 72;

var drawVert_t = function () {
	this.pos      = [0, 0, 0];                   // float32 * 3
	this.texCoord = [0, 0];                      // float32 * 2
	this.lmCoord  = [0, 0];                      // float32 * 2
	this.normal   = [0, 0, 0];                   // float32 * 3
	this.color    = [0, 0, 0, 0];                // uint8 * 4
};
drawVert_t.size = 44;

var dsurface_t = function () {
	this.shaderNum     = 0;                      // int32
	this.fogNum        = 0;                      // int32
	this.surfaceType   = 0;                      // int32
	this.vertex        = 0;                      // int32
	this.vertCount     = 0;                      // int32
	this.meshVert      = 0;                      // int32
	this.meshVertCount = 0;                      // int32
	this.lightmapNum   = 0;                      // int32
	this.lmStart       = [0, 0];                 // int32 * 2
	this.lmSize        = [0, 0];                 // int32 * 2
	this.lmOrigin      = [0, 0, 0];              // float32 * 3
	this.lmVecs        = [                       // float32 * 9
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	this.patchWidth    = 0;                      // int32
	this.patchHeight   = 0;                      // int32
};
dsurface_t.size = 104;

function atob64(arr) {
	var limit = 1 << 16;
	var length = arr.length;
	var slice = arr.slice || arr.subarray;
	var str;

	if (length < limit) {
		str = String.fromCharCode.apply(String, arr);
	} else {
		var chunks = [];
		var i = 0;
		while (i < length) {
			chunks.push(String.fromCharCode.apply(String, slice.call(arr, i, i + limit)));
			i += limit;
		}
		str = chunks.join('');
	}

	return btoa(str);
}

return {
	BASE_FOLDER:           BASE_FOLDER,
	MAX_QPATH:             MAX_QPATH,
	CMD_BACKUP:            CMD_BACKUP,

	Err:                   Err,

	Cvar:                  Cvar,
	CvarFlags:             CvarFlags,

	MAX_DRAWSURFS:         MAX_DRAWSURFS,
	ENTITYNUM_BITS:        ENTITYNUM_BITS,
	MAX_ENTITIES:          MAX_ENTITIES,
	DrawSurface:           DrawSurface,
	RefDef:                RefDef,
	RefEntityType:         RefEntityType,
	RenderFx:              RenderFx,
	RefEntity:             RefEntity,
	ViewParms:             ViewParms,

	MAX_STATS:             MAX_STATS,
	MAX_PERSISTANT:        MAX_PERSISTANT,
	MAX_POWERUPS:          MAX_POWERUPS,
	MAX_WEAPONS:           MAX_WEAPONS,
	MAX_PS_EVENTS:         MAX_PS_EVENTS,
	PMOVEFRAMECOUNTBITS:   PMOVEFRAMECOUNTBITS,
	PlayerState:           PlayerState,
	TrajectoryType:        TrajectoryType,
	Trajectory:            Trajectory,
	Orientation:           Orientation,
	EntityState:           EntityState,

	SNAPFLAG_RATE_DELAYED: SNAPFLAG_RATE_DELAYED,
	SNAPFLAG_NOT_ACTIVE:   SNAPFLAG_NOT_ACTIVE,
	SNAPFLAG_SERVERCOUNT:  SNAPFLAG_SERVERCOUNT,
	MAX_CLIENTS:           MAX_CLIENTS,
	MAX_GENTITIES:         MAX_GENTITIES,
	MAX_MODELS:            MAX_MODELS,
	MAX_SOUNDS:            MAX_SOUNDS,
	ENTITYNUM_NONE:        ENTITYNUM_NONE,
	ENTITYNUM_WORLD:       ENTITYNUM_WORLD,
	ENTITYNUM_MAX_NORMAL:  ENTITYNUM_MAX_NORMAL,
	MOVE_RUN:              MOVE_RUN,
	NetAdrType:            NetAdrType,
	NetSrc:                NetSrc,
	NetAdr:                NetAdr,
	Buttons:               Buttons,
	UserCmd:               UserCmd,

	Lumps:                 Lumps,
	MapSurfaceType:        MapSurfaceType,
	SurfaceFlags:          SurfaceFlags,
	lumps_t:               lumps_t,
	dheader_t:             dheader_t,
	dmodel_t:              dmodel_t,
	dshader_t:             dshader_t,
	dplane_t:              dplane_t,
	dnode_t:               dnode_t,
	dleaf_t:               dleaf_t,
	dbrushside_t:          dbrushside_t,
	dbrush_t:              dbrush_t,
	dfog_t:                dfog_t,
	drawVert_t:            drawVert_t,
	dsurface_t:            dsurface_t,

	atob64:                atob64
};

});