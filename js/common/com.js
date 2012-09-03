define(
	'common/com',
	[
		'client/cl',
		'common/com-main',
		//'common/com-cvar',
		//'common/com-net',
		//'common/com-trace',
	],
	function (q_cl, com_main, com_bsp) {
		var q_com = {};
		return _.extend(q_com,
			com_main.call(q_com, q_cl)
		);
	}
);