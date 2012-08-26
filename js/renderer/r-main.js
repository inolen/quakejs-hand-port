(function(q3w) {
	q3w.R_Init = function (canvas, gl) {
		this.canvas = canvas;
		this.gl = gl;

		this.R_InitImages();
		this.R_InitShaders();
		this.R_InitGLShaders();
	};

	q3w.R_RenderScene = function (refdef) {
		var parms = Object.create(q3w.viewParms_t);
		parms.gl = refdef.gl;
		parms.x = refdef.x;
		parms.y = refdef.y
		parms.width = refdef.width;
		parms.height = refdef.height;
		parms.fov = refdef.fov;
		parms.origin = refdef.origin;
		parms.angles = refdef.angles;

		this.R_RenderView(parms);
	};

	q3w.R_RenderView = function (parms) {
		var gl = parms.gl;

		// Create projection matrix.
		var projectionMatrix = mat4.create();
		mat4.perspective(parms.fov, parms.width/parms.height, 1.0, 4096.0, projectionMatrix);
		//parms.projectionMatrix = projectionMatrix;

		// Create model view matrix.
		var modelMatrix = mat4.create();
		mat4.identity(modelMatrix);
		mat4.rotateX(modelMatrix, parms.angles[0]-Math.PI/2);
		mat4.rotateZ(modelMatrix, parms.angles[1]);
		mat4.translate(modelMatrix, /*[-832, -128, -118]*/[64, -176, -54]);
		//parms.modelMatrix = modelMatrix;

		// Setup
		gl.viewport(0, 0, parms.width, parms.height);
		gl.clearColor(0.0, 1.0, 0.0, 1.0);
		gl.clearDepth(1.0);

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.enable(gl.CULL_FACE);

		// Clear back buffer but not color buffer (we expect the entire scene to be overwritten)
		gl.depthMask(true);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		Q3RMain.draw(modelMatrix, projectionMatrix);
	};

	q3w.R_LoadMap = function (mapName) {
		var map = new q3w.Q3Bsp();

		map.load('maps/' + mapName + '.bsp', function () {
			Q3RMain._buildLightmaps(map);
			Q3RMain._buildSkyboxBuffers();
			Q3RMain._buildWorldBuffers(map);
			Q3RMain._bindShaders(map);
		});
	};
})(window.q3w = window.q3w || {});