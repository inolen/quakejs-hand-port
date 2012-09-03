define(
	'renderer/r',
	[
		'renderer/r-defines',
		'renderer/r-main',
		'renderer/r-image',
		'renderer/r-shader',
		'renderer/r-glshader',
		'renderer/r-world'
	],
	function (r_defines, r_main, r_image, r_shader, r_glshader, r_world) {
		var q_r = {};
		return _.extend(q_r,
			r_defines.call(q_r),
			r_main.call(q_r),
			r_image.call(q_r),
			r_shader.call(q_r),
			r_glshader.call(q_r),
			r_world.call(q_r)
		);
	}
);