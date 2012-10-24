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

/**********************************************************
 * Networking
 **********************************************************/
var PACKET_BACKUP         = 32;                  // number of old messages that must be kept on client and
                                                 // server for delta comrpession and ping estimation
var MAX_PACKET_USERCMDS   = 32;                  // max number of usercmd_t in a packet
var MAX_RELIABLE_COMMANDS = 64;                  // max string commands buffered for restransmit
var MAX_MSGLEN            = 16384;

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
	clientCommand: 3,                            // [string] message
	EOF:           4
};

var ServerMessage = {
	gamestate:      0,
	configstring:   1,                           // [short] [string] only in gamestate messages
	baseline:       2,                           // only in gamestate messages
	serverCommand:  3,                           // [string] to be executed by client game module
	snapshot:       4
};

/**********************************************************
 * Cvars
 **********************************************************/
var Cvar = function (defaultValue) {
	var currentValue = defaultValue;

	return function (newValue) {
		if (arguments.length) {
			var oldValue = currentValue;
			currentValue = newValue;
		} else {
			return currentValue;
		}
	};
}