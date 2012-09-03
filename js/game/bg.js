define(
	'game/bg',
	[
		'common/com-shared',
		'game/bg-main',
		'game/bg-pmove'
	],
	function (q_shared, bg_main, bg_pmove) {
		var q_bg = this;
		return  _.extend(q_bg,
			bg_main.call(q_bg, q_shared),
			bg_pmove.call(q_bg, q_shared)
		);
	}
);