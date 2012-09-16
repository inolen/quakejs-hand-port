define(
	'renderer/r',
	[
		'common/com-defines',
		'common/com-bsp',
		'renderer/r-defines',
		'renderer/r-main',
		'renderer/r-image',
		'renderer/r-shader',
		'renderer/r-glshader',
		'renderer/r-world'
	],
	function (com_defines, com_bsp, re_defines, re_main, re_image, re_shader, re_glshader, re_world) {
		var re = {};
		return _.extend(re,
			com_defines,
			com_bsp.call(re),
			re_defines,
			re_main.call(re),
			re_image.call(re),
			re_shader.call(re),
			re_glshader.call(re),
			re_world.call(re)
		);
	}
);