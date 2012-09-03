define('renderer/r-defines', [], function () {
	return function () {
		return {
			viewParms_t: {
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				fov: 0,
				origin: null,
				angles: null
			},

			trRefdef_t: {
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				fov: 0,
				origin: null,
				angles: null,
				drawSurfs: null
			},

			image_t: {
				imgName: null,
				texnum: null
			}
		};
	};
});