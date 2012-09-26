var Q3W_BASE_FOLDER = 'baseq3';
var PACKET_BACKUP   = 32;                        // number of old messages that must be kept on client and
                                                 // server for delta comrpession and ping estimation
var PACKET_MASK     = (PACKET_BACKUP-1);

/**
 * NETWORKING
 */
var NetAdr = {
	type: 0,
	ip: null,
	port: 0
};

var NetAdrType = {
	NA_BAD: 0,
	NA_LOOPBACK: 1,
	NA_IP: 2
};

var NetSrc = {
	NS_CLIENT: 0,
	NS_SERVER: 1
};

/**
 * GAMESTATE
 */
var MAX_CLIENTS          = 64;                   // absolute limit
var MAX_LOCATIONS        = 64;

var MAX_GENTITIES        = 1024;

var ENTITYNUM_NONE       = MAX_GENTITIES-1;
var ENTITYNUM_WORLD      = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL = MAX_GENTITIES-2;

var PlayerState = function () {
	this.commandTime     = 0;                    // cmd->serverTime of last executed command
	this.origin          = [0, 0, 0];
	this.velocity        = [0, 0, 0];
	this.viewangles      = [0, 0, 0];
	this.speed           = 0;
	this.gracity         = 0;
	this.groundEntityNum = -1;                   // ENTITYNUM_NONE = in air
	this.pm_flags        = 0;                    // ducked, jump_held, etc
};

/**
 * EntityState is the information conveyed from the server
 * in an update message about entities that the client will
 * need to render in some way
 * Different eTypes may use the information in different ways
 * The messages are delta compressed, so it doesn't really matter if
 * the structure size is fairly large
 */
var EntityState = function () {
	this.number          = 0;                    // entity index
	this.eType           = 0;                    // entityType_t
	this.eFlags          = 0;
	//trajectory_t	pos;                         // for calculating position
	//trajectory_t	apos;                        // for calculating angles
	this.time            = 0;
	this.time2           = 0;
	this.origin          = [0, 0, 0];
	this.origin2         = [0, 0, 0];
	this.angles          = [0, 0, 0];
	this.angles2         = [0, 0, 0];
	this.groundEntityNum = 0;                    // ENTITYNUM_NONE = in air
	this.modelindex      = 0;
	this.modelindex2     = 0;
	this.clientNum       = 0;                    // 0 to (MAX_CLIENTS - 1), for players and corpses
	this.frame           = 0;
	this.solid           = 0;                    // for client side prediction, trap_linkentity sets this properly
	this.event           = 0;                    // impulse events -- muzzle flashes, footsteps, etc
	this.eventParm       = 0;
};

/**
 * Surface flags
 */
var CONTENTS_SOLID              = 1;             // an eye is never valid in a solid
var CONTENTS_LAVA               = 8;
var CONTENTS_SLIME              = 16;
var CONTENTS_WATER              = 32;
var CONTENTS_FOG                = 64;

var CONTENTS_NOTTEAM1           = 0x0080;
var CONTENTS_NOTTEAM2           = 0x0100;
var CONTENTS_NOBOTCLIP          = 0x0200;

var CONTENTS_AREAPORTAL         = 0x8000;

var CONTENTS_PLAYERCLIP         = 0x10000;
var CONTENTS_MONSTERCLIP        = 0x20000;
var CONTENTS_TELEPORTER         = 0x40000;
var CONTENTS_JUMPPAD            = 0x80000;
var CONTENTS_CLUSTERPORTAL      = 0x100000;
var CONTENTS_DONOTENTER         = 0x200000;
var CONTENTS_BOTCLIP            = 0x400000;
var CONTENTS_MOVER              = 0x800000;

var CONTENTS_ORIGIN             = 0x1000000;     // removed before bsping an entity

var CONTENTS_BODY               = 0x2000000;     // should never be on a brush, only in game
var CONTENTS_CORPSE             = 0x4000000;
var CONTENTS_DETAIL             = 0x8000000;     // brushes not used for the bsp
var CONTENTS_STRUCTURAL         = 0x10000000;    // brushes used for the bsp
var CONTENTS_TRANSLUCENT        = 0x20000000;    // don't consume surface fragments inside
var CONTENTS_TRIGGER            = 0x40000000;
var CONTENTS_NODROP             = 0x80000000;    // don't leave bodies or items (death fog, lava)

var SURF_NODAMAGE               = 0x1;           // never give falling damage
var SURF_SLICK                  = 0x2;           // effects game physics
var SURF_SKY                    = 0x4;           // lighting from environment map
var SURF_LADDER                 = 0x8;
var SURF_NOIMPACT               = 0x10;          // don't make missile explosions
var SURF_NOMARKS                = 0x20;          // don't leave missile marks
var SURF_FLESH                  = 0x40;          // make flesh sounds and effects
var SURF_NODRAW                 = 0x80;          // don't generate a drawsurface at all
var SURF_HINT                   = 0x100;         // make a primary bsp splitter
var SURF_SKIP                   = 0x200;         // completely ignore, allowing non-closed brushes
var SURF_NOLIGHTMAP             = 0x400;         // surface doesn't need a lightmap
var SURF_POINTLIGHT             = 0x800;         // generate lighting info at vertexes
var SURF_METALSTEPS             = 0x1000;        // clanking footsteps
var SURF_NOSTEPS                = 0x2000;        // no footstep sounds
var SURF_NONSOLID               = 0x4000;        // don't collide against curves with this set
var SURF_LIGHTFILTER            = 0x8000;        // act as a light filter during q3map -light
var SURF_ALPHASHADOW            = 0x10000;       // do per-pixel light shadow casting in q3map
var SURF_NODLIGHT               = 0x20000;       // don't dlight even if solid (solid lava, skies)
var SURF_DUST                   = 0x40000;       // leave a dust trail when walking on this surface