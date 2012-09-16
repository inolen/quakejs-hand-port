define(
	'game/bg',
	[
		'game/bg-defines',
		'game/bg-pmove'
	],
	function (bg_defines, bg_pmove) {
		var bg = this;
		return  _.extend(bg,
			bg_defines,
			bg_pmove.call(bg)
		);
	}
);