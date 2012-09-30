var re;
var canvas, gl;

var flipMatrix = mat4.create([
	0, 0, -1, 0,
	-1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 0, 1
]);

function Init(canvasCtx, glCtx) {
	canvas = canvasCtx;
	gl = glCtx;
	
	re = new RenderLocals();

	InitImages();
	InitShaders();
}

function RenderScene(fd) {
	if (!re.world) {
		//throw new Error('RenderScene: NULL worldmodel');
		return;
	}

	re.refdef.x = fd.x;
	re.refdef.y = fd.y
	re.refdef.width = fd.width;
	re.refdef.height = fd.height;
	re.refdef.fov = fd.fov;
	re.refdef.origin = fd.vieworg;
	re.refdef.viewaxis = fd.viewaxis;

	re.refdef.numDrawSurfs = 0;
	re.pc.surfs = 0;
	re.pc.leafs = 0;
	re.pc.verts  = 0;

	var parms = new ViewParms();
	parms.x = fd.x;
	parms.y = fd.y
	parms.width = fd.width;
	parms.height = fd.height;
	parms.fov = fd.fov;
	vec3.set(fd.vieworg, parms.or.origin);
	vec3.set(fd.viewaxis[0], parms.or.viewaxis[0]);
	vec3.set(fd.viewaxis[1], parms.or.viewaxis[1]);
	vec3.set(fd.viewaxis[2], parms.or.viewaxis[2]);
	vec3.set(fd.vieworg, parms.pvsOrigin);

	RenderView(parms);
}

function SetupModelMatrix() {
	var or = re.viewParms.or;

	// Create model view matrix.
	var modelMatrix = mat4.create();
	modelMatrix[0] = or.viewaxis[0][0];
	modelMatrix[4] = or.viewaxis[0][1];
	modelMatrix[8] = or.viewaxis[0][2];
	modelMatrix[12] = -or.origin[0] * modelMatrix[0] + -or.origin[1] * modelMatrix[4] + -or.origin[2] * modelMatrix[8];

	modelMatrix[1] = or.viewaxis[1][0];
	modelMatrix[5] = or.viewaxis[1][1];
	modelMatrix[9] = or.viewaxis[1][2];
	modelMatrix[13] = -or.origin[0] * modelMatrix[1] + -or.origin[1] * modelMatrix[5] + -or.origin[2] * modelMatrix[9];

	modelMatrix[2] = or.viewaxis[2][0];
	modelMatrix[6] = or.viewaxis[2][1];
	modelMatrix[10] = or.viewaxis[2][2];
	modelMatrix[14] = -or.origin[0] * modelMatrix[2] + -or.origin[1] * modelMatrix[6] + -or.origin[2] * modelMatrix[10];

	modelMatrix[3] = 0;
	modelMatrix[7] = 0;
	modelMatrix[11] = 0;
	modelMatrix[15] = 1;

	// convert from our coordinate system (looking down X)
	// to OpenGL's coordinate system (looking down -Z)
	mat4.multiply(flipMatrix, modelMatrix, or.modelMatrix);
}

function SetupProjectionMatrix() {
	var parms = re.viewParms;

	parms.projectionMatrix = mat4.create();
	mat4.perspective(parms.fov, parms.width/parms.height, 1.0, 4096.0, parms.projectionMatrix);
}

function RenderView(parms) {
	re.viewCount++;
	re.viewParms = parms;
	re.viewParms.frameSceneNum = re.frameSceneNum;
	re.viewParms.frameCount = re.frameCount;
	//var firstDrawSurf = re.refdef.numDrawSurfs;
	re.viewCount++;

	// SETUP tr.or
	//vec3.set(re.viewParms.or.origin, re.or.viewOrigin);

	SetupModelMatrix();
	SetupProjectionMatrix();

	GenerateDrawSurfs();
}


function SetShader(glshader) {
	if (!glshader) {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
	} else if (glshader.cull && !glshader.sky) {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(glshader.cull);
	} else {
		gl.disable(gl.CULL_FACE);
	}

	return true;
}

function SetShaderStage(glshader, stage, time) {
	gl.blendFunc(stage.blendSrc, stage.blendDest);

	if (stage.depthWrite && !glshader.sky) {
		gl.depthMask(true);
	} else {
		gl.depthMask(false);
	}

	gl.depthFunc(stage.depthFunc);
	gl.useProgram(stage.program);

	var texture;
	if (stage.animFreq) {
		var animFrame = Math.floor(time * stage.animFreq) % stage.animMaps.length;
		texture = LoadTextureForStage(glshader, stage, animFrame);
	} else {
		texture = LoadTextureForStage(glshader, stage);
	}

	gl.activeTexture(gl.TEXTURE0);
	gl.uniform1i(stage.program.uniform.texture, 0);
	gl.bindTexture(gl.TEXTURE_2D, texture.texnum);

	if (stage.program.uniform.lightmap) {
		var lightmap = FindImage('*lightmap');
		gl.activeTexture(gl.TEXTURE1);
		gl.uniform1i(stage.program.uniform.lightmap, 1);;
		gl.bindTexture(gl.TEXTURE_2D, lightmap.texnum);
	}

	if (stage.program.uniform.time) {
		gl.uniform1f(stage.program.uniform.time, time);
	}
}

function AddDrawSurf(face, shader/*, fogIndex, dlightMap*/) {
	var refdef = re.refdef;

	// Instead of checking for overflow, we just mask the index so it wraps around.
	var index = refdef.numDrawSurfs & DRAWSURF_MASK;
	// The sort data is packed into a single 32 bit value so it can be
	// compared quickly during the qsorting process.
	refdef.drawSurfs[index].sort = (shader.sortedIndex << QSORT_SHADERNUM_SHIFT);
	//	| tr.shiftedEntityNum | ( fogIndex << QSORT_FOGNUM_SHIFT ) | (int)dlightMap;
	refdef.drawSurfs[index].surface = face;
	refdef.numDrawSurfs++;

	re.pc.surfs++;
}

function SortDrawSurfaces() {
	RadixSort(re.refdef.drawSurfs, re.refdef.numDrawSurfs);
}

function RenderDrawSurfaces() {
	var parms = re.viewParms;

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

	RenderWorld(parms.or.modelMatrix, parms.projectionMatrix);
}

function GenerateDrawSurfs() {
	AddWorldSurfaces();
	SortDrawSurfaces();
	RenderDrawSurfaces();
}