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
		 * GAMESTATE
		 */
		usercmd_t: {
			angles: [0 , 0, 0]
		},

		playerState_t: {
			viewheight: 0
		}
	};
});