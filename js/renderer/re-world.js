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

function LoadShaders(map) {
	world.shaders = map.ParseLump(Q3Bsp.Lumps.LUMP_SHADERS, Q3Bsp.dshader_t);
}

function LoadLightmaps(map) {
	var LIGHTMAP_WIDTH  = 128,
		LIGHTMAP_HEIGHT = 128;

	var lump = map.GetLump(Q3Bsp.Lumps.LUMP_LIGHTMAPS);
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

// (1–t)^2*P0 + 2*(1–t)*t*P1 + t^2*P2
function GetCurvePoint(c0, c1, c2, t) {
	var result = [];
	var dims = c0.length;

	for (var i = 0; i < dims; i++) {
		result[i] = (Math.pow(1-t, 2)*c0[i]) + (2*(1-t)*t*c1[i]) + (Math.pow(t, 2)*c2[i]);
	}

	return result;
}

function ParseMesh(face, verts, meshVerts, level) {
	var width = face.patchWidth;
	var height = face.patchHeight;
	var firstControlPoint = face.vertex;

	// Build 3x3 biquadtratic bezier patches.
	// http://www.gamedev.net/page/resources/_/technical/math-and-physics/bezier-patches-r1584
	var cp = function (x, y) {
		return verts[firstControlPoint+y*width+x];
	};
	var build3x3 = function (x, y) {
		// Create the new verts.
		for (var j = 0; j <= level; j++) {
			var v = j / level;

			var c = [
				{
					pos:      GetCurvePoint(cp(x,  y).pos,      cp(x,  y+1).pos,      cp(x,  y+2).pos,      v),
					lmCoord:  GetCurvePoint(cp(x,  y).lmCoord,  cp(x,  y+1).lmCoord,  cp(x,  y+2).lmCoord,  v),
					texCoord: GetCurvePoint(cp(x,  y).texCoord, cp(x,  y+1).texCoord, cp(x,  y+2).texCoord, v),
					color:    GetCurvePoint(cp(x,  y).color,    cp(x,  y+1).color,    cp(x,  y+2).color,    v)
				},
				{
					pos:      GetCurvePoint(cp(x+1,y).pos,      cp(x+1,y+1).pos,      cp(x+1,y+2).pos,      v),
					lmCoord:  GetCurvePoint(cp(x+1,y).lmCoord,  cp(x+1,y+1).lmCoord,  cp(x+1,y+2).lmCoord,  v),
					texCoord: GetCurvePoint(cp(x+1,y).texCoord, cp(x+1,y+1).texCoord, cp(x+1,y+2).texCoord, v),
					color:    GetCurvePoint(cp(x+1,y).color,    cp(x+1,y+1).color,    cp(x+1,y+2).color,    v)
				},				
				{
					pos:      GetCurvePoint(cp(x+2,y).pos,      cp(x+2,y+1).pos,      cp(x+2,y+2).pos,      v),
					lmCoord:  GetCurvePoint(cp(x+2,y).lmCoord,  cp(x+2,y+1).lmCoord,  cp(x+2,y+2).lmCoord,  v),
					texCoord: GetCurvePoint(cp(x+2,y).texCoord, cp(x+2,y+1).texCoord, cp(x+2,y+2).texCoord, v),
					color:    GetCurvePoint(cp(x+2,y).color,    cp(x+2,y+1).color,    cp(x+2,y+2).color,    v)
				}
			];

			for (var i = 0; i <= level; i++) {
				var u = i / level;

				var vert = {
					pos:      GetCurvePoint(c[0].pos,      c[1].pos,      c[2].pos,      u),
					lmCoord:  GetCurvePoint(c[0].lmCoord,  c[1].lmCoord,  c[2].lmCoord,  u),
					texCoord: GetCurvePoint(c[0].texCoord, c[1].texCoord, c[2].texCoord, u),
					color:    GetCurvePoint(c[0].color,    c[1].color,    c[2].color,    u),
					normal:   [0, 0, 1]
				};

				verts.push(vert);
			}
		}

		var faceOffset = face.vertCount;
		face.vertCount += (level+1) * (level + 1);
		
		// Add vert indexes.
		for (var j = 0; j < level; j++) {
			for (var i = 0; i < level; i++) {
				// vertex order to be reckognized as tristrips
				var v1 = faceOffset + j*(level+1) + i+1;
				var v2 = v1 - 1;
				var v3 = v2 + (level+1);
				var v4 = v3 + 1;

				meshVerts.push(v2);
				meshVerts.push(v3);
				meshVerts.push(v1);
				
				meshVerts.push(v1);
				meshVerts.push(v3);
				meshVerts.push(v4);
			}
		}

		face.meshVertCount += level * level * 6;
	};

	face.vertex = verts.length;
	face.vertCount = 0;
	face.meshVert = meshVerts.length;
	face.meshVertCount = 0;

	for (var j = 0; j + 2 < height; j += 2) {
		for (var i = 0; i + 2 < width; i += 2) {
			build3x3(i, j);
		}
	}
}

function LoadSurfaces(map) {
	var lightmaps = world.lightmaps;
	var shaders = world.shaders;
	var faces = world.faces = map.ParseLump(Q3Bsp.Lumps.LUMP_SURFACES, Q3Bsp.dsurface_t);

	// Load verts.
	var verts = world.verts = map.ParseLump(Q3Bsp.Lumps.LUMP_DRAWVERTS, Q3Bsp.drawVert_t);
	for (var i = 0, length = verts.length; i < length; i++) {
		verts[i].color = ColorToVec(BrightnessAdjust(verts[i].color, 4.0));
	}

	// Load vert indexes.
	var meshVertLump = map.GetLump(Q3Bsp.Lumps.LUMP_DRAWINDEXES);
	var meshVerts = world.meshVerts = [];
	var idxs = Struct.readUint32Array(map.GetBuffer(), meshVertLump.fileofs, meshVertLump.filelen/4);
	for (var i = 0, length = idxs.length; i < length; i++) {
		meshVerts.push(idxs[i]);
	}

	var processed = new Array(verts.length);

	for (var i = 0; i < faces.length; ++i) {
		var face = faces[i];

		// Tesselate patches.
		if (face.type === Q3Bsp.SurfaceTypes.MST_PATCH) {
			ParseMesh(face, verts, meshVerts, 5);
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
	var vertices = new Array(verts.length*14);
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

		for (var j = 0; j < shaderFaces.length; j++) {
			var face = shaderFaces[j];

			for(var k = 0; k < face.meshVertCount; k++) {
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

var startTime = sys.GetMilliseconds();
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
		#ifdef GL_ES \n\
		precision highp float; \n\
		#endif \n\
	\n\
		void main(void) { \n\
			gl_FragColor = vec4 (0.0, 1.0, 0.0, 1.0);\n\
		} \n\
	';

//var vs, fs, program;

function RenderWorld(modelViewMat, projectionMat) {
	if (vertexBuffer === null || indexBuffer === null) { return; } // Not ready to draw yet

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

	/*if (!program) {
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
	} else {
		for (var i = 0; i < world.faces.length; ++i) {
			var face = world.faces[i];

			if (face.type !== Q3Bsp.SurfaceTypes.MST_PATCH) {
				continue;
			}

			if (!face.vb) {
				var vertices = [];
				for (var i = 0; i < face.vertCount; i++) {
					var vert = world.verts[face.vertex + i];

					vertices.push(vert.pos[0]);
					vertices.push(vert.pos[1]);
					vertices.push(vert.pos[2]);
				}

				face.vb = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, face.vb);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

				var indices = [];
				for(var k = 0; k < face.meshVertCount; k++) {
					indices.push(world.meshVerts[face.meshVert + k]);
				}

				face.ib = gl.createBuffer();
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, face.ib);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
			}

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, face.ib);
			gl.bindBuffer(gl.ARRAY_BUFFER, face.vb);

			gl.useProgram(program);

			// Set uniforms
			var uniModelViewMat = gl.getUniformLocation(program, 'modelViewMat');
			var uniProjectionMat = gl.getUniformLocation(program, 'projectionMat');
			gl.uniformMatrix4fv(uniModelViewMat, false, modelViewMat);
			gl.uniformMatrix4fv(uniProjectionMat, false, projectionMat);

			// Setup vertex attributes
			var attrPosition = gl.getAttribLocation(program, 'position');
			gl.enableVertexAttribArray(attrPosition);
			gl.vertexAttribPointer(attrPosition, 3, gl.FLOAT, false, 12, 0);

			//gl.drawElements(gl.TRIANGLES, face.meshVertCount, gl.UNSIGNED_SHORT, 0);
		}
	}*/
}