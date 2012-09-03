define('common/com-bsp', ['shared/shared'], function (q_shared) {
	var LUMP_ENTITIES     = 0,
		LUMP_SHADERS      = 1,
		LUMP_PLANES       = 2,
		LUMP_NODES        = 3,
		LUMP_LEAFS        = 4,
		LUMP_LEAFSURFACES = 5,
		LUMP_LEAFBRUSHES  = 6,
		LUMP_MODELS       = 7,
		LUMP_BRUSHES      = 8,
		LUMP_BRUSHSIDES   = 9,
		LUMP_DRAWVERTS    = 10,
		LUMP_DRAWINDEXES  = 11,
		LUMP_FOGS         = 12,
		LUMP_SURFACES     = 13,
		LUMP_LIGHTMAPS    = 14,
		LUMP_LIGHTGRID    = 15,
		LUMP_VISIBILITY   = 16,
		HEADER_LUMPS      = 17;

	var LIGHTMAP_WIDTH  = 128,
		LIGHTMAP_HEIGHT = 128;

	var MAX_QPATH = 64;

	var lump_t = Struct.create(
		Struct.int32('fileofs'),
		Struct.int32('filelen')
	);

	var dheader_t = Struct.create(
		Struct.string('ident', 4),
		Struct.int32('version'),
		Struct.array('lumps', lump_t, HEADER_LUMPS)
	);

	var dmodel_t = Struct.create(
		Struct.array('mins', Struct.float32(), 3),
		Struct.array('maxs', Struct.float32(), 3),
		Struct.int32('firstSurface'),
		Struct.int32('numSurfaces'),
		Struct.int32('firstBrush'),
		Struct.int32('numBrushes')
	);

	var dshader_t = Struct.create(
		Struct.string('shaderName', MAX_QPATH),
		Struct.int32('flags'),
		Struct.int32('contents'),
		{
			glShader: { value: null, enumerable: true, configurable: true, writable: true },
			indexOffset: { value: 0, enumerable: true, configurable: true, writable: true },
			elementCount: { value: 0, enumerable: true, configurable: true, writable: true },
			visible: { value: true, enumerable: true, configurable: true, writable: true }
		}
	);

	var dplane_t = Struct.create(
		Struct.array('normal', Struct.float32(), 3),
		Struct.float32('distance')
	);

	var dnode_t = Struct.create(
		Struct.int32('plane'),
		Struct.array('children', Struct.int32(), 2),
		Struct.array('min', Struct.int32(), 3),
		Struct.array('max', Struct.int32(), 3)
	);

	var dleaf_t = Struct.create(
		Struct.int32('cluster'),
		Struct.int32('area'),
		Struct.array('min', Struct.int32(), 3),
		Struct.array('max', Struct.int32(), 3),
		Struct.int32('leafFace'),
		Struct.int32('leafFaceCount'),
		Struct.int32('leafBrush'),
		Struct.int32('leafBrushCount')
	);

	var dbrushside_t = Struct.create(
		Struct.int32('plane'),
		Struct.int32('shader')
	);

	var dbrush_t = Struct.create(
		Struct.int32('brushSide'),
		Struct.int32('brushSideCount'),
		Struct.int32('shader')
	);

	var dfog_t = Struct.create(
		Struct.string('shader', MAX_QPATH),
		Struct.int32('brushNum'),
		Struct.int32('visibleSide')
	);

	var drawVert_t = Struct.create(
		Struct.array('pos', Struct.float32(), 3),
		Struct.array('texCoord', Struct.float32(), 2),
		Struct.array('lmCoord', Struct.float32(), 2),
		Struct.array('normal', Struct.float32(), 3),
		Struct.array('color', Struct.uint8(), 4)
	);

	var dsurface_t = Struct.create(
		Struct.int32('shader'),
		Struct.int32('effect'),
		Struct.int32('type'),
		Struct.int32('vertex'),
		Struct.int32('vertCount'),
		Struct.int32('meshVert'),
		Struct.int32('meshVertCount'),
		Struct.int32('lightmap'),
		Struct.array('lmStart', Struct.int32(), 2),
		Struct.array('lmSize', Struct.int32(), 2),
		Struct.array('lmOrigin', Struct.float32(), 3),
		Struct.array('lmVecs', Struct.float32(), 6),
		Struct.array('normal', Struct.float32(), 3),
		Struct.array('size', Struct.int32(), 2),
		{
			indexOffset: { value: -1, enumerable: true, configurable: true, writable: true }
		}
	);

	var Q3Bsp = function () {
		return {
			_parseLump: function (buffer, lump, struct) {
				return struct.deserialize(buffer, lump.fileofs, lump.filelen/struct.byteLength);
			},

			_parseIndexLump: function (buffer, lump) {
				return Struct.readUint32Array(buffer, lump.fileofs, lump.filelen/4);
			},

			_brightnessAdjust: function (color, factor) {
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
			},

			_brightnessAdjustVertex: function (color, factor) {
				var scale = 1.0, temp = 0.0;

				color[0] *= factor;
				color[1] *= factor;
				color[2] *= factor;

				if(color[0] > 1 && (temp = 1/color[0]) < scale) { scale = temp; }
				if(color[1] > 1 && (temp = 1/color[1]) < scale) { scale = temp; }
				if(color[2] > 1 && (temp = 1/color[2]) < scale) { scale = temp; }

				color[0] *= scale;
				color[1] *= scale;
				color[2] *= scale;

				return color;
			},

			_colorToVec: function (color) {
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
			},

			_getCurvePoint3: function (c0, c1, c2, dist) {
				var b = 1.0 - dist;

				return vec3.add(
					vec3.add(
						vec3.scale(c0, (b*b), [0, 0, 0]),
						vec3.scale(c1, (2*b*dist), [0, 0, 0])
					),
					vec3.scale(c2, (dist*dist), [0, 0, 0])
				);
			},

			// This is kinda ugly. Clean it up at some point?
			_getCurvePoint2: function (c0, c1, c2, dist) {
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
			},

			_parseEntities: function (buffer, lump) {
				var entities = Struct.readString(buffer, lump.fileofs, lump.filelen);

				var elements = {
					targets: {}
				};

				entities.replace(/\{([^}]*)\}/mg, function($0, entitySrc) {
					var entity = {
						classname: 'unknown'
					};
					entitySrc.replace(/"(.+)" "(.+)"$/mg, function($0, key, value) {
						switch(key) {
							case 'origin':
								value.replace(/(.+) (.+) (.+)/, function($0, x, y, z) {
									entity[key] = [
										parseFloat(x),
										parseFloat(y),
										parseFloat(z)
									];
								});
								break;
							case 'angle':
								entity[key] = parseFloat(value);
								break;
							default:
								entity[key] = value;
								break;
						}
					});

					if(entity['targetname']) {
						elements.targets[entity['targetname']] = entity;
					}

					if(!elements[entity.classname]) { elements[entity.classname] = []; }
					elements[entity.classname].push(entity);
				});

				return elements;
			},

			_parseLightmaps: function (buffer, lump) {
				var lightmapSize = LIGHTMAP_WIDTH * LIGHTMAP_HEIGHT;
				var count = lump.filelen / (lightmapSize*3);
				var data = Struct.readUint8Array(buffer, lump.fileofs, lump.filelen);

				var gridSize = 2;
				while(gridSize * gridSize < count) gridSize *= 2;
				var textureSize = gridSize * LIGHTMAP_WIDTH;

				var lightmaps = [];

				var xOffset = 0;
				var yOffset = 0;

				for(var i = 0, rgbIdx = 0; i < count; ++i) {
					var elements = new Array(lightmapSize*4);

					for(var j = 0; j < lightmapSize*4; j+=4) {
						var rgb = [ data[rgbIdx++], data[rgbIdx++], data[rgbIdx++] ];

						this._brightnessAdjust(rgb, 4.0);

						elements[j] = rgb[0];
						elements[j+1] = rgb[1];
						elements[j+2] = rgb[2];
						elements[j+3] = 255;
					}

					lightmaps.push({
						x: xOffset,
						y: yOffset,
						width: LIGHTMAP_WIDTH,
						height: LIGHTMAP_HEIGHT,
						bytes: elements,
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

				return lightmaps;
			},

			_parseVerts: function (buffer, lump) {
				var elements = this._parseLump(buffer, lump, drawVert_t);

				for (var i = 0, length = elements.length; i < length; i++) {
					elements[i].color = this._brightnessAdjustVertex(this._colorToVec(elements[i].color), 4.0);
				}

				return elements;
			},

			_parseMeshVerts: function (buffer, lump) {
				var meshVerts = [];
				var idxs = this._parseIndexLump(buffer, lump);
				for (var i = 0, length = idxs.length; i < length; i++) {
					meshVerts.push(idxs[i]);
				}
				return meshVerts;
			},

			_tesselate: function (face, verts, meshVerts, level) {
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

							var pos = this._getCurvePoint3(c0.pos, c3.pos, c6.pos, a);
							var lmCoord = this._getCurvePoint2(c0.lmCoord, c3.lmCoord, c6.lmCoord, a);
							var texCoord = this._getCurvePoint2(c0.texCoord, c3.texCoord, c6.texCoord, a);
							var color = this._getCurvePoint3(c0.color, c3.color, c6.color, a);

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

							var pc0 = this._getCurvePoint3(c0.pos, c1.pos, c2.pos, a);
							var pc1 = this._getCurvePoint3(c3.pos, c4.pos, c5.pos, a);
							var pc2 = this._getCurvePoint3(c6.pos, c7.pos, c8.pos, a);

							var tc0 = this._getCurvePoint3(c0.texCoord, c1.texCoord, c2.texCoord, a);
							var tc1 = this._getCurvePoint3(c3.texCoord, c4.texCoord, c5.texCoord, a);
							var tc2 = this._getCurvePoint3(c6.texCoord, c7.texCoord, c8.texCoord, a);

							var lc0 = this._getCurvePoint3(c0.lmCoord, c1.lmCoord, c2.lmCoord, a);
							var lc1 = this._getCurvePoint3(c3.lmCoord, c4.lmCoord, c5.lmCoord, a);
							var lc2 = this._getCurvePoint3(c6.lmCoord, c7.lmCoord, c8.lmCoord, a);

							var cc0 = this._getCurvePoint3(c0.color, c1.color, c2.color, a);
							var cc1 = this._getCurvePoint3(c3.color, c4.color, c5.color, a);
							var cc2 = this._getCurvePoint3(c6.color, c7.color, c8.color, a);

							for(j = 0; j < L1; j++)
							{
								var b = j / level;

								var pos = this._getCurvePoint3(pc0, pc1, pc2, b);
								var texCoord = this._getCurvePoint2(tc0, tc1, tc2, b);
								var lmCoord = this._getCurvePoint2(lc0, lc1, lc2, b);
								var color = this._getCurvePoint3(cc0, cc1, cc2, a);

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
			},

			_parseFaces: function (buffer, lump, shaders, lightmaps, verts, meshVerts) {
				var faces = this._parseLump(buffer, lump, dsurface_t),
					processed = new Array(verts.length);

				for (var i = 0; i < faces.length; ++i) {
					var face = faces[i];

					// Tesselate patches.
					if (face.type === 2) {
						this._tesselate(face, verts, meshVerts, 5);
					}

					// TODO: Shader's should honor the face's lightmap index value, not this
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

				return faces;
			},

			_parseVisData: function (buffer, lump) {
				var numClusters = Struct.readUint32Array(buffer, lump.fileofs, 1)[0];
				var clusterBytes = Struct.readUint32Array(buffer, lump.fileofs + 4, 1)[0];

				var elements = Struct.readUint8Array(buffer, lump.fileofs + 8, numClusters * clusterBytes);

				return {
					buffer: elements,
					size: clusterBytes
				};
			},

			_parse: function (buffer, callback) {
				var header = dheader_t.deserialize(buffer, 0, 1)[0];

				if (header.ident != 'IBSP' && header.version != 46) {
					return;
				}

				// Read map entities
				this.data = {};

				this.data.entities = this._parseEntities(buffer, header.lumps[LUMP_ENTITIES]);
				this.data.shaders = this._parseLump(buffer, header.lumps[LUMP_SHADERS], dshader_t);
				this.data.lightmaps = this._parseLightmaps(buffer, header.lumps[LUMP_LIGHTMAPS]);
				this.data.planes = this._parseLump(buffer, header.lumps[LUMP_PLANES], dplane_t);
				this.data.nodes = this._parseLump(buffer, header.lumps[LUMP_NODES], dnode_t);
				this.data.leaves = this._parseLump(buffer, header.lumps[LUMP_LEAFS], dleaf_t);
				this.data.leafFaces = this._parseIndexLump(buffer, header.lumps[LUMP_LEAFSURFACES]);
				this.data.leafBrushes = this._parseIndexLump(buffer, header.lumps[LUMP_LEAFBRUSHES]);
				this.data.brushes = this._parseLump(buffer, header.lumps[LUMP_BRUSHES], dbrush_t);
				this.data.brushSides = this._parseLump(buffer, header.lumps[LUMP_BRUSHSIDES], dbrushside_t);
				this.data.verts = this._parseVerts(buffer, header.lumps[LUMP_DRAWVERTS]);
				this.data.meshVerts = this._parseMeshVerts(buffer, header.lumps[LUMP_DRAWINDEXES]);
				this.data.faces = this._parseFaces(buffer, header.lumps[LUMP_SURFACES], this.data.shaders, this.data.lightmaps, this.data.verts, this.data.meshVerts);
				this.data.visData = this._parseVisData(buffer, header.lumps[LUMP_VISIBILITY]);

				if (callback) {
					callback.apply(this);
				}
			},

			_checkVis: function (visCluster, testCluster) {
				if (visCluster == testCluster || visCluster == -1) { return true; }
				var i = (visCluster * this.data.visData.size) + (testCluster >> 3);
				var visSet = this.data.visData.buffer[i];
				return (visSet & (1 << (testCluster & 7)) !== 0);
			},

			getLeaf: function (pos) {
				var index = 0;

				var node = null;
				var plane = null;
				var distance = 0;

				while (index >= 0) {
					node = this.data.nodes[index];
					plane = this.data.planes[node.plane];
					distance = vec3.dot(plane.normal, pos) - plane.distance;

					if (distance >= 0) {
						index = node.children[0];
					} else {
						index = node.children[1];
					}
				}

				return -(index+1);
			},

			buildVisibleList: function (leafIndex) {
				// Determine visible faces
				if (this.lastLeaf && leafIndex === this.lastLeaf) {
					return;
				}
				this.lastLeaf = leafIndex;

				var curLeaf = this.bspTree.leaves[leafIndex];

				var visibleShaders = new Array(shaders.length);

				for (var i = 0; i < this.data.leaves.length; ++i) {
					var leaf = this.data.leaves[i];
					if (this.checkVis(curLeaf.cluster, leaf.cluster)) {
						for(var j = 0; j < leaf.leafFaceCount; ++j) {
							var face = faces[this.data.leafFaces[[j + leaf.leafFace]]];
							if(face) {
								visibleShaders[face.shader] = true;
							}
						}
					}
				}

				return visibleShaders;
			},

			load: function (url, callback) {
				var self = this;
				var url = '../' + q_shared.Q3W_BASE_FOLDER + '/' + url;
				var request = new XMLHttpRequest();

				request.open('GET', url, true);
				request.responseType = 'arraybuffer';
				request.addEventListener('load', function () {
					self._parse(this.response, callback);
				});
				request.send(null);
			}
		};
	};

	return {
		Q3Bsp: Q3Bsp
	};
});