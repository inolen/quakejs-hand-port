var global = global || window;

global.BASE_FOLDER = 'baseq3';
global.MAX_QPATH   = 64;
global.CMD_BACKUP  = 64;

// If entityState.solid === SOLID_BMODEL, modelIndex is an inline model number
global.SOLID_BMODEL = 0xffffff;

/**
 * Cvar flags
 */
global.CVF = {
	ARCHIVE:    0x0001,                                    // save to config file
	USERINFO:   0x0002,                                    // sent to server on connect or change
	SERVERINFO: 0x0004,                                    // sent in response to front end requests
	SYSTEMINFO: 0x0008                                     // these cvars will be duplicated on all clients
};

/**
 * Renderer (should be moved)
 */
global.MAX_DRAWSURFS  = 0x10000;

/**
 * Snapshot flags
 */
global.SNAPFLAG_RATE_DELAYED   = 1;
global.SNAPFLAG_NOT_ACTIVE     = 2;                        // snapshot used during connection and for zombies
global.SNAPFLAG_SERVERCOUNT    = 4;                        // toggled every map_restart so transitions can be detected

/**
 * MAX_* defines used to pre-alloc many structures
 */
global.GENTITYNUM_BITS         = 10;
global.MAX_CLIENTS             = 32;                       // absolute limit
global.MAX_GENTITIES           = (1 << 10);                // can't be increased without changing drawsurf bit packing
global.MAX_MODELS              = 256;                      // these are sent over the net as 8 bits
global.MAX_SOUNDS              = 256;                      // so they cannot be blindly increased

/**
 * Faux entity numbers
 */
global.ENTITYNUM_NONE          = MAX_GENTITIES-1;
global.ENTITYNUM_WORLD         = MAX_GENTITIES-2;
global.ENTITYNUM_MAX_NORMAL    = MAX_GENTITIES-2;

global.MOVE_RUN = 120;                                     // if forwardmove or rightmove are >= MOVE_RUN,
	                                                       // then BUTTON_WALKING should be set

/**
 * Playerstate
 */
global.MAX_STATS               = 16;
global.MAX_PERSISTANT          = 16;
global.MAX_POWERUPS            = 16;
global.MAX_WEAPONS             = 16;
global.MAX_PS_EVENTS           = 2;
global.PMOVEFRAMECOUNTBITS     = 6;

global.BUTTON = {
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

global.TR = {
	STATIONARY:  0,
	INTERPOLATE: 1,                              // non-parametric, but interpolate between snapshots
	LINEAR:      2,
	LINEAR_STOP: 3,
	SINE:        4,                              // value = base + sin( time / duration ) * delta
	GRAVITY:     5
};

global.SURF = {
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

global.CONTENTS = {
	SOLID:         1,                                      // an eye is never valid in a solid
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

	ORIGIN:        0x1000000,                              // removed before bsping an entity

	BODY:          0x2000000,                              // should never be on a brush, only in game
	CORPSE:        0x4000000,
	DETAIL:        0x8000000,                              // brushes not used for the bsp
	STRUCTURAL:    0x10000000,                             // brushes used for the bsp
	TRANSLUCENT:   0x20000000,                             // don't consume surface fragments inside
	TRIGGER:       0x40000000,
	NODROP:        0x80000000                              // don't leave bodies or items (death fog, lava)
};