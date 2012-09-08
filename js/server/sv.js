define(
	'server/sv',
	[
		'game/bg',
		'server/sv-defines',
		'server/sv-main',
		'server/sv-client',
		'server/sv-net'
	],
	function (q_bg, sv_defines, sv_main, sv_client, sv_net) {
		var q_sv = {};
		return _.extend(q_sv,
			sv_defines.call(q_sv, q_bg),
			sv_main.call(q_sv, q_bg),
			sv_client.call(q_sv, q_bg),
			sv_net.call(q_sv, q_bg)
		);
	}
);