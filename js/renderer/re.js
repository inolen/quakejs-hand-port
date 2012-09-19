define(
	'renderer/re',
	[
		'common/com-defines',
		'common/com-bsp',
		'renderer/re-defines',
		'renderer/re-main',
		'renderer/re-image',
		'renderer/re-shader',
		'renderer/re-glshader',
		'renderer/re-world'
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