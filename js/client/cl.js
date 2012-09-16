define(
	'client/cl',
	[
		'renderer/r',
		'game/bg',
		'common/com-defines',
		'common/com-cmd',
		'common/com-net',
		'client/cl-defines',
		'client/cl-main',
		'client/cl-cmd',
		'client/cl-input',
		'client/cl-net'
	],
	function (re, bg, com_defines, com_cmd, com_net, cl_defines, cl_main, cl_cmd, cl_input, cl_net) {
		var cl = {};
		return _.extend(cl,
			com_defines,
			com_cmd.call(cl),
			com_net.call(cl),
			cl_defines,
			cl_main.call(cl, re, bg),
			cl_cmd.call(cl, re, bg),
			cl_input.call(cl, re, bg),
			cl_net.call(cl, re, bg)
		);
	}
);