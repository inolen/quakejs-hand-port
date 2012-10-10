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

var NetAdrType = {
	NA_BAD:      0,
	NA_LOOPBACK: 1,
	NA_IP:       2
};

var NetAdr = function (type, ip, port) {
	this.type = type;
	this.ip   = ip;
	this.port = port;
};

var NetChan = function (addr, socket) {
	this.remoteAddress    = addr;
	this.socket           = socket;
	this.incomingSequence = 0;
	this.outgoingSequence = 0;
};