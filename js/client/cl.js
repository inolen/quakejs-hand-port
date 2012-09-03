define(
	'client/cl',
	[
		'renderer/r',
		'game/bg',
		'client/cl-defines',
		'client/cl-main',
		'client/cl-input',
		'client/cl-net'
	],
	function (q_r, q_bg, cl_defines, cl_main, cl_input, cl_net) {
		var q_cl = {};
		return _.extend(q_cl,
			cl_defines.call(q_cl, q_r, q_bg),
			cl_main.call(q_cl, q_r, q_bg),
			cl_input.call(q_cl, q_r, q_bg),
			cl_net.call(q_cl, q_r, q_bg)
		);
	}
);