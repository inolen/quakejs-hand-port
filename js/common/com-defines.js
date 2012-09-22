var Q3W_BASE_FOLDER = 'baseq3';

var PITCH = 0; // up / down
var YAW   = 1; // left / right
var ROLL  = 2; // fall over

var PACKET_BACKUP = 32; // number of old messages that must be kept on client and
						// server for delta comrpession and ping estimation
var PACKET_MASK = (PACKET_BACKUP-1);

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
var PlayerState = function () {
	this.origin = [0, 0, 0];
	this.velocity = [0, 0, 0];
	this.viewangles = [0, 0, 0];
	this.speed = 0;
};