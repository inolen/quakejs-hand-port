define('common/com-defines', [], function () {
	return {
		Q3W_BASE_FOLDER: 'baseq3',

		/**
		 * NETWORKING
		 */
		netsrc_t: {
			NS_CLIENT: 0,
			NS_SERVER: 1
		},

		netadrtype_t: {
			NA_BAD: 0,
			NA_LOOPBACK: 1,
			NA_IP: 2
		},

		netadr_t: {
			type: 0,
			ip: null,
			port: 0
		},

		/**
		 * PACKET TYPES
		 */
		packet_t: {
			type: 0,
			data: null
		},

		// server to client
		svc_ops_e: {
			svc_bad: 0,
			svc_nop: 1,
			svc_gamestate: 2,
			svc_configstring: 3,			// [short] [string] only in gamestate messages
			svc_baseline: 4,				// only in gamestate messages
			svc_serverCommand: 5,			// [string] to be executed by client game module
			svc_download: 6,				// [short] size [size bytes]
			svc_snapshot: 7,
			svc_EOF: 8
		},

		// client to server
		clc_ops_e: {
			clc_bad: 0,
			clc_nop: 1,
			clc_move: 2,					// [[usercmd_t]
			clc_moveNoDelta: 3,				// [[usercmd_t]
			clc_clientCommand: 4,			// [string] message
			clc_EOF: 5
		},

		/**
		 * GAMESTATE
		 */
		usercmd_t: Struct.create(
			Struct.array('angles', Struct.float32(), 3),
			Struct.uint8('forwardmove'),
			Struct.uint8('rightmove'),
			Struct.uint8('upmove')
		),

		playerState_t: {
			viewheight: 0
		}
	};
});