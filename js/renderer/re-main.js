var q3render_vertex_stride = 56;
var q3render_sky_vertex_stride = 20;

var lightmapTexture;

var vertexBuffer = null;
var indexBuffer = null;
var indexCount = 0;

var skyboxMat = mat4.create();
var skyboxBuffer = null;
var skyboxIndexBuffer = null;
var skyboxIndexCount;
var skyShader = null;

var startTime = new Date().getTime();

var canvas, gl;
var refdef;
var map;

var flipMatrix = mat4.create([
	0, 0, -1, 0,
	-1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 0, 1
]);

/**
 * Helper functions to bind attributes to vertex arrays.
 */
function _bindShaderAttribs(shader, modelViewMat, projectionMat) {
	// Set uniforms
	gl.uniformMatrix4fv(shader.uniform.modelViewMat, false, modelViewMat);
	gl.uniformMatrix4fv(shader.uniform.projectionMat, false, projectionMat);

	// Setup vertex attributes
	gl.enableVertexAttribArray(shader.attrib.position);
	gl.vertexAttribPointer(shader.attrib.position, 3, gl.FLOAT, false, q3render_vertex_stride, 0);

	if(shader.attrib.texCoord !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.texCoord);
		gl.vertexAttribPointer(shader.attrib.texCoord, 2, gl.FLOAT, false, q3render_vertex_stride, 3*4);
	}

	if(shader.attrib.lightCoord !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.lightCoord);
		gl.vertexAttribPointer(shader.attrib.lightCoord, 2, gl.FLOAT, false, q3render_vertex_stride, 5*4);
	}

	if(shader.attrib.normal !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.normal);
		gl.vertexAttribPointer(shader.attrib.normal, 3, gl.FLOAT, false, q3render_vertex_stride, 7*4);
	}

	if(shader.attrib.color !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.color);
		gl.vertexAttribPointer(shader.attrib.color, 4, gl.FLOAT, false, q3render_vertex_stride, 10*4);
	}
}

function _bindSkyAttribs(shader, modelViewMat, projectionMat) {
	mat4.set(modelViewMat, skyboxMat);

	// Clear out the translation components
	skyboxMat[12] = 0;
	skyboxMat[13] = 0;
	skyboxMat[14] = 0;

	// Set uniforms
	gl.uniformMatrix4fv(shader.uniform.modelViewMat, false, skyboxMat);
	gl.uniformMatrix4fv(shader.uniform.projectionMat, false, projectionMat);

	// Setup vertex attributes
	gl.enableVertexAttribArray(shader.attrib.position);
	gl.vertexAttribPointer(shader.attrib.position, 3, gl.FLOAT, false, q3render_sky_vertex_stride, 0);

	if(shader.attrib.texCoord !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.texCoord);
		gl.vertexAttribPointer(shader.attrib.texCoord, 2, gl.FLOAT, false, q3render_sky_vertex_stride, 3*4);
	}
}

function Init(canvasCtx, glCtx) {
	canvas = canvasCtx;
	gl = glCtx;
	refdef = new RefDef();
	// TODO: Make this a typed array
	//this.refdef.drawSurfs = new Array(MAX_DRAWSURFS);

	InitImages();
	InitShaders();
	BuildSkyboxBuffers();
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
	mat4.perspective(parms.fov, parms.width/parms.height, 1.0, 1024.0, projectionMatrix);

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
	gl.clearColor(0.0, 1.0, 0.0, 1.0);
	gl.clearDepth(1.0);

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.enable(gl.CULL_FACE);

	// Clear back buffer but not color buffer (we expect the entire scene to be overwritten)
	gl.depthMask(true);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	GenerateDrawSurfs();
	DrawWorld(modelMatrix, projectionMatrix);
}

function LoadMap(mapName) {
	var self = this;
	map = new Q3Bsp();

	map.load('../' + Q3W_BASE_FOLDER + '/maps/' + mapName + '.bsp', function () {
		LoadLightmaps();
		BuildWorldBuffers();
	});
}

// TODO: REFACTOR!!
function BuildSkyboxBuffers() {
	var skyVerts = [
		-128, 128, 128, 0, 0,
		128, 128, 128, 1, 0,
		-128, -128, 128, 0, 1,
		128, -128, 128, 1, 1,

		-128, 128, 128, 0, 1,
		128, 128, 128, 1, 1,
		-128, 128, -128, 0, 0,
		128, 128, -128, 1, 0,

		-128, -128, 128, 0, 0,
		128, -128, 128, 1, 0,
		-128, -128, -128, 0, 1,
		128, -128, -128, 1, 1,

		128, 128, 128, 0, 0,
		128, -128, 128, 0, 1,
		128, 128, -128, 1, 0,
		128, -128, -128, 1, 1,

		-128, 128, 128, 1, 0,
		-128, -128, 128, 1, 1,
		-128, 128, -128, 0, 0,
		-128, -128, -128, 0, 1
	];

	var skyIndices = [
		0, 1, 2,
		1, 2, 3,

		4, 5, 6,
		5, 6, 7,

		8, 9, 10,
		9, 10, 11,

		12, 13, 14,
		13, 14, 15,

		16, 17, 18,
		17, 18, 19
	];

	skyboxBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyVerts), gl.STATIC_DRAW);

	skyboxIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(skyIndices), gl.STATIC_DRAW);

	skyboxIndexCount = skyIndices.length;
}

function LoadLightmaps() {
	// TODO: Export this from Q3Bsp
	var lightmaps = map.data.lightmaps;
	var gridSize = 2;
	while(gridSize * gridSize < lightmaps.length) gridSize *= 2;
	var textureSize = gridSize * 128;

	// TODO: Refactor this to use r-image.js better
	lightmapTexture = CreateImage('*lightmap', null, textureSize, textureSize);

	for (var i = 0; i < lightmaps.length; ++i) {
		var lightmap = lightmaps[i];

		gl.texSubImage2D(
			gl.TEXTURE_2D, 0, lightmap.x, lightmap.y, lightmap.width, lightmap.height,
			gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(lightmap.bytes)
		);
	}
}

function BuildWorldBuffers() {
	var faces = map.data.faces,
		verts = map.data.verts,
		meshVerts = map.data.meshVerts,
		shaders = map.data.shaders,
		facesForShader = new Array(shaders.length);

	// Add faces to the appropriate texture face list.
	for (var i = 0; i < faces.length; ++i) {
		var face = faces[i];

		if (face.type !== 1 && face.type !==2 && face.type !== 3) {
			continue;
		}

		var shader = shaders[face.shader];
		if (!facesForShader[face.shader]) {
			facesForShader[face.shader] = [];
		}
		facesForShader[face.shader].push(face);
	}

	// Compile vert list
	var vertices = new Array(verts.length*10);
	var offset = 0;
	for (var i = 0; i < verts.length; ++i) {
		var vert = verts[i];

		vertices[offset++] = vert.pos[0];
		vertices[offset++] = vert.pos[1];
		vertices[offset++] = vert.pos[2];

		vertices[offset++] = vert.texCoord[0];
		vertices[offset++] = vert.texCoord[1];

		vertices[offset++] = vert.lmCoord[0];
		vertices[offset++] = vert.lmCoord[1];

		vertices[offset++] = vert.normal[0];
		vertices[offset++] = vert.normal[1];
		vertices[offset++] = vert.normal[2];

		vertices[offset++] = vert.color[0];
		vertices[offset++] = vert.color[1];
		vertices[offset++] = vert.color[2];
		vertices[offset++] = vert.color[3];
	}

	// Compile index list
	var indices = new Array();
	for(var i = 0; i < shaders.length; ++i) {
		var shader = shaders[i],
			shaderFaces = facesForShader[i];

		if (!shaderFaces || !shaderFaces.length) {
			continue;
		}

		shader.indexOffset = indices.length * 2; // Offset is in bytes

		for (var j = 0; j < shaderFaces.length; ++j) {
			var face = shaderFaces[j];
			face.indexOffset = indices.length * 2;
			for(var k = 0; k < face.meshVertCount; ++k) {
				indices.push(face.vertex + meshVerts[face.meshVert + k]);
			}
			shader.elementCount += face.meshVertCount;
		}
	}

	vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	indexCount = indices.length;
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

function DrawWorld(modelViewMat, projectionMat) {
	if (vertexBuffer === null || indexBuffer === null) { return; } // Not ready to draw yet

	// Seconds passed since map was initialized
	var time = (new Date().getTime() - startTime)/1000.0;
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
			_bindSkyAttribs(stage.program, modelViewMat, projectionMat);

			// Draw all geometry that uses this textures
			gl.drawElements(gl.TRIANGLES, skyboxIndexCount, gl.UNSIGNED_SHORT, 0);
		}
	}

	// Map Geometry buffers
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	
	for (var i = 0; i < map.data.shaders.length; i++) {
		var shader = map.data.shaders[i];

		if (!shader.elementCount || !shader.visible) {
			continue;
		}

		// Bind the surface shader
		var glshader = shader.glshader || FindShader(shader.shaderName);

		// Store off sky shader.
		if (glshader.sky) {
			skyShader = glshader;
		}
	
		SetShader(glshader);

		for (var j = 0; j < glshader.stages.length; j++) {
			var stage = glshader.stages[j];

			SetShaderStage(glshader, stage, time);
			_bindShaderAttribs(stage.program, modelViewMat, projectionMat);
			gl.drawElements(gl.TRIANGLES, shader.elementCount, gl.UNSIGNED_SHORT, shader.indexOffset);
		}
	}
}