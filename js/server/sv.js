define(
	'server/sv',
	[
		'game/bg',
		'server/sv-defines',
		'server/sv-main'
	],
	function (q_bg, sv_defines, sv_main) {
		var q_sv = {};
		return _.extend(q_sv,
			sv_defines.call(q_sv, q_bg),
			sv_main.call(q_sv, q_bg)
		);
	}
);