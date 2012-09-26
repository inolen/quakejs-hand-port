var canvas, gl;
var refdef;

var flipMatrix = mat4.create([
	0, 0, -1, 0,
	-1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 0, 1
]);

function Init(canvasCtx, glCtx) {
	canvas = canvasCtx;
	gl = glCtx;
	refdef = new RefDef();

	InitImages();
	InitShaders();
}

function RenderScene(fd) {
	refdef.x = fd.x;
	refdef.y = fd.y
	refdef.width = fd.width;
	refdef.height = fd.height;
	refdef.fov = fd.fov;
	refdef.origin = fd.origin;
	refdef.viewaxis = fd.viewaxis;

	var parms = new ViewParms();
	parms.x = fd.x;
	parms.y = fd.y
	parms.width = fd.width;
	parms.height = fd.height;
	parms.fov = fd.fov;
	parms.origin = fd.origin;
	parms.viewaxis = fd.viewaxis;

	RenderView(parms);
}

function RenderView(parms) {
	// Create projection matrix.
	var projectionMatrix = mat4.create();
	mat4.perspective(parms.fov, parms.width/parms.height, 1.0, 4096.0, projectionMatrix);

	// Create model view matrix.
	var modelMatrix = mat4.create();
	modelMatrix[0] = parms.viewaxis[0][0];
	modelMatrix[4] = parms.viewaxis[0][1];
	modelMatrix[8] = parms.viewaxis[0][2];
	modelMatrix[12] = -parms.origin[0] * modelMatrix[0] + -parms.origin[1] * modelMatrix[4] + -parms.origin[2] * modelMatrix[8];

	modelMatrix[1] = parms.viewaxis[1][0];
	modelMatrix[5] = parms.viewaxis[1][1];
	modelMatrix[9] = parms.viewaxis[1][2];
	modelMatrix[13] = -parms.origin[0] * modelMatrix[1] + -parms.origin[1] * modelMatrix[5] + -parms.origin[2] * modelMatrix[9];

	modelMatrix[2] = parms.viewaxis[2][0];
	modelMatrix[6] = parms.viewaxis[2][1];
	modelMatrix[10] = parms.viewaxis[2][2];
	modelMatrix[14] = -parms.origin[0] * modelMatrix[2] + -parms.origin[1] * modelMatrix[6] + -parms.origin[2] * modelMatrix[10];

	modelMatrix[3] = 0;
	modelMatrix[7] = 0;
	modelMatrix[11] = 0;
	modelMatrix[15] = 1;

	// convert from our coordinate system (looking down X)
	// to OpenGL's coordinate system (looking down -Z)
	mat4.multiply(flipMatrix, modelMatrix, modelMatrix);

	// Setup
	gl.viewport(0, 0, parms.width, parms.height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.enable(gl.CULL_FACE);

	// Clear back buffer but not color buffer (we expect the entire scene to be overwritten)
	gl.depthMask(true);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	GenerateDrawSurfs();
	RenderDrawSurfs(modelMatrix, projectionMatrix);
}

/*q3bsp.prototype.setVisibility = function(visibilityList) {
	if (this.surfaces.length > 0) {
		for(var i = 0; i < this.surfaces.length; ++i) {
			this.surfaces[i].visible = (visibilityList[i] === true);
		}
	}
}*/

/*q3_r.AddDrawSurf = function (face, shader) {
	var rd = this.refdef;
	var idx = rd.numDrawSurfs & DRAWSURF_MASK;
	// the sort data is packed into a single 32 bit value so it can be
	// compared quickly during the qsorting process
	//tr.refdef.drawSurfs[index].sort = (shader->sortedIndex << QSORT_SHADERNUM_SHIFT)
	//	| tr.shiftedEntityNum | ( fogIndex << QSORT_FOGNUM_SHIFT ) | (int)dlightMap;
	rd.drawSurfs[idx].surface = face;
	rd.numDrawSurfs++;
}*/

function GenerateDrawSurfs() {
	//q3_r.AddWorldSurfaces(map);
}

function RenderDrawSurfs(modelMatrix, projectionMatrix) {
	RenderWorld(modelMatrix, projectionMatrix);
}