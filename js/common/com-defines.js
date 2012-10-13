/**********************************************************
 * Definitions common between client and server, but not
 * game or render modules.
 **********************************************************/

var MAX_MAP_AREA_BYTES = 32;                     // bit vector of area visibility

// Event types for the main message pump.
var EventTypes = {
	NETCLMESSAGE:    0,
	NETSVCONNECT:    1,
	NETSVDISCONNECT: 2,
	NETSVMESSAGE:    3,
	KEYDOWN:         4,
	KEYUP:           5,
	MOUSEMOVE:       6
};

var PACKET_BACKUP   = 32;                        // number of old messages that must be kept on client and
                                                 // server for delta comrpession and ping estimation
var PACKET_MASK     = (PACKET_BACKUP-1);
var MAX_MSGLEN      = 16384;

var NetChan = function () {
	this.src              = 0;
	this.remoteAddress    = null;
	this.socket           = null;
	this.incomingSequence = 0;
	this.outgoingSequence = 0;
};

var ClientMessage = {
	nop:           0,
	move:          1,                            // [[UserCmd]
	moveNoDelta:   2,                            // [[UserCmd]
	clientCommand: 3                             // [string] message
};

var ServerMessage = {
	gamestate:      0,
	configstring:   1,                           // [short] [string] only in gamestate messages
	baseline:       2,                           // only in gamestate messages
	serverCommand:  3,                           // [string] to be executed by client game module
	snapshot:       4
};