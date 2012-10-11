/**********************************************************
 * Definitions common between client and server, but not
 * game or render modules.
 **********************************************************/

var MAX_MAP_AREA_BYTES = 32;                     // bit vector of area visibility

// Event types for the main message pump.
var EventTypes = {
	KEYDOWN:   1,
	KEYUP:     2,
	MOUSEMOVE: 3
};

var PACKET_BACKUP   = 32;                        // number of old messages that must be kept on client and
                                                 // server for delta comrpession and ping estimation
var PACKET_MASK     = (PACKET_BACKUP-1);
var MAX_MSGLEN      = 16384;

var NetChan = function (addr, socket) {
	this.remoteAddress    = addr;
	this.socket           = socket;
	this.incomingSequence = 0;
	this.outgoingSequence = 0;
};

var ClientMessage = {
	nop:           1,
	move:          2,                            // [[UserCmd]
	moveNoDelta:   3,                            // [[UserCmd]
	clientCommand: 4                             // [string] message
};

var ServerMessage = {
	gamestate:     1,
	configstring:  2,                            // [short] [string] only in gamestate messages
	baseline:      3,                            // only in gamestate messages
	serverCommand: 4,                            // [string] to be executed by client game module
	snapshot:      5
};