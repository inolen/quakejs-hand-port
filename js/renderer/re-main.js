var re;
var canvas, gl;
var r_subdivisions;
var r_znear;
var r_zproj;

var flipMatrix = mat4.create([
	0, 0, -1, 0,
	-1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 0, 1
]);

function Init(canvasCtx, glCtx) {
	// Due to circular dependencies, we need to re-require com now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	com = require('common/com');

	canvas = canvasCtx;
	gl = glCtx;
	
	re = new RenderLocals();

	r_subdivisions = com.CvarAdd('r_subdivisions', 4);
	r_znear = com.CvarAdd('r_znear', 4);
	r_zproj = com.CvarAdd('r_zproj', 64);

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
	re.refdef.fovX = fd.fovX;
	re.refdef.fovY = fd.fovY;
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
	parms.fovX = fd.fovX;
	parms.fovY = fd.fovY;
	vec3.set(fd.vieworg, parms.or.origin);
	vec3.set(fd.viewaxis[0], parms.or.axis[0]);
	vec3.set(fd.viewaxis[1], parms.or.axis[1]);
	vec3.set(fd.viewaxis[2], parms.or.axis[2]);
	vec3.set(fd.vieworg, parms.pvsOrigin);

	RenderView(parms);
}

function SetupModelMatrix() {
	var or = re.viewParms.or;

	// Create model view matrix.
	var modelMatrix = mat4.create();
	modelMatrix[0] = or.axis[0][0];
	modelMatrix[4] = or.axis[0][1];
	modelMatrix[8] = or.axis[0][2];
	modelMatrix[12] = -or.origin[0] * modelMatrix[0] + -or.origin[1] * modelMatrix[4] + -or.origin[2] * modelMatrix[8];

	modelMatrix[1] = or.axis[1][0];
	modelMatrix[5] = or.axis[1][1];
	modelMatrix[9] = or.axis[1][2];
	modelMatrix[13] = -or.origin[0] * modelMatrix[1] + -or.origin[1] * modelMatrix[5] + -or.origin[2] * modelMatrix[9];

	modelMatrix[2] = or.axis[2][0];
	modelMatrix[6] = or.axis[2][1];
	modelMatrix[10] = or.axis[2][2];
	modelMatrix[14] = -or.origin[0] * modelMatrix[2] + -or.origin[1] * modelMatrix[6] + -or.origin[2] * modelMatrix[10];

	modelMatrix[3] = 0;
	modelMatrix[7] = 0;
	modelMatrix[11] = 0;
	modelMatrix[15] = 1;

	// convert from our coordinate system (looking down X)
	// to OpenGL's coordinate system (looking down -Z)
	mat4.multiply(flipMatrix, modelMatrix, or.modelMatrix);
}

function SetupProjectionMatrix(zProj) {
	var parms = re.viewParms;

	var ymax = zProj * Math.tan(parms.fovY * Math.PI / 360);
	var ymin = -ymax;

	var xmax = zProj * Math.tan(parms.fovX * Math.PI / 360);
	var xmin = -xmax;

	var width = xmax - xmin;
	var height = ymax - ymin;

	parms.projectionMatrix[0] = 2 * zProj / width;
	parms.projectionMatrix[4] = 0;
	parms.projectionMatrix[8] = (xmax + xmin) / width;
	parms.projectionMatrix[12] = 0;

	parms.projectionMatrix[1] = 0;
	parms.projectionMatrix[5] = 2 * zProj / height;
	parms.projectionMatrix[9] = (ymax + ymin) / height; // normally 0
	parms.projectionMatrix[13] = 0;

	parms.projectionMatrix[3] = 0;
	parms.projectionMatrix[7] = 0;
	parms.projectionMatrix[11] = -1;
	parms.projectionMatrix[15] = 0;

	// Now that we have all the data for the projection matrix we can also setup the view frustum.
	SetupFrustum(parms, xmin, xmax, ymax, zProj);
}

/**
 * SetupFrustum
 * Set up the culling frustum planes for the current view using the results we got from computing the first two rows of 
 * the projection matrix.
 */
function SetupFrustum(parms, xmin, xmax, ymax, zProj) {
	var ofsorigin = vec3.create(parms.or.origin);

	var length = Math.sqrt(xmax * xmax + zProj * zProj);
	var oppleg = xmax / length;
	var adjleg = zProj / length;

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[0].normal);
	vec3.add(parms.frustum[0].normal, vec3.scale(parms.or.axis[1], adjleg, [0,0,0]));

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[1].normal);
	vec3.add(parms.frustum[1].normal, vec3.scale(parms.or.axis[1], -adjleg, [0,0,0]));

	length = Math.sqrt(ymax * ymax + zProj * zProj);
	oppleg = ymax / length;
	adjleg = zProj / length;

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[2].normal);
	vec3.add(parms.frustum[2].normal, vec3.scale(parms.or.axis[2], adjleg, [0,0,0]));

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[3].normal);
	vec3.add(parms.frustum[3].normal, vec3.scale(parms.or.axis[2], -adjleg, [0,0,0]));

	for (var i = 0; i < 4; i++) {
		parms.frustum[i].type = PLANE_NON_AXIAL;
		parms.frustum[i].dist = vec3.dot(ofsorigin, parms.frustum[i].normal);
		parms.frustum[i].signbits = GetPlaneSignbits(parms.frustum[i]);
	}
}

function SetFarClip() {
	var parms = re.viewParms;

	// if not rendering the world (icons, menus, etc)
	// set a 2k far clip plane
	/*if (tr.refdef.rdflags & RDF_NOWORLDMODEL) {
		tr.viewParms.zFar = 2048;
		return;
	}*/

	// set far clipping planes dynamically
	var farthestCornerDistance = 0;
	for (var i = 0; i < 8; i++) {
		var v = [0, 0, 0];

		if ( i & 1 ) {
			v[0] = parms.visBounds[0][0];
		} else {
			v[0] = parms.visBounds[1][0];
		}

		if (i & 2) {
			v[1] = parms.visBounds[0][1];
		} else {
			v[1] = parms.visBounds[1][1];
		}

		if (i & 4) {
			v[2] = parms.visBounds[0][2];
		} else {
			v[2] = parms.visBounds[1][2];
		}

		var vecTo = vec3.subtract(v, re.viewParms.or.origin, [0, 0, 0]);
		var distance = vecTo[0] * vecTo[0] + vecTo[1] * vecTo[1] + vecTo[2] * vecTo[2];

		if (distance > farthestCornerDistance) {
			farthestCornerDistance = distance;
		}
	}

	re.viewParms.zFar = Math.sqrt(farthestCornerDistance);
}

/**
 * SetupProjectionZ
 * Sets the z-component transformation part in the projection matrix.
 */
function SetupProjectionMatrixZ() {
	var parms = re.viewParms;

	var zNear = r_znear();
	var zFar = parms.zFar;
	var depth = zFar - zNear;

	parms.projectionMatrix[2] = 0;
	parms.projectionMatrix[6] = 0;
	parms.projectionMatrix[10] = -(zFar + zNear) / depth;
	parms.projectionMatrix[14] = -2 * zFar * zNear / depth;
}

function RenderView(parms) {
	re.viewCount++;
	re.viewParms = parms;
	re.viewParms.frameSceneNum = re.frameSceneNum;
	re.viewParms.frameCount = re.frameCount;
	// TODO not needed until we support portals
	//var firstDrawSurf = re.refdef.numDrawSurfs;
	re.viewCount++;

	// SETUP tr.or
	//vec3.set(re.viewParms.or.origin, re.or.viewOrigin);

	SetupModelMatrix();
	SetupProjectionMatrix(r_zproj());

	GenerateDrawSurfs();
	SortDrawSurfaces();
	RenderDrawSurfaces();
}

function GenerateDrawSurfs() {
	AddWorldSurfaces();

	// AddWorldSurfaces will setup the min/max visibility bounds.
	SetFarClip();
	SetupProjectionMatrixZ();
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
	//RadixSort(re.refdef.drawSurfs, 'sort', re.refdef.numDrawSurfs);
}

var startTime = sys.GetMilliseconds();
function RenderDrawSurfaces() {
	var world = re.world;
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

	// Seconds passed since map was initialized
	var time = (sys.GetMilliseconds() - startTime)/1000.0;
	var i = 0;

	// If we have a skybox, render it first
	if (skyShader) {
		// SkyBox Buffers
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
		gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);

		// Render Skybox
		SetShader(skyShader);
		for(var j = 0; j < skyShader.stages.length; j++) {
			var stage = skyShader.stages[j];

			SetShaderStage(skyShader, stage, time);
			BindSkyAttribs(stage.program, parms.or.modelMatrix, parms.projectionMatrix);

			// Draw all geometry that uses this textures
			gl.drawElements(gl.TRIANGLES, skyboxIndexCount, gl.UNSIGNED_SHORT, 0);
		}
	}

	// Map Geometry buffers
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

	var refdef = re.refdef;
	var drawSurfs = refdef.drawSurfs;
	var shaders = world.shaders;

	var printfaces = false;
	if (!window.foobar) {
		printfaces = true;
		window.foobar = true;
	}

	for (var i = 0; i < refdef.numDrawSurfs; i++) {
		var face = drawSurfs[i].surface;
		var shader = face.shader;
		var glshader = shader.glshader;

		// Bind the surface shader
		SetShader(glshader);
		
		for (var j = 0; j < glshader.stages.length; j++) {
			var stage = glshader.stages[j];

			SetShaderStage(glshader, stage, time);
			BindShaderAttribs(stage.program, parms.or.modelMatrix, parms.projectionMatrix);

			gl.drawElements(gl.TRIANGLES, face.meshVertCount, gl.UNSIGNED_SHORT, face.indexOffset);

			re.pc.verts += face.meshVertCount;
		}
	}

	/*if (!window.foobar || sys.GetMilliseconds() - window.foobar > 1000) {
		console.log(re.pc.surfs + ' surfs, ' + re.pc.leafs + ' leafs, ', + re.pc.verts + ' verts');
		window.foobar = sys.GetMilliseconds();
	}*/
}