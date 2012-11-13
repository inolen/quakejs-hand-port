var MAX_MAP_AREA_BYTES = 32;                     // bit vector of area visibility

/**
 * System events
 */
var SE = {
	CLMSG:       0,
	SVMSG:       1,
	SVSOCKCLOSE: 2,
	KEY:         3,
	MOUSE:       4
};

/**
 * Networking
 */
var PACKET_BACKUP         = 32;                  // number of old messages that must be kept on client and
                                                 // server for delta comrpession and ping estimation
var MAX_PACKET_USERCMDS   = 32;                  // max number of usercmd_t in a packet
var MAX_RELIABLE_COMMANDS = 64;                  // max string commands buffered for restransmit
var MAX_MSGLEN            = 16384;

var CLM = {
	nop:           0,
	move:          1,                            // [[UserCmd]
	moveNoDelta:   2,                            // [[UserCmd]
	clientCommand: 3,                            // [string] message
	EOF:           4
};

var SVM = {
	gamestate:      0,
	configstring:   1,                           // [short] [string] only in gamestate messages
	baseline:       2,                           // only in gamestate messages
	serverCommand:  3,                           // [string] to be executed by client game module
	snapshot:       4,
	EOF:            5
};