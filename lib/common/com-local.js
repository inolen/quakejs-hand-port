/**********************************************************
 * Definitions common between client and server, but not
 * game or render modules.
 **********************************************************/

/**
 * Networking
 */
var NetChan = function () {
	this.src              = 0;
	this.remoteAddress    = null;
	this.socket           = null;
	this.incomingSequence = 0;
	this.outgoingSequence = 0;
};