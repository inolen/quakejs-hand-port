define(
	'game/bg',
	[
		'game/bg-defines',
		'game/bg-pmove'
	],
	function (bg_defines, bg_pmove) {
		var q_bg = this;
		return  _.extend(q_bg,
			bg_defines.call(q_bg),
			bg_pmove.call(q_bg)
		);
	}
);