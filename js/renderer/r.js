define(
	'renderer/r',
	[
		'shared/shared',
		'renderer/r-main',
		'renderer/r-image',
		'renderer/r-shader',
		'renderer/r-glshader',
		'renderer/r-world'
	],
	function (q_shared, r_main, r_image, r_shader, r_glshader, r_world) {
		var q_r = {};
		return _.extend(q_r,
			r_main.call(q_r, q_shared),
			r_image.call(q_r, q_shared),
			r_shader.call(q_r, q_shared),
			r_glshader.call(q_r, q_shared),
			r_world.call(q_r, q_shared)
		);
	}
);