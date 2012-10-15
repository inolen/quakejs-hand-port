var cl;

var re;
var gl;
var viewportUi;
var r_cull;
var r_subdivisions;
var r_znear;
var r_zproj;

var flipMatrix = mat4.create([
	0, 0, -1, 0,
	-1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 0, 1
]);

function Init(clinterface) {
	console.log('--------- RE Init ---------');

	cl = clinterface;
	
	re = new RenderLocals();

	r_cull = cl.AddCvar('r_cull', 1);
	r_subdivisions = cl.AddCvar('r_subdivisions', 4);
	r_znear = cl.AddCvar('r_znear', 4);
	r_zproj = cl.AddCvar('r_zproj', 64);

	var gameContext = cl.GetGameRenderContext();
	var uiContext = cl.GetUIRenderContext();
	gl = gameContext.gl;
	viewportUi = uiContext.handle;

	InitImages();
	InitShaders();
}

function Shutdown() {
	console.log('--------- RE Shutdown ---------');
	DeleteTextures();
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
	re.refdef.time = fd.time;

	re.refdef.numDrawSurfs = 0;

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

	re.refdef.numRefEntities = 0;
}

function AddRefEntityToScene(refent) {
	if (refent.reType < 0 || refent.reType >= RefEntityType.MAX_REF_ENTITY_TYPE) {
		throw new Error('AddRefEntityToScene: bad reType ' + ent.reType);
	}

	refent.clone(re.refdef.refEntities[re.refdef.numRefEntities]);

	re.refdef.numRefEntities++;
}

function RotateModelMatrixForViewer() {
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

function RotateModelMatrixForEntity(refent, or) {
	vec3.set(refent.origin, or.origin);
	vec3.set(refent.axis[0], or.axis[0]);
	vec3.set(refent.axis[1], or.axis[1]);
	vec3.set(refent.axis[2], or.axis[2]);
	
	var modelMatrix = mat4.create();
	modelMatrix[0] = or.axis[0][0];
	modelMatrix[4] = or.axis[1][0];
	modelMatrix[8] = or.axis[2][0];
	modelMatrix[12] = or.origin[0];

	modelMatrix[1] = or.axis[0][1];
	modelMatrix[5] = or.axis[1][1];
	modelMatrix[9] = or.axis[2][1];
	modelMatrix[13] = or.origin[1];

	modelMatrix[2] = or.axis[0][2];
	modelMatrix[6] = or.axis[1][2];
	modelMatrix[10] = or.axis[2][2];
	modelMatrix[14] = or.origin[2];

	modelMatrix[3] = 0;
	modelMatrix[7] = 0;
	modelMatrix[11] = 0;
	modelMatrix[15] = 1;

	mat4.multiply(re.viewParms.or.modelMatrix, modelMatrix, or.modelMatrix);

	/*// calculate the viewer origin in the model's space
	// needed for fog, specular, and environment mapping
	VectorSubtract( viewParms->or.origin, or->origin, delta );

	// compensate for scale in the axes if necessary
	if ( ent->e.nonNormalizedAxes ) {
		axisLength = VectorLength( ent->e.axis[0] );
		if ( !axisLength ) {
			axisLength = 0;
		} else {
			axisLength = 1.0f / axisLength;
		}
	} else {
		axisLength = 1.0f;
	}

	or->viewOrigin[0] = DotProduct( delta, or->axis[0] ) * axisLength;
	or->viewOrigin[1] = DotProduct( delta, or->axis[1] ) * axisLength;
	or->viewOrigin[2] = DotProduct( delta, or->axis[2] ) * axisLength;*/
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

	RotateModelMatrixForViewer();
	SetupProjectionMatrix(r_zproj());

	GenerateDrawSurfs();
	SortDrawSurfaces();

	// Initial setup.
	gl.viewport(0, 0, re.viewParms.width, re.viewParms.height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	RenderDrawSurfaces();
	RenderRefEntities();
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
}

function SortDrawSurfaces() {
	RadixSort(re.refdef.drawSurfs, 'sort', re.refdef.numDrawSurfs);
}

function RenderDrawSurfaces() {
	var world = re.world;
	var parms = re.viewParms;
	var refdef = re.refdef;
	var drawSurfs = refdef.drawSurfs;
	var shaders = world.shaders;

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.enable(gl.CULL_FACE);
	gl.depthMask(true);

	// Seconds passed since map was initialized.
	var time = refdef.time / 1000.0;

	// If we have a skybox, render it first.
	if (skyShader) {
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
		gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);

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

	for (var i = 0; i < refdef.numDrawSurfs;) {
		var face = drawSurfs[i].surface;
		var shader = face.shader;
		var glshader = shader.glshader;

		// Find the next unique shader.
		for (var next = i+1; next < refdef.numDrawSurfs; next++) {
			var face2 = drawSurfs[next].surface;

			if (face2.shader.sortedIndex !== face.shader.sortedIndex) {
				break;
			}
		}

		// Bind the surface shader
		SetShader(glshader);
		
		for (var j = 0; j < glshader.stages.length; j++) {
			var stage = glshader.stages[j];

			SetShaderStage(glshader, stage, time);
			BindShaderAttribs(stage.program, parms.or.modelMatrix, parms.projectionMatrix);

			// Render all surfaces with this same shader.
			for (var k = i; k < next; k++) {
				var face2 = drawSurfs[k].surface;
				gl.drawElements(gl.TRIANGLES, face2.meshVertCount, gl.UNSIGNED_SHORT, face2.indexOffset);
			}
		}

		// Move on to the next shader.
		i += next - i;
	}
}

var debugRefEntVerts = [
	// Front face
	-15.0, -15.0,  15.0,
	15.0, -15.0,  15.0,
	15.0,  15.0,  15.0,
	-15.0,  15.0,  15.0,
   
	// Back face
	-15.0, -15.0, -15.0,
	-15.0,  15.0, -15.0,
	15.0,  15.0, -15.0,
	15.0, -15.0, -15.0,
   
	// Top face
	-15.0,  15.0, -15.0,
	-15.0,  15.0,  15.0,
	15.0,  15.0,  15.0,
	15.0,  15.0, -15.0,
   
	// Bottom face
	-15.0, -15.0, -15.0,
	15.0, -15.0, -15.0,
	15.0, -15.0,  15.0,
	-15.0, -15.0,  15.0,
   
	// Right face
	15.0, -15.0, -15.0,
	15.0,  15.0, -15.0,
	15.0,  15.0,  15.0,
	15.0, -15.0,  15.0,
   
	// Left face
	-15.0, -15.0, -15.0,
	-15.0, -15.0,  15.0,
	-15.0,  15.0,  15.0,
	-15.0,  15.0, -15.0
];

var debugRefEntIndexes = [
	0,  1,  2,      0,  2,  3,    // front
	4,  5,  6,      4,  6,  7,    // back
	8,  9,  10,     8,  10, 11,   // top
	12, 13, 14,     12, 14, 15,   // bottom
	16, 17, 18,     16, 18, 19,   // right
	20, 21, 22,     20, 22, 23    // left
]

var debugRefEntVertBuffer;
var debugRefEntIndexBuffer;
var v = '\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n\
	attribute vec3 position; \n\
\n\
	uniform mat4 modelViewMat; \n\
	uniform mat4 projectionMat; \n\
\n\
	void main(void) { \n\
		vec4 worldPosition = modelViewMat * vec4(position, 1.0); \n\
		gl_Position = projectionMat * worldPosition; \n\
	} \n\
';

var f = '\
	void main(void) { \n\
		gl_FragColor = vec4 (0.0, 1.0, 0.0, 1.0);\n\
	} \n\
';
var vs, fs, program;

function RenderRefEntities() {
	gl.disable(gl.BLEND);

	if (!debugRefEntVertBuffer) {
		debugRefEntVertBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, debugRefEntVertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(debugRefEntVerts), gl.STATIC_DRAW);

		debugRefEntIndexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, debugRefEntIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(debugRefEntIndexes), gl.STATIC_DRAW);

		if (!program) {
			vs = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vs, v);
			gl.compileShader(vs);
			
			fs = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fs, f);
			gl.compileShader(fs);

			program = gl.createProgram();
			gl.attachShader(program, vs);
			gl.attachShader(program, fs);
			gl.linkProgram(program);
		}
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, debugRefEntVertBuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, debugRefEntIndexBuffer);

	gl.useProgram(program);

	// Set uniforms
	var uniModelViewMat = gl.getUniformLocation(program, 'modelViewMat');
	var uniProjectionMat = gl.getUniformLocation(program, 'projectionMat');
	gl.uniformMatrix4fv(uniProjectionMat, false, re.viewParms.projectionMatrix);

	// Setup vertex attributes
	var attrPosition = gl.getAttribLocation(program, 'position');
	gl.enableVertexAttribArray(attrPosition);
	gl.vertexAttribPointer(attrPosition, 3, gl.FLOAT, false, 12, 0);

	for (var i = 0; i < re.refdef.numRefEntities; i++) {
		var refent = re.refdef.refEntities[i];

		// Update model view matrix for entity.
		var or = new Orientation();
		RotateModelMatrixForEntity(refent, or);
		gl.uniformMatrix4fv(uniModelViewMat, false, or.modelMatrix);

		gl.drawElements(gl.LINE_LOOP, 36, gl.UNSIGNED_SHORT, 0);
	}
}