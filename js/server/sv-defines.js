define('server/sv-defines', ['common/com-defines'], function (q_com_def) {
	return function () {
		return {
			client_t: {
				challenge: 0,
				lastUsercmd: null,
				netchan: null
			}
		};
	};
});