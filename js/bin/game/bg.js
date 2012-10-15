define('game/bg',
['glmatrix'],
function (glmatrix) {
	/**********************************************************
 * Stateless functions and data structures
 * included by each module.
 **********************************************************/

var Q3W_BASE_FOLDER = 'baseq3';

/**********************************************************
 * Communicated across the network
 **********************************************************/
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

var MAX_CLIENTS            = 64;                           // absolute limit
var MAX_LOCATIONS          = 64;
var MAX_GENTITIES          = 1024;

var ENTITYNUM_NONE         = MAX_GENTITIES-1;
var ENTITYNUM_WORLD        = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL   = MAX_GENTITIES-2;

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

/**********************************************************
 * A user command is what the client sends to the server
 * each frame to let it know its status.
 **********************************************************/
var UserCmd = function () {
	this.serverTime  = 0;
	this.angles      = [0, 0, 0];
	this.forwardmove = 0;
	this.rightmove   = 0;
	this.upmove      = 0;
};

/**********************************************************
 * Player state
 **********************************************************/
var PS_PMOVEFRAMECOUNTBITS = 6;

var PlayerState = function () {
	this.clientNum        = 0;                             // ranges from 0 to MAX_CLIENTS-1
	this.commandTime      = 0;                             // cmd->serverTime of last executed command
	this.pm_type          = 0;
	this.pm_flags         = 0;                             // ducked, jump_held, etc
	this.origin           = [0, 0, 0];
	this.velocity         = [0, 0, 0];
	this.viewangles       = [0, 0, 0];
	this.speed            = 0;
	this.gravity          = 0;
	this.groundEntityNum  = ENTITYNUM_NONE;                // ENTITYNUM_NONE = in air
	this.jumppad_ent      = 0;                             // jumppad entity hit this frame
	this.jumppad_frame    = 0;
	this.pmove_framecount = 0;
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
	vec3.set(this.origin,     ps.origin);
	vec3.set(this.velocity,   ps.velocity);
	vec3.set(this.viewangles, ps.viewangles);
	ps.speed                = this.speed;
	ps.gravity              = this.gravity;
	ps.groundEntityNum      = this.groundEntityNum;
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
		tr = new Trajectory();
	}

	tr.trType = this.trType;
	tr.trTime = this.trTime;
	tr.trDuration = this.trDuration;
	vec3.set(this.trBase, tr.trBase);
	vec3.set(this.trDelta, tr.trDelta);

	return tr;
}

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
	this.modelindex      = 0;
	this.modelindex2     = 0;
	this.clientNum       = 0;                              // 0 to (MAX_CLIENTS - 1), for players and corpses
	this.frame           = 0;
	this.solid           = 0;                              // for client side prediction, trap_linkentity sets this properly
	this.event           = 0;                              // impulse events -- muzzle flashes, footsteps, etc
	this.eventParm       = 0;
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
	es.modelindex        = this.modelindex;
	es.modelindex2       = this.modelindex2;
	es.clientNum         = this.clientNum;
	es.frame             = this.frame;
	es.solid             = this.solid;
	es.event             = this.event;
	es.eventParm         = this.eventParm;

	return es;
};

/**********************************************************
 * Angles
 **********************************************************/
var PITCH = 0; // up / down
var YAW   = 1; // left / right
var ROLL  = 2; // fall over

function LerpAngle(from, to, frac) {
	if (to - from > 180) {
		to -= 360;
	}
	if (to - from < -180) {
		to += 360;
	}

	return from + frac * (to - from);
}

function AnglesToVectors(angles, forward, right, up) {
	var angle;
	var sr, sp, sy, cr, cp, cy;

	angle = angles[YAW] * (Math.PI*2 / 360);
	sy = Math.sin(angle);
	cy = Math.cos(angle);
	angle = angles[PITCH] * (Math.PI*2 / 360);
	sp = Math.sin(angle);
	cp = Math.cos(angle);
	angle = angles[ROLL] * (Math.PI*2 / 360);
	sr = Math.sin(angle);
	cr = Math.cos(angle);

	forward[0] = cp*cy;
	forward[1] = cp*sy;
	forward[2] = -sp;

	right[0] = (-1*sr*sp*cy+-1*cr*-sy);
	right[1] = (-1*sr*sp*sy+-1*cr*cy);
	right[2] = -1*sr*cp;

	up[0] = (cr*sp*cy+-sr*-sy);
	up[1] = (cr*sp*sy+-sr*cy);
	up[2] = cr*cp;
}

function AnglesToAxis(angles, axis) {
	var right = [0, 0, 0];

	// angle vectors returns "right" instead of "y axis"
	AnglesToVectors(angles, axis[0], right, axis[2]);
	vec3.subtract([0, 0, 0], right, axis[1]);
}

/**********************************************************
 * Planes
 **********************************************************/
var PLANE_X         = 0;
var PLANE_Y         = 1;
var PLANE_Z         = 2;
var PLANE_NON_AXIAL = 3;

var Plane = function () {
	this.normal   = vec3.create();
	this.dist     = 0;
	this.type     = 0;
	this.signbits = 0;
};

function PlaneTypeForNormal(x) {
	return x[0] == 1.0 ? PLANE_X : (x[1] == 1.0 ? PLANE_Y : (x[2] == 1.0 ? PLANE_Z : PLANE_NON_AXIAL))
}

function GetPlaneSignbits(p) {
	var bits = 0;

	for (var i = 0; i < 3; i++) {
		if (p.normal[i] < 0) {
			bits |= 1 << i;
		}
	}

	return bits;
}

// Returns 1, 2, or 1 + 2.
function BoxOnPlaneSide(mins, maxs, p) {
	// fast axial cases
	if (p.type < PLANE_NON_AXIAL) {
		if (p.dist <= mins[p.type]) {
			return 1;
		} else if (p.dist >= maxs[p.type]) {
			return 2;
		}
		return 3;
	}

	// general case
	var dist = [0, 0];
	
	if (p.signbits < 8) {                       // >= 8: default case is original code (dist[0]=dist[1]=0)
		for (var i = 0; i < 3; i++) {
			var b = (p.signbits >> i) & 1;
			dist[b] += p.normal[i]*maxs[i];
			dist[b^1] += p.normal[i]*mins[i];
		}
	}

	var sides = 0;
	if (dist[0] >= p.dist) {
		sides = 1;
	}
	if (dist[1] < p.dist) {
		sides |= 2;
	}

	return sides;
}


/**********************************************************
 * Radix sort 32 bit ints into 8 bit buckets.
 * http://stackoverflow.com/questions/8082425/fastest-way-to-sort-32bit-signed-integer-arrays-in-javascript
 **********************************************************/
var _radixSort_0 = [
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
];

function RadixSort(arr, prop, len) {
	var cpy = new Array(len);
	var c4 = [].concat(_radixSort_0); 
	var c3 = [].concat(_radixSort_0); 
	var c2 = [].concat(_radixSort_0);
	var c1 = [].concat(_radixSort_0); 
	var o4 = 0; var k4;
	var o3 = 0; var k3;
	var o2 = 0; var k2;
	var o1 = 0; var k1;
	var x;
	for (x = 0; x < len; x++) {
		k4 = arr[x][prop] & 0xFF;
		k3 = (arr[x][prop] >> 8) & 0xFF;
		k2 = (arr[x][prop] >> 16) & 0xFF;
		k1 = (arr[x][prop] >> 24) & 0xFF ^ 0x80;
		c4[k4]++;
		c3[k3]++;
		c2[k2]++;
		c1[k1]++;
	}
	for (x = 0; x < 256; x++) {
		k4 = o4 + c4[x];
		k3 = o3 + c3[x];
		k2 = o2 + c2[x];
		k1 = o1 + c1[x];
		c4[x] = o4;
		c3[x] = o3;
		c2[x] = o2;
		c1[x] = o1;
		o4 = k4;
		o3 = k3;
		o2 = k2;
		o1 = k1;
	}
	for (x = 0; x < len; x++) {
		k4 = arr[x][prop] & 0xFF;
		cpy[c4[k4]] = arr[x];
		c4[k4]++;
	}
	for (x = 0; x < len; x++) {
		k3 = (cpy[x][prop] >> 8) & 0xFF;
		arr[c3[k3]] = cpy[x];
		c3[k3]++;
	}
	for (x = 0; x < len; x++) {
		k2 = (arr[x][prop] >> 16) & 0xFF;
		cpy[c2[k2]] = arr[x];
		c2[k2]++;
	}
	for (x = 0; x < len; x++) {
		k1 = (cpy[x][prop] >> 24) & 0xFF ^ 0x80;
		arr[c1[k1]] = cpy[x];
		c1[k1]++;
	}

	return arr;
}

/**********************************************************
 * Surface flags
 **********************************************************/
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

/**********************************************************
 * Q3 BSP Defines
 **********************************************************/
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

var MAX_QPATH = 64;

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

var MapSurfaceType = {
	BAD:           0,
	PLANAR:        1,
	PATCH:         2,
	TRIANGLE_SOUP: 3,
	FLARE:         4
};

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

/**********************************************************
 * Misc
 **********************************************************/
function ClampChar(i) {
	if (i < -128) {
		return -128;
	}
	if (i > 127) {
		return 127;
	}
	return i;
}

var RenderContext = function () {
	this.gl     = null;
	this.handle = null;
};
	var DEFAULT_GRAVITY = 800;
var JUMP_VELOCITY = 270;
var MAX_CLIP_PLANES = 5;
var MIN_WALK_NORMAL = 0.7;
var STEPSIZE = 18;
var OVERCLIP = 1.001;
var DEFAULT_VIEWHEIGHT = 26;
var ITEM_RADIUS = 15;                            // item sizes are needed for client side pickup detection

/**********************************************************
 * Game item descriptions
 **********************************************************/
var ItemType = {
	BAD:                0,
	WEAPON:             1,                       // EFX: rotate + upscale + minlight
	AMMO:               2,                       // EFX: rotate
	ARMOR:              3,                       // EFX: rotate + minlight
	HEALTH:             4,                       // EFX: static external sphere + rotating internal
	POWERUP:            5,                       // instant on, timer based
	                                             // EFX: rotate + external ring that rotates
	HOLDABLE:           6,                       // single use, holdable item
	                                             // EFX: rotate + bob
	PERSISTANT_POWERUP: 7,
	TEAM:               8
};

var GameItemDesc = function (classname, giType) {
	this.classname = classname;                  // spawning name
	/*char		*pickup_sound;
	char		*world_model[MAX_ITEM_MODELS];

	char		*icon;
	char		*pickup_name;	// for printing on pickup

	int			quantity;		// for ammo how much, or duration of powerup*/
	this.giType    = giType;                     // IT_* flags
	/*int			giTag;

	char		*precaches;		// string of all models and images this item will use
	char		*sounds;		// string of all sounds this item will use*/
};

/**********************************************************
 * Entity state related
 **********************************************************/
// entityState_t->eType
var EntityType = {
	GENERAL:          0,
	PLAYER:           1,
	ITEM:             2,
	MISSILE:          3,
	MOVER:            4,
	BEAM:             5,
	PORTAL:           6,
	SPEAKER:          7,
	PUSH_TRIGGER:     8,
	TELEPORT_TRIGGER: 9,
	INVISIBLE:        10,
	GRAPPLE:          11,                        // grapple hooked on wall
	TEAM:             12,
	EVENTS:           13                         // any of the EV_* events can be added freestanding
	                                             // by setting eType to ET_EVENTS + eventNum
	                                             // this avoids having to set eFlags and eventNum
};

// entityState_t->eFlags
var EntityFlags = {
	DEAD:             0x00000001,                // don't draw a foe marker over players with EF_DEAD
	TELEPORT_BIT:     0x00000004,                // toggled every time the origin abruptly changes
	AWARD_EXCELLENT:  0x00000008,                // draw an excellent sprite
	PLAYER_EVENT:     0x00000010,
	BOUNCE:           0x00000010,                // for missiles
	BOUNCE_HALF:      0x00000020,                // for missiles
	AWARD_GAUNTLET:   0x00000040,                // draw a gauntlet sprite
	NODRAW:           0x00000080,                // may have an event, but no model (unspawned items)
	FIRING:           0x00000100,                // for lightning gun
	KAMIKAZE:         0x00000200,
	MOVER_STOP:       0x00000400,                // will push otherwise
	AWARD_CAP:        0x00000800,                // draw the capture sprite
	TALK:             0x00001000,                // draw a talk balloon
	CONNECTION:       0x00002000,                // draw a connection trouble sprite
	VOTED:            0x00004000,                // already cast a vote
	AWARD_IMPRESSIVE: 0x00008000,                // draw an impressive sprite
	AWARD_DEFEND:     0x00010000,                // draw a defend sprite
	AWARD_ASSIST:     0x00020000,                // draw an assist sprite
	AWARD_DENIED:     0x00040000,                // denied
	TEAMVOTED:        0x00080000                 // already cast a team vote
};

/**********************************************************
 * Pmove related
 **********************************************************/
var ContentTypes = {
	SOLID:         1,                            // an eye is never valid in a solid
	LAVA:          8,
	SLIME:         16,
	WATER:         32,
	FOG:           64,

	NOTTEAM1:      0x0080,
	NOTTEAM2:      0x0100,
	NOBOTCLIP:     0x0200,

	AREAPORTAL:    0x8000,

	PLAYERCLIP:    0x10000,
	MONSTERCLIP:   0x20000,
	TELEPORTER:    0x40000,
	JUMPPAD:       0x80000,
	CLUSTERPORTAL: 0x100000,
	DONOTENTER:    0x200000,
	BOTCLIP:       0x400000,
	MOVER:         0x800000,

	ORIGIN:        0x1000000,                    // removed before bsping an entity

	BODY:          0x2000000,                    // should never be on a brush, only in game
	CORPSE:        0x4000000,
	DETAIL:        0x8000000,                    // brushes not used for the bsp
	STRUCTURAL:    0x10000000,                   // brushes used for the bsp
	TRANSLUCENT:   0x20000000,                   // don't consume surface fragments inside
	TRIGGER:       0x40000000,
	NODROP:        0x80000000                    // don't leave bodies or items (death fog, lava)
};

var ContentMasks = {
	ALL:         -1,
	SOLID:       ContentTypes.SOLID,
	PLAYERSOLID: ContentTypes.SOLID | ContentTypes.PLAYERCLIP  | ContentTypes.BODY,
	DEADSOLID:   ContentTypes.SOLID | ContentTypes.PLAYERCLIP,
	WATER:       ContentTypes.WATER | ContentTypes.LAVA        | ContentTypes.SLIME,
	OPAQUE:      ContentTypes.SOLID | ContentTypes.SLIME       | ContentTypes.LAVA,
	SHOT:        ContentTypes.SOLID | ContentTypes.BODY       | ContentTypes.CORPSE,
};

var PmoveType = {
	NORMAL:       0,                             // can accelerate and turn
	NOCLIP:       1,                             // noclip movement
	SPECTATOR:    2,                             // still run into walls
	DEAD:         3,                             // no acceleration or turning, but free falling
	FREEZE:       4,                             // stuck in place with no control
	INTERMISSION: 5                              // no movement or status bar
};

var PmoveFlags = {
	DUCKED:         1,
	JUMP_HELD:      2,
	BACKWARDS_JUMP: 8,                           // go into backwards land
	BACKWARDS_RUN:  16,                          // coast down to backwards run
	TIME_LAND:      32,                          // pm_time is time before rejump
	TIME_KNOCKBACK: 64,                          // pm_time is an air-accelerate only time
	TIME_WATERJUMP: 256,                         // pm_time is waterjump
	RESPAWNED:      512,                         // clear after attack and jump buttons come up
	USE_ITEM_HELD:  1024,
	GRAPPLE_PULL:   2048,                        // pull towards grapple location
	FOLLOW:         4096,                        // spectate following another player
	SCOREBOARD:     8192,                        // spectate as a scoreboard
	INVULEXPAND:    16384                        // invulnerability sphere set to full size
};

var PmoveInfo = function () {
	this.ps = null;
	this.cmd = null;
	this.frameTime = 0;
	this.mins = [0, 0, 0];
	this.maxs = [0, 0, 0];
	//this.tracemask = 0;                          // collide against these surfaces
	//this.framecount = 0;

	// results (out)
	//this.numtouch = 0;
	//this.touchents = null; //[MAXTOUCH];

	// callbacks to test the world
	// these will be different functions during game and cgame
	this.trace = null;
};
	// Static item descriptions.
var itemList = {
	'item_armor_shard': new GameItemDesc('item_armor_shard', ItemType.ARMOR)
};

/**
 * PlayerStateToEntityState
 *
 * This is done after each set of usercmd_t on the server,
 * and after local prediction on the client
 */
function PlayerStateToEntityState(ps, state) {
	/*if (ps.pm_type === PM_INTERMISSION || ps->pm_type === PM_SPECTATOR) {
		state.eType = EntityType.INVISIBLE;
	} else if ( ps.stats[STAT_HEALTH] <= GIB_HEALTH ) {
		state.eType = EntityType.INVISIBLE;
	} else {
		state.eType = EntityType.PLAYER;
	}*/

	state.number = ps.clientNum;

	state.pos.trType = TrajectoryType.INTERPOLATE;
	vec3.set(ps.origin, state.pos.trBase);
	vec3.set(ps.velocity, state.pos.trDelta);

	state.apos.trType = TrajectoryType.INTERPOLATE;
	vec3.set(ps.viewangles, state.apos.trBase);

	state.angles2[YAW] = ps.movementDir;
	//s.legsAnim = ps->legsAnim;
	//s.torsoAnim = ps->torsoAnim;
	state.clientNum = ps.clientNum;                  // ET_PLAYER looks here instead of at number
	                                             // so corpses can also reference the proper config
	state.eFlags = ps.eFlags;
	/*if ( ps->stats[STAT_HEALTH] <= 0 ) {
		s->eFlags |= EntityFlags.DEAD;
	} else {
		s->eFlags &= ~EntityFlags.DEAD;
	}*/

	/*if ( ps->externalEvent ) {
		s->event = ps->externalEvent;
		s->eventParm = ps->externalEventParm;
	} else if ( ps->entityEventSequence < ps->eventSequence ) {
		int		seq;

		if ( ps->entityEventSequence < ps->eventSequence - MAX_PS_EVENTS) {
			ps->entityEventSequence = ps->eventSequence - MAX_PS_EVENTS;
		}
		seq = ps->entityEventSequence & (MAX_PS_EVENTS-1);
		s->event = ps->events[ seq ] | ( ( ps->entityEventSequence & 3 ) << 8 );
		s->eventParm = ps->eventParms[ seq ];
		ps->entityEventSequence++;
	}*/

	//s->weapon = ps->weapon;
	state.groundEntityNum = ps.groundEntityNum;

	/*s->powerups = 0;
	for ( i = 0 ; i < MAX_POWERUPS ; i++ ) {
		if ( ps->powerups[ i ] ) {
			s->powerups |= 1 << i;
		}
	}

	s->loopSound = ps->loopSound;
	s->generic1 = ps->generic1;*/
}

function EvaluateTrajectory(tr, atTime, result) {
	var deltaTime;
	var phase;

	switch (tr.trType) {
		case TrajectoryType.STATIONARY:
		case TrajectoryType.INTERPOLATE:
			vec3.set(tr.trBase, result);
			break;

		case TrajectoryType.LINEAR:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime), result);
			break;

		case TrajectoryType.SINE:
			deltaTime = (atTime - tr.trTime) / tr.trDuration;
			phase = Math.sin(deltaTime * Math.PI * 2);
			vec3.add(tr.trBase, phase, tr.trDelta, result);
			break;

		case TrajectoryType.LINEAR_STOP:
			if (atTime > tr.trTime + tr.trDuration) {
				atTime = tr.trTime + tr.trDuration;
			}
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			if (deltaTime < 0) {
				deltaTime = 0;
			}
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime), result);
			break;
		case TrajectoryType.GRAVITY:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime), result);
			result[2] -= 0.5 * DEFAULT_GRAVITY * deltaTime * deltaTime;  // FIXME: local gravity...
			break;
		default:
			throw new Error('EvaluateTrajectory: unknown trType: ' + tr.trType);
			break;
	}
}

function TouchJumpPad(ps, jumppad) {
	// if we didn't hit this same jumppad the previous frame
	// then don't play the event sound again if we are in a fat trigger
	/*if (ps.jumppad_ent !== jumppad.number ) {		
		vectoangles( jumppad->origin2, angles);
		p = fabs( AngleNormalize180( angles[PITCH] ) );
		if( p < 45 ) {
			effectNum = 0;
		} else {
			effectNum = 1;
		}
		BG_AddPredictableEventToPlayerstate( EV_JUMP_PAD, effectNum, ps );
	}*/
	// remember hitting this jumppad this frame
	ps.jumppad_ent = jumppad.number;
	ps.jumppad_frame = ps.pmove_framecount;

	// give the player the velocity from the jumppad
	vec3.set(jumppad.origin2, ps.velocity);
}
	var q3movement_stopspeed = 100.0;
var q3movement_duckScale = 0.25;
var q3movement_jumpvelocity = 50;

var q3movement_accelerate = 10.0;
var q3movement_airaccelerate = 1.0;
var q3movement_flyaccelerate = 8.0;

var q3movement_friction = 6.0;
var q3movement_flightfriction = 3.0;

var q3movement_playerRadius = 10.0;

// TODO Move these into a PmoveLocals structure?
var forward = [0, 0, 0], right = [0, 0, 0], up = [0, 0, 0];
var groundTrace;
var groundPlane;
var walking;

/*
============
PM_CmdScale

Returns the scale factor to apply to cmd movements
This allows the clients to use axial -127 to 127 values for all directions
without getting a sqrt(2) distortion in speed.
============
*/
function CmdScale(cmd, speed) {
	var max = Math.abs(cmd.forwardmove);
	if (Math.abs(cmd.rightmove) > max) {
		max = Math.abs(cmd.rightmove);
	}
	if (Math.abs(cmd.upmove) > max) {
		max = Math.abs(cmd.upmove);
	}
	if (!max) {
		return 0;
	}

	var total = Math.sqrt(cmd.forwardmove * cmd.forwardmove + cmd.rightmove * cmd.rightmove + cmd.upmove * cmd.upmove);
	var scale = speed * max / (127.0 * total);

	return scale;
}

function Friction(pm, flying) {
	var ps = pm.ps;

	var vec = vec3.create(ps.velocity);
	if (walking) {
		vec[2] = 0;	// ignore slope movement
	}

	var speed = vec3.length(vec);
	if (speed < 1) {
		ps.velocity[0] = 0;
		ps.velocity[1] = 0; // allow sinking underwater
		// FIXME: still have z friction underwater?
		return;
	}

	var drop = 0;
	if (walking) {
		var control = speed < q3movement_stopspeed ? q3movement_stopspeed : speed;
		drop += control * q3movement_friction * pm.frameTime;
	} else if (flying) {
		drop += speed * q3movement_flightfriction * pm.frameTime;
	}

	var newspeed = speed - drop;
	if (newspeed < 0) {
		newspeed = 0;
	}
	newspeed /= speed;

	vec3.scale(ps.velocity, newspeed);
}

function ClipVelocity(vel, normal, overbounce) {
	var backoff = vec3.dot(vel, normal);

	if ( backoff < 0 ) {
		backoff *= overbounce;
	} else {
		backoff /= overbounce;
	}

	var change = vec3.scale(normal, backoff, [0,0,0]);
	return vec3.subtract(vel, change, [0, 0, 0]);
}

function Accelerate(pm, wishdir, wishspeed, accel) {
	var ps = pm.ps;
	var currentspeed = vec3.dot(ps.velocity, wishdir);
	var addspeed = wishspeed - currentspeed;

	if (addspeed <= 0) {
		return;
	}

	var accelspeed = accel * pm.frameTime * wishspeed;

	if (accelspeed > addspeed) {
		accelspeed = addspeed;
	}

	vec3.add(ps.velocity, vec3.scale(wishdir, accelspeed, [0,0,0]));
}

function CheckDuck(pm) {
	pm.mins[0] = -15;
	pm.mins[1] = -15;
	pm.mins[2] = -24;

	pm.maxs[0] = 15;
	pm.maxs[1] = 15;
	pm.maxs[2] = 32;

	pm.ps.viewheight = DEFAULT_VIEWHEIGHT;
}

function CheckJump(pm) {
	var ps = pm.ps;

	if (pm.cmd.upmove < 10) {
		// not holding jump
		return false;
	}

	// must wait for jump to be released
	if (ps.pm_flags & PmoveFlags.JUMP_HELD) {
		// clear upmove so cmdscale doesn't lower running speed
		pm.cmd.upmove = 0;
		return false;
	}

	groundPlane = false; // jumping away
	walking = false;
	ps.pm_flags |= PmoveFlags.JUMP_HELD;

	ps.groundEntityNum = ENTITYNUM_NONE;
	ps.velocity[2] = JUMP_VELOCITY;
	/*PM_AddEvent( EV_JUMP );

	if ( pm->cmd.forwardmove >= 0 ) {
		PM_ForceLegsAnim( LEGS_JUMP );
		pm->ps->pm_flags &= ~PmoveFlags.BACKWARDS_JUMP;
	} else {
		PM_ForceLegsAnim( LEGS_JUMPB );
		pm->ps->pm_flags |= PmoveFlags.BACKWARDS_JUMP;
	}*/

	return true;
}

function GroundTrace(pm) {
	var ps = pm.ps;
	var point = [ps.origin[0], ps.origin[1], ps.origin[2] - 0.25];
	var trace = groundTrace = pm.trace(ps.origin, point, pm.mins, pm.maxs, pm.tracemask);

	// do something corrective if the trace starts in a solid...
	if (trace.allSolid) {
		if (!CorrectAllSolid(pm, trace)) {
			return;
		}
	}

	// if the trace didn't hit anything, we are in free fall
	if (trace.fraction == 1.0) {
		GroundTraceMissed(pm);
		return;
	}

	// check if getting thrown off the ground
	if (ps.velocity[2] > 0 && vec3.dot(ps.velocity, trace.plane.normal) > 10 ) {
		/*// go into jump animation
		if ( pm->cmd.forwardmove >= 0 ) {
			PM_ForceLegsAnim( LEGS_JUMP );
			pm->ps->pm_flags &= ~PmoveFlags.BACKWARDS_JUMP;
		} else {
			PM_ForceLegsAnim( LEGS_JUMPB );
			pm->ps->pm_flags |= PmoveFlags.BACKWARDS_JUMP;
		}*/

		ps.groundEntityNum = ENTITYNUM_NONE;
		groundPlane = false;
		walking = false;
		return;
	}

	if (trace.plane.normal[2] < MIN_WALK_NORMAL) {
		ps.groundEntityNum = ENTITYNUM_NONE;
		groundPlane = true;
		walking = false;
		return;
	}

	groundPlane = true;
	walking = true;
}

function CorrectAllSolid(pm, trace) {
	var ps = pm.ps;
	var point = [0, 0, 0];
	var trace;

	// Jitter around.
	for (var i = -1; i <= 1; i++) {
		for (var j = -1; j <= 1; j++) {
			for (var k = -1; k <= 1; k++) {
				vec3.set(ps.origin, point);
				point[0] += i;
				point[1] += j;
				point[2] += k;
				trace = pm.trace(point, point, pm.mins, pm.maxs, pm.tracemask);

				if (!trace.allSolid) {
					point[0] = ps.origin[0];
					point[1] = ps.origin[1];
					point[2] = ps.origin[2] - 0.25;

					groundTrace = pm.trace(ps.origin, point, pm.mins, pm.maxs, /*pm->ps->clientNum,*/ pm.tracemask)
					return true;
				}
			}
		}
	}

	ps.groundEntityNum = ENTITYNUM_NONE;
	groundPlane = false;
	walking = false;

	return false;
}


function GroundTraceMissed(pm) {
	pm.ps.groundEntityNum = ENTITYNUM_NONE;
	groundPlane = false;
	walking = false;
}

function SlideMove(pm, gravity) {
	var ps = pm.ps;
	var endVelocity = [0,0,0];
	var time_left = pm.frameTime;
	var planes = [];
	var numbumps = 4;
	var end = [0, 0, 0];

	if (gravity) {
		vec3.set(ps.velocity, endVelocity);
		endVelocity[2] -= ps.gravity * time_left;
		ps.velocity[2] = (ps.velocity[2] + endVelocity[2]) * 0.5;

		if (groundPlane) {
			// slide along the ground plane
			ps.velocity = ClipVelocity(ps.velocity, groundTrace.plane.normal, OVERCLIP);
		}
	}

	// never turn against the ground plane
	if (groundPlane) {
		planes.push(vec3.set(groundTrace.plane.normal, [0,0,0]));
	}

	// never turn against original velocity
	planes.push(vec3.normalize(ps.velocity, [0,0,0]));

	for (var bumpcount = 0; bumpcount < numbumps; bumpcount++) {
		// calculate position we are trying to move to
		vec3.add(ps.origin, vec3.scale(ps.velocity, time_left, [0,0,0]), end);

		// see if we can make it there
		var trace = pm.trace(ps.origin, end, pm.mins, pm.maxs, pm.tracemask);

		if (trace.allSolid) {
			// entity is completely trapped in another solid
			ps.velocity[2] = 0; // don't build up falling damage, but allow sideways acceleration
			return true;
		}

		if (trace.fraction > 0) {
			// actually covered some distance
			vec3.set(trace.endPos, ps.origin);
		}

		if (trace.fraction == 1) {
			 break; // moved the entire distance
		}

		// save entity for contact
		//PM_AddTouchEnt( trace.entityNum );

		time_left -= time_left * trace.fraction;

		if (planes.length >= MAX_CLIP_PLANES) {
			// this shouldn't really happen
			ps.velocity = [0, 0, 0];
			return true;
		}

		//
		// if this is the same plane we hit before, nudge velocity
		// out along it, which fixes some epsilon issues with
		// non-axial planes
		//
		for (var i = 0; i < planes.length; i++) {
			if (vec3.dot(trace.plane.normal, planes[i]) > 0.99) {
				vec3.add(ps.velocity, trace.plane.normal);
				break;
			}
		}
		if (i < planes.length) {
			continue;
		}
		planes.push(vec3.set(trace.plane.normal, [0,0,0]));

		//
		// modify velocity so it parallels all of the clip planes
		//

		// find a plane that it enters
		for(var i = 0; i < planes.length; ++i) {
			var into = vec3.dot(ps.velocity, planes[i]);
			if (into >= 0.1) {
				continue; // move doesn't interact with the plane
			}

			// slide along the plane
			var clipVelocity = ClipVelocity(ps.velocity, planes[i], OVERCLIP);
			var endClipVelocity = ClipVelocity(endVelocity, planes[i], OVERCLIP);

			// see if there is a second plane that the new move enters
			for (var j = 0; j < planes.length; j++) {
				if (j == i) {
					continue;
				}
				if (vec3.dot(clipVelocity, planes[j]) >= 0.1 ) {
					continue; // move doesn't interact with the plane
				}

				// try clipping the move to the plane
				clipVelocity = ClipVelocity(clipVelocity, planes[j], OVERCLIP);
				endClipVelocity = ClipVelocity(endClipVelocity, planes[j], OVERCLIP);

				// see if it goes back into the first clip plane
				if (vec3.dot(clipVelocity, planes[i]) >= 0) {
					continue;
				}

				// slide the original velocity along the crease
				var dir = vec3.cross(planes[i], planes[j], [0,0,0]);
				vec3.normalize(dir);
				var d = vec3.dot(dir, ps.velocity);
				vec3.scale(dir, d, clipVelocity);

				vec3.cross(planes[i], planes[j], dir);
				vec3.normalize(dir);
				d = vec3.dot(dir, endVelocity);
				vec3.scale(dir, d, endClipVelocity);

				// see if there is a third plane the the new move enters
				for (var k = 0; k < planes.length; k++) {
					if ( k == i || k == j ) {
						continue;
					}
					if (vec3.dot(clipVelocity, planes[k]) >= 0.1) {
						continue; // move doesn't interact with the plane
					}

					// stop dead at a tripple plane interaction
					ps.velocity = [0, 0, 0];
					return true;
				}
			}

			// if we have fixed all interactions, try another move
			vec3.set(clipVelocity, ps.velocity);
			vec3.set(endClipVelocity, endVelocity);
			break;
		}
	}

	if (gravity) {
		vec3.set(endVelocity, ps.velocity);
	}

	return bumpcount === 0;
}

function StepSlideMove(pm, gravity) {
	var ps = pm.ps;

	// Make sure these are stored BEFORE the initial SlideMove.
	var start_o = vec3.create(ps.origin);
	var start_v = vec3.create(ps.velocity);

	// we got exactly where we wanted to go first try
	if (SlideMove(pm, gravity)) {
		return;
	}
	
	var down = vec3.create(start_o);
	down[2] -= STEPSIZE;
	var trace = pm.trace(start_o, down, pm.mins, pm.maxs, pm.tracemask);
	var up = [0, 0, 1];

	// never step up when you still have up velocity
	if (ps.velocity[2] > 0 && (trace.fraction === 1.0 || vec3.dot(trace.plane.normal, up) < 0.7)) {
		return;
	}

	vec3.set(start_o, up);
	up[2] += STEPSIZE;

	// test the player position if they were a stepheight higher
	trace = pm.trace(start_o, up, pm.mins, pm.maxs, pm.tracemask);
	if (trace.allSolid) {
		return; // can't step up
	}

	var stepSize = trace.endPos[2] - start_o[2];
	// try slidemove from this position
	vec3.set(trace.endPos, ps.origin);
	vec3.set(start_v, ps.velocity);
	SlideMove(pm, gravity);

	// push down the final amount
	vec3.set(ps.origin, down);
	down[2] -= stepSize;
	trace = pm.trace(ps.origin, down, pm.mins, pm.maxs, pm.tracemask);
	if (!trace.allSolid) {
		vec3.set(trace.endPos, ps.origin);
	}
	if (trace.fraction < 1.0) {
		ps.velocity = ClipVelocity(ps.velocity, trace.plane.normal, OVERCLIP);
	}

	/*// use the step move
	float	delta;

	delta = pm->ps->origin[2] - start_o[2];
	if ( delta > 2 ) {
		if ( delta < 7 ) {
			PM_AddEvent( EV_STEP_4 );
		} else if ( delta < 11 ) {
			PM_AddEvent( EV_STEP_8 );
		} else if ( delta < 15 ) {
			PM_AddEvent( EV_STEP_12 );
		} else {
			PM_AddEvent( EV_STEP_16 );
		}
	}*/
}

function FlyMove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	// normal slowdown
	Friction(pm, true);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = [0, 0, 0];
	for (i=0 ; i < 3; i++) {
		wishvel[i] = scale * forward[i]*cmd.forwardmove + scale * right[i]*cmd.rightmove;
	}
	wishvel[2] += cmd.upmove;
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, [0, 0, 0]);

	Accelerate(pm, wishdir, wishspeed, q3movement_flyaccelerate);
	StepSlideMove(pm, false);
}

function AirMove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	Friction(pm);

	// project moves down to flat plane
	forward[2] = 0;
	right[2] = 0;
	vec3.normalize(forward);
	vec3.normalize(right);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = [0, 0, 0];
	for (var i = 0 ; i < 2 ; i++) {
		wishvel[i] = forward[i]*cmd.forwardmove + right[i]*cmd.rightmove;
	}
	wishvel[2] = 0;
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, [0, 0, 0]);
	wishspeed *= scale;

	// not on ground, so little effect on velocity
	Accelerate(pm, wishdir, wishspeed, q3movement_airaccelerate);

	// we may have a ground plane that is very steep, even
	// though we don't have a groundentity
	// slide along the steep plane
	if (groundPlane ) {
		ClipVelocity(ps.velocity, groundTrace.plane.normal, ps.velocity, OVERCLIP);
	}

	StepSlideMove(pm, true);
}

function WalkMove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	if (CheckJump(pm)) {
		AirMove(pm);
		return;
	}

	Friction(pm);

	// project moves down to flat plane
	forward[2] = 0;
	right[2] = 0;

	// project the forward and right directions onto the ground plane
	forward = ClipVelocity(forward, groundTrace.plane.normal, OVERCLIP);
	right = ClipVelocity(right, groundTrace.plane.normal, OVERCLIP);	
	vec3.normalize(forward);
	vec3.normalize(right);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = [0, 0, 0];
	for (var i = 0 ; i < 3 ; i++ ) {
		wishvel[i] = forward[i]*cmd.forwardmove + right[i]*cmd.rightmove;
	}
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, [0, 0, 0]);
	wishspeed *= scale;

	Accelerate(pm, wishdir, wishspeed, q3movement_accelerate);

	var vel = vec3.length(ps.velocity);

	// slide along the ground plane
	ps.velocity = ClipVelocity(ps.velocity, groundTrace.plane.normal, OVERCLIP);

	// don't decrease velocity when going up or down a slope
	vec3.normalize(ps.velocity);
	vec3.scale(ps.velocity, vel);

	// don't do anything if standing still
	if (!ps.velocity[0] && !ps.velocity[1]) {
		return;
	}

	StepSlideMove(pm, false);
}

function UpdateViewAngles(ps, cmd) {
	for (var i = 0; i < 3; i++) {
		var temp = cmd.angles[i];// + ps->delta_angles[i];

		// TODO: Remove this from client code, enable here.
		/*if (i == PITCH) {
			// don't let the player look up or down more than 90 degrees
			if ( temp > 16000 ) {
				//ps->delta_angles[i] = 16000 - cmd->angles[i];
				temp = 16000;
			} else if ( temp < -16000 ) {
				//ps->delta_angles[i] = -16000 - cmd->angles[i];
				temp = -16000;
			}
		}*/

		ps.viewangles[i] = temp;
	}
}

function PmoveSingle(pm, msec) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	// Determine the time.
	if (msec < 1) {
		msec = 1;
	} else if (msec > 200) {
		msec = 200;
	}
	ps.commandTime = cmd.serverTime;
	pm.frameTime = msec * 0.001;

	// Update our view angles.
	UpdateViewAngles(ps, cmd);
	AnglesToVectors(ps.viewangles, forward, right, up);

	if (pm.cmd.upmove < 10) {
		// not holding jump
		ps.pm_flags &= ~PmoveFlags.JUMP_HELD;
	}

	CheckDuck(pm);
	GroundTrace(pm);

	//FlyMove(pm);
	if (walking) {
		WalkMove(pm);
	} else {
		AirMove(pm);
	}

	GroundTrace(pm);
}

function Pmove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	if (cmd.serverTime < ps.commandTime) {
		throw new Error('Pmove: cmd.serverTime < ps.commandTime');
		return;	// should not happen
	}

	if (cmd.serverTime > ps.commandTime + 1000) {
		ps.commandTime = cmd.serverTime - 1000;
	}

	ps.pmove_framecount = (ps.pmove_framecount+1) & ((1<<PS_PMOVEFRAMECOUNTBITS)-1);

	// chop the move up if it is too long, to prevent framerate
	// dependent behavior
	while (ps.commandTime != cmd.serverTime) {
		var msec = cmd.serverTime - ps.commandTime;

		if (msec > 66) {
			msec = 66;
		}

		PmoveSingle(pm, msec);

		if (pm.ps.pm_flags & PmoveFlags.JUMP_HELD) {
			pm.cmd.upmove = 20;
		}
	}
}
	
	return {
		ItemList:                 itemList,
		Pmove:                    Pmove,
		UpdateViewAngles:         UpdateViewAngles,
		PlayerStateToEntityState: PlayerStateToEntityState,
		EvaluateTrajectory:       EvaluateTrajectory,
		TouchJumpPad:             TouchJumpPad
	};
});
