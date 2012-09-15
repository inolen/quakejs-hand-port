define(
	'common/com',
	[
		'common/com-defines',
		'common/com-main',
		'common/com-cmd',
		'common/com-net'
	],
	function (com_defines, com_main, com_cmd, com_net) {
		var q_com = {};
		return _.extend(q_com,
			com_defines,
			com_main.call(q_com),
			com_cmd.call(q_com),
			com_net.call(q_com)
		);
	}
);