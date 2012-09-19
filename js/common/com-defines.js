var Q3W_BASE_FOLDER = 'baseq3';

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
 * PACKET TYPES
 */
var Packet = {
	type: 0,
	data: null
};

// client to server
var ClcOps = {
	clc_bad: 0,
	clc_nop: 1,
	clc_move: 2,					// [[UserCmd]
	clc_moveNoDelta: 3,				// [[UserCmd]
	clc_clientCommand: 4,			// [string] message
	clc_EOF: 5
};

// server to client
var SvcOps = {
	svc_bad: 0,
	svc_nop: 1,
	svc_gamestate: 2,
	svc_configstring: 3,			// [short] [string] only in gamestate messages
	svc_baseline: 4,				// only in gamestate messages
	svc_serverCommand: 5,			// [string] to be executed by client game module
	svc_download: 6,				// [short] size [size bytes]
	svc_snapshot: 7,
	svc_EOF: 8
};

/**
 * GAMESTATE
 */
var PlayerState = {
	viewheight: 0
};

var UserCmd = Struct.create(
	Struct.array('angles', Struct.float32(), 3),
	Struct.uint8('forwardmove'),
	Struct.uint8('rightmove'),
	Struct.uint8('upmove')
);