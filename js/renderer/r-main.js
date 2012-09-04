define('renderer/r-main', ['common/com-defines', 'common/Q3Bsp'], function (q_com_def, Q3Bsp) {
	return function () {
		var q_r = this;

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

		var map;

		/**
		 * Helper functions to bind attributes to vertex arrays.
		 */
		function _bindShaderAttribs(shader, modelViewMat, projectionMat) {
			var gl = q_r.gl;

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
			var gl = q_r.gl;

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
			},

			Init: function (canvas, gl) {
				this.canvas = canvas;
				this.gl = gl;
				this.refdef = Object.create(this.trRefdef_t);
				// TODO: Make this a typed array
				//this.refdef.drawSurfs = new Array(MAX_DRAWSURFS);

				this.InitImages();
				this.InitShaders();
				this.InitGLShaders();
				this.BuildSkyboxBuffers();
			},

			RenderScene: function (fd) {
				var rd = this.refdef;

				rd.x = fd.x;
				rd.y = fd.y
				rd.width = fd.width;
				rd.height = fd.height;
				rd.fov = fd.fov;
				rd.origin = fd.origin;
				rd.angles = fd.angles;

				var parms = Object.create(this.viewParms_t);
				parms.x = fd.x;
				parms.y = fd.y
				parms.width = fd.width;
				parms.height = fd.height;
				parms.fov = fd.fov;
				parms.origin = fd.origin;
				parms.angles = fd.angles;

				this.RenderView(parms);
			},

			RenderView: function (parms) {
				var gl = this.gl;

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

				this.GenerateDrawSurfs();
				this.DrawWorld(modelMatrix, projectionMatrix);
			},

			LoadMap: function (mapName) {
				var self = this;
				map = new Q3Bsp();

				map.load('maps/' + mapName + '.bsp', function () {
					self.LoadLightmaps();
					self.BuildWorldBuffers();
				});
			},

			// TODO: REFACTOR!!
			BuildSkyboxBuffers: function () {
				var gl = this.gl;

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
			},

			LoadLightmaps: function() {
				var gl = this.gl;

				// TODO: Export this from Q3Bsp
				var lightmaps = map.data.lightmaps;
				var gridSize = 2;
				while(gridSize * gridSize < lightmaps.length) gridSize *= 2;
				var textureSize = gridSize * 128;

				// TODO: Refactor this to use r-image.js better
				lightmapTexture = this.CreateImage('*lightmap', null, textureSize, textureSize);

				for (var i = 0; i < lightmaps.length; ++i) {
					var lightmap = lightmaps[i];

					gl.texSubImage2D(
						gl.TEXTURE_2D, 0, lightmap.x, lightmap.y, lightmap.width, lightmap.height,
						gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(lightmap.bytes)
					);
				}
			},

			BuildWorldBuffers: function () {
				var gl = this.gl;

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
			},

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

			GenerateDrawSurfs: function () {
				//q3_r.AddWorldSurfaces(map);
			},

			DrawWorld: function(modelViewMat, projectionMat) {
				var gl = this.gl;

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
					this.SetShader(skyShader);
					for(var j = 0; j < skyShader.stages.length; j++) {
						var stage = skyShader.stages[j];

						this.SetShaderStage(skyShader, stage, time);
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
					var glshader = shader.glshader || this.FindShader(shader.shaderName);

					// Store off sky shader.
					if (glshader.sky) {
						skyShader = glshader;
					}

					this.SetShader(glshader);

					for (var j = 0; j < glshader.stages.length; j++) {
						var stage = glshader.stages[j];

						this.SetShaderStage(glshader, stage, time);
						_bindShaderAttribs(stage.program, modelViewMat, projectionMat);
						gl.drawElements(gl.TRIANGLES, shader.elementCount, gl.UNSIGNED_SHORT, shader.indexOffset);
					}
				}
			}
		};
	};
});