define(
	'server/sv',
	[
		'game/bg',
		'common/com-defines',
		'common/com-cmd',
		'common/com-net',
		'server/sv-defines',
		'server/sv-main',
		'server/sv-client',
		'server/sv-cmd',
		'server/sv-net'
	],
	function (bg, com_defines, com_cmd, com_net, sv_defines, sv_main, sv_client, sv_cmd, sv_net) {
		var sv = {};
		return _.extend(sv,
			com_defines,
			com_cmd.call(sv),
			com_net.call(sv),
			sv_defines,
			sv_main.call(sv, bg),
			sv_client.call(sv, bg),
			sv_cmd.call(sv, bg),
			sv_net.call(sv, bg)
		);
	}
);