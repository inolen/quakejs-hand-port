var MAX_MAP_AREA_BYTES = 32;                               // bit vector of area visibility

/**********************************************************
 *
 * System events
 *
 **********************************************************/
var SE = {
	CLNETMSG:   0,
	SVNETMSG:   1,
	SVNETCLOSE: 2,
	KEY:        3,
	MOUSE:      4
};

/**********************************************************
 *
 * Networking
 *
 **********************************************************/
var PACKET_BACKUP         = 32;                           // number of old messages that must be kept on client and
                                                           // server for delta comrpession and ping estimation
var MAX_PACKET_USERCMDS   = 32;                           // max number of usercmd_t in a packet
var MAX_RELIABLE_COMMANDS = 64;                           // max string commands buffered for restransmit
var MAX_MSGLEN            = 16384;

var CLM = {
	bad:           0,
	move:          1,                                      // [[UserCmd]
	moveNoDelta:   2,                                      // [[UserCmd]
	clientCommand: 3,                                      // [string] message
	EOF:           4
};

var SVM = {
	bad:            0,
	gamestate:      1,
	configstring:   2,                                     // [short] [string] only in gamestate messages
	baseline:       3,                                     // only in gamestate messages
	serverCommand:  4,                                     // [string] to be executed by client game module
	snapshot:       5,
	EOF:            6
};

var NetChan = function () {
	this.src              = 0;
	this.remoteAddress    = null;
	this.incomingSequence = 0;
	this.outgoingSequence = 1;                             // start at 1 for delta checks
	this.ready            = false;
	this.msocket          = null;
};