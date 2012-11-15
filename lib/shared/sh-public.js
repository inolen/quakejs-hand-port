var BASE_FOLDER = 'baseq3';
var MAX_QPATH   = 64;
var CMD_BACKUP  = 64;

/**
 * Cvar flags
 */
var CVF = {
	ARCHIVE:    0x0001,                                    // save to config file
	USERINFO:   0x0002,                                    // sent to server on connect or change
	SERVERINFO: 0x0004,                                    // sent in response to front end requests
	SYSTEMINFO: 0x0008                                     // these cvars will be duplicated on all clients
};

/**
 * Renderer (should be moved)
 */
var MAX_DRAWSURFS  = 0x10000;
var ENTITYNUM_BITS = 10;// can't be increased without changing drawsurf bit packing
var MAX_ENTITIES   = (1 << ENTITYNUM_BITS);

/**
 * Snapshot flags
 */
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

/**
 * MAX_* defines used to pre-alloc many structures
 */
var MAX_CLIENTS             = 32;                          // absolute limit
var MAX_GENTITIES           = 1024;
var MAX_MODELS              = 256;                         // these are sent over the net as 8 bits
var MAX_SOUNDS              = 256;                         // so they cannot be blindly increased

/**
 * Faux entity numbers
 */
var ENTITYNUM_NONE          = MAX_GENTITIES-1;
var ENTITYNUM_WORLD         = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL    = MAX_GENTITIES-2;

var MOVE_RUN = 120;                                        // if forwardmove or rightmove are >= MOVE_RUN,
	                                                       // then BUTTON_WALKING should be set

/**
 * Playerstate
 */
var MAX_STATS               = 16;
var MAX_PERSISTANT          = 16;
var MAX_POWERUPS            = 16;
var MAX_WEAPONS             = 16;
var MAX_PS_EVENTS           = 2;
var PMOVEFRAMECOUNTBITS     = 6;

var BUTTON = {
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