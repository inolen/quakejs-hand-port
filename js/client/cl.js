define(
	'client/cl',
	[
		'shared/shared',
		'renderer/r',
		'game/bg',
		'client/cl-main',
		'client/cl-input'
	],
	function (q_shared, q_r, q_bg, cl_main, cl_input) {
		var q_cl = {};
		return _.extend(q_cl,
			cl_main.call(q_cl, q_shared, q_r, q_bg),
			cl_input.call(q_cl, q_shared, q_r, q_bg)
		);
	}
);