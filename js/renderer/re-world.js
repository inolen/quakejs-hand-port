var q3render_vertex_stride = 56;
var q3render_sky_vertex_stride = 20;

var vertexBuffer = null;
var indexBuffer = null;
var indexCount = 0;

var skyboxMat = mat4.create();
var skyboxBuffer = null;
var skyboxIndexBuffer = null;
var skyboxIndexCount;
var skyShader = null;

/**
 * Loading
 */
var world;

function LoadMap(mapName) {
	var map = new Q3Bsp();

	map.Load('../' + Q3W_BASE_FOLDER + '/maps/' + mapName + '.bsp', function () {
		world = new WorldData();

		LoadShaders(map);
		LoadLightmaps(map);
		LoadSurfaces(map);

		BuildSkyboxBuffers();
		BuildWorldBuffers();
	});
}

function BrightnessAdjust(color, factor) {
	var scale = 1.0, temp = 0.0;

	color[0] *= factor;
	color[1] *= factor;
	color[2] *= factor;

	if(color[0] > 255 && (temp = 255/color[0]) < scale) { scale = temp; }
	if(color[1] > 255 && (temp = 255/color[1]) < scale) { scale = temp; }
	if(color[2] > 255 && (temp = 255/color[2]) < scale) { scale = temp; }

	color[0] *= scale;
	color[1] *= scale;
	color[2] *= scale;

	return color;
}

function ColorToVec(color) {
	var r, g, b;

	r = color[0] / 255;
	g = color[1] / 255;
	b = color[2] / 255;

	// normalize by color instead of saturating to white
	if (( r | g | b ) > 1) {
		var max = r > g ? r : g;
		max = max > b ? max : b;
		r /= max;
		g /= max;
		b /= max;
	}

	return [r, g, b, color[3] / 255];
}

function GetCurvePoint3(c0, c1, c2, dist) {
	var b = 1.0 - dist;

	return vec3.add(
		vec3.add(
			vec3.scale(c0, (b*b), [0, 0, 0]),
			vec3.scale(c1, (2*b*dist), [0, 0, 0])
		),
		vec3.scale(c2, (dist*dist), [0, 0, 0])
	);
}

// This is kinda ugly. Clean it up at some point?
function GetCurvePoint2(c0, c1, c2, dist) {
	var b = 1.0 - dist;

	c30 = [c0[0], c0[1], 0];
	c31 = [c1[0], c1[1], 0];
	c32 = [c2[0], c2[1], 0];

	var res = vec3.add(
		vec3.add(
			vec3.scale(c30, (b*b), [0, 0, 0]),
			vec3.scale(c31, (2*b*dist), [0, 0, 0])
		),
		vec3.scale(c32, (dist*dist), [0, 0, 0])
	);

	return [res[0], res[1]];
}

function LoadShaders(map) {
	world.shaders = map.ParseLump(Q3Bsp.LUMP_SHADERS, Q3Bsp.dshader_t);
}

function LoadLightmaps(map) {
	var LIGHTMAP_WIDTH  = 128,
		LIGHTMAP_HEIGHT = 128;

	var lump = map.GetLump(Q3Bsp.LUMP_LIGHTMAPS);
	var lightmapSize = LIGHTMAP_WIDTH * LIGHTMAP_HEIGHT;
	var count = lump.filelen / (lightmapSize*3);
	var data = Struct.readUint8Array(map.GetBuffer(), lump.fileofs, lump.filelen);

	var gridSize = 2;
	while(gridSize * gridSize < count) gridSize *= 2;
	var textureSize = gridSize * LIGHTMAP_WIDTH;

	var xOffset = 0;
	var yOffset = 0;

	world.lightmaps = [];

	for(var i = 0, rgbIdx = 0; i < count; ++i) {
		var elements = new Array(lightmapSize*4);

		for(var j = 0; j < lightmapSize*4; j+=4) {
			var rgb = [ data[rgbIdx++], data[rgbIdx++], data[rgbIdx++] ];

			BrightnessAdjust(rgb, 4.0);

			elements[j] = rgb[0];
			elements[j+1] = rgb[1];
			elements[j+2] = rgb[2];
			elements[j+3] = 255;
		}

		world.lightmaps.push({
			x: xOffset,
			y: yOffset,
			width: LIGHTMAP_WIDTH,
			height: LIGHTMAP_HEIGHT,
			buffer: new Uint8Array(elements),
			texCoords: {
				x: xOffset / textureSize,
				y: yOffset /textureSize,
				xScale: LIGHTMAP_WIDTH / textureSize,
				yScale: LIGHTMAP_HEIGHT / textureSize
			}
		});

		xOffset += LIGHTMAP_WIDTH;

		if (xOffset >= textureSize) {
			yOffset += LIGHTMAP_HEIGHT;
			xOffset = 0;
		}
	}

	CreateImage('*lightmap', world.lightmaps, textureSize, textureSize);
}

function Tesselate(face, verts, meshVerts, level) {
	var off = face.vertex;
	var count = face.vertCount;

	var L1 = level + 1;

	face.vertex = verts.length;
	face.meshVert = meshVerts.length;

	face.vertCount = 0;
	face.meshVertCount = 0;

	for(var py = 0; py < face.size[1]-2; py += 2) {
		for(var px = 0; px < face.size[0]-2; px += 2) {

			var rowOff = (py*face.size[0]);

			// Store control points
			var c0 = verts[off+rowOff+px], c1 = verts[off+rowOff+px+1], c2 = verts[off+rowOff+px+2];
			rowOff += face.size[0];
			var c3 = verts[off+rowOff+px], c4 = verts[off+rowOff+px+1], c5 = verts[off+rowOff+px+2];
			rowOff += face.size[0];
			var c6 = verts[off+rowOff+px], c7 = verts[off+rowOff+px+1], c8 = verts[off+rowOff+px+2];

			var indexOff = face.vertCount;
			face.vertCount += L1 * L1;

			// Tesselate!
			for(var i = 0; i < L1; ++i) {
				var a = i / level;

				var pos = GetCurvePoint3(c0.pos, c3.pos, c6.pos, a);
				var lmCoord = GetCurvePoint2(c0.lmCoord, c3.lmCoord, c6.lmCoord, a);
				var texCoord = GetCurvePoint2(c0.texCoord, c3.texCoord, c6.texCoord, a);
				var color = GetCurvePoint3(c0.color, c3.color, c6.color, a);

				var vert = {
					pos: pos,
					texCoord: texCoord,
					lmCoord: lmCoord,
					color: [color[0], color[1], color[2], 1],
					normal: [0, 0, 1]
				};

				verts.push(vert);
			}

			for(var i = 1; i < L1; i++) {
				var a = i / level;

				var pc0 = GetCurvePoint3(c0.pos, c1.pos, c2.pos, a);
				var pc1 = GetCurvePoint3(c3.pos, c4.pos, c5.pos, a);
				var pc2 = GetCurvePoint3(c6.pos, c7.pos, c8.pos, a);

				var tc0 = GetCurvePoint3(c0.texCoord, c1.texCoord, c2.texCoord, a);
				var tc1 = GetCurvePoint3(c3.texCoord, c4.texCoord, c5.texCoord, a);
				var tc2 = GetCurvePoint3(c6.texCoord, c7.texCoord, c8.texCoord, a);

				var lc0 = GetCurvePoint3(c0.lmCoord, c1.lmCoord, c2.lmCoord, a);
				var lc1 = GetCurvePoint3(c3.lmCoord, c4.lmCoord, c5.lmCoord, a);
				var lc2 = GetCurvePoint3(c6.lmCoord, c7.lmCoord, c8.lmCoord, a);

				var cc0 = GetCurvePoint3(c0.color, c1.color, c2.color, a);
				var cc1 = GetCurvePoint3(c3.color, c4.color, c5.color, a);
				var cc2 = GetCurvePoint3(c6.color, c7.color, c8.color, a);

				for(j = 0; j < L1; j++)
				{
					var b = j / level;

					var pos = GetCurvePoint3(pc0, pc1, pc2, b);
					var texCoord = GetCurvePoint2(tc0, tc1, tc2, b);
					var lmCoord = GetCurvePoint2(lc0, lc1, lc2, b);
					var color = GetCurvePoint3(cc0, cc1, cc2, a);

					var vert = {
						pos: pos,
						texCoord: texCoord,
						lmCoord: lmCoord,
						color: [color[0], color[1], color[2], 1],
						normal: [0, 0, 1]
					};

					verts.push(vert);
				}
			}

			face.meshVertCount += level * level * 6;

			for(var row = 0; row < level; ++row) {
				for(var col = 0; col < level; ++col) {
					meshVerts.push(indexOff + (row + 1) * L1 + col);
					meshVerts.push(indexOff + row * L1 + col);
					meshVerts.push(indexOff + row * L1 + (col+1));

					meshVerts.push(indexOff + (row + 1) * L1 + col);
					meshVerts.push(indexOff + row * L1 + (col+1));
					meshVerts.push(indexOff + (row + 1) * L1 + (col+1));
				}
			}

		}
	}
}

function LoadSurfaces(map) {
	var lightmaps = world.lightmaps;
	var shaders = world.shaders;
	var faces = world.faces = map.ParseLump(Q3Bsp.LUMP_SURFACES, Q3Bsp.dsurface_t);

	// Load verts.
	var verts = world.verts = map.ParseLump(Q3Bsp.LUMP_DRAWVERTS, Q3Bsp.drawVert_t);
	for (var i = 0, length = verts.length; i < length; i++) {
		verts[i].color = ColorToVec(BrightnessAdjust(verts[i].color, 4.0));
	}

	// Load vert indexes.
	var meshVertLump = map.GetLump(Q3Bsp.LUMP_DRAWINDEXES);
	var meshVerts = world.meshVerts = [];
	var idxs = Struct.readUint32Array(map.GetBuffer(), meshVertLump.fileofs, meshVertLump.filelen/4);
	for (var i = 0, length = idxs.length; i < length; i++) {
		meshVerts.push(idxs[i]);
	}

	var processed = new Array(verts.length);

	for (var i = 0; i < faces.length; ++i) {
		var face = faces[i];

		// Tesselate patches.
		if (face.type === 2) {
			Tesselate(face, verts, meshVerts, 5);
		}

		var shader = shaders[face.shader];
		shader.geomType = face.type;

		// Transform lightmap coords to match position in combined texture.
		var lightmap = lightmaps[face.lightmap];

		if (!lightmap) {
			lightmap = lightmaps[0];
		}

		for (var j = 0; j < face.vertCount; j++) {
			var idx = face.vertex + j;

			if (!processed[idx]) {
				var vert = verts[idx];
				vert.lmCoord[0] = (vert.lmCoord[0] * lightmap.texCoords.xScale) + lightmap.texCoords.x;
				vert.lmCoord[1] = (vert.lmCoord[1] * lightmap.texCoords.yScale) + lightmap.texCoords.y;
				processed[idx] = true;
			}
		}

		for (var j = 0; j < face.meshVertCount; j++) {
			var idx = face.vertex + meshVerts[face.meshVert + j];

			if (!processed[idx]) {
				var vert = verts[idx];
				vert.lmCoord[0] = (vert.lmCoord[0] * lightmap.texCoords.xScale) + lightmap.texCoords.x;
				vert.lmCoord[1] = (vert.lmCoord[1] * lightmap.texCoords.yScale) + lightmap.texCoords.y;
				processed[idx] = true;
			}
		}
	}
}

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

function BuildWorldBuffers() {
	var faces = world.faces,
		verts = world.verts,
		meshVerts = world.meshVerts,
		shaders = world.shaders,
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

/**
 * Helper functions to bind attributes to vertex arrays.
 */
function BindShaderAttribs(shader, modelViewMat, projectionMat) {
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

function BindSkyAttribs(shader, modelViewMat, projectionMat) {
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

/**
 *
 */
function RecursiveWorldNode(nodes) {
}

function AddWorldSurfaces(map) {
	RecursiveWorldNode(nodes);
}

var startTime = Date.now();
function RenderWorld(modelViewMat, projectionMat) {
	if (vertexBuffer === null || indexBuffer === null) { return; } // Not ready to draw yet

	// Seconds passed since map was initialized
	var time = (Date.now() - startTime)/1000.0;
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
			BindSkyAttribs(stage.program, modelViewMat, projectionMat);

			// Draw all geometry that uses this textures
			gl.drawElements(gl.TRIANGLES, skyboxIndexCount, gl.UNSIGNED_SHORT, 0);
		}
	}

	// Map Geometry buffers
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	
	for (var i = 0; i < world.shaders.length; i++) {
		var shader = world.shaders[i];

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
			BindShaderAttribs(stage.program, modelViewMat, projectionMat);
			gl.drawElements(gl.TRIANGLES, shader.elementCount, gl.UNSIGNED_SHORT, shader.indexOffset);
		}
	}
}