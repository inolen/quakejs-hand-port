function LoadMap(mapName) {
	var map = new Q3Bsp();

	map.Load('../' + Q3W_BASE_FOLDER + '/maps/' + mapName + '.bsp', function () {
		re.world = new WorldData();

		LoadShaders(map);
		LoadLightmaps(map);
		LoadSurfaces(map);
		LoadPlanes(map);
		LoadNodesAndLeafs(map);
		LoadVisibility(map);

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

function ShaderForShaderNum(shaderNum, lightmapNum) {
	var shaders = re.world.shaders;
	if (shaderNum < 0 || shaderNum >= shaders.length) {
		throw new Error('ShaderForShaderNum: bad num ' + shaderNum);
	}
	var dsh = shaders[shaderNum];
	var shader = FindShader(dsh.shaderName, lightmapNum);

	return shader;
}
function LoadShaders(map) {
	re.world.shaders = map.ParseLump(Q3Bsp.Lumps.LUMP_SHADERS, Q3Bsp.dshader_t);
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

	re.world.lightmaps = [];

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

		re.world.lightmaps.push({
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

	CreateImage('*lightmap', re.world.lightmaps, textureSize, textureSize);
}

function ParseMesh(face, level) {
	var verts = re.world.verts;
	var meshVerts = re.world.meshVerts;
	
	var points = verts.slice(face.vertex, face.vertex + face.vertCount);
	var grid = SubdividePatchToGrid(points, face.patchWidth, face.patchHeight, level);

	// Append the grid's verts to the world.
	face.vertex = verts.length;
	face.vertCount = grid.verts.length;
	verts.push.apply(verts, grid.verts);

	// Triangulate and append indices for the new verts to the world.
	face.meshVert = meshVerts.length;
	face.meshVertCount = (grid.width-1) * (grid.height-1) * 6;

	for (var j = 0; j < grid.height-1; j++) {
		for (var i = 0; i < grid.width-1; i++) {
			var v1 = j*grid.width + i+1;
			var v2 = v1 - 1;
			var v3 = v2 + grid.width;
			var v4 = v3 + 1;
			
			meshVerts.push(v2);
			meshVerts.push(v3);
			meshVerts.push(v1);
				
			meshVerts.push(v1);
			meshVerts.push(v3);
			meshVerts.push(v4);
		}
	}
}

function LoadSurfaces(map) {
	var lightmaps = re.world.lightmaps;
	var shaders = re.world.shaders;
	var faces = re.world.faces = map.ParseLump(Q3Bsp.Lumps.LUMP_SURFACES, Q3Bsp.dsurface_t);

	// Load verts.
	var verts = re.world.verts = map.ParseLump(Q3Bsp.Lumps.LUMP_DRAWVERTS, Q3Bsp.drawVert_t);
	for (var i = 0, length = verts.length; i < length; i++) {
		verts[i].color = ColorToVec(BrightnessAdjust(verts[i].color, 4.0));
	}

	// Load vert indexes.
	var meshVertLump = map.GetLump(Q3Bsp.Lumps.LUMP_DRAWINDEXES);
	var meshVerts = re.world.meshVerts = [];
	var idxs = Struct.readUint32Array(map.GetBuffer(), meshVertLump.fileofs, meshVertLump.filelen/4);
	for (var i = 0, length = idxs.length; i < length; i++) {
		meshVerts.push(idxs[i]);
	}

	var processed = new Array(verts.length);

	for (var i = 0; i < faces.length; i++) {
		var face = faces[i];

		// Tesselate patches.
		if (face.type === Q3Bsp.SurfaceTypes.MST_PATCH) {
			ParseMesh(face, r_subdivisions());
		}

		face.shader = ShaderForShaderNum(face.shader, face.type === Q3Bsp.SurfaceTypes.MST_TRIANGLE_SOUP ? LIGHTMAP_BY_VERTEX : LIGHTMAP_2D);
		face.shader.geomType = face.type;

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

function LoadPlanes(map) {
	var planes = re.world.planes = map.ParseLump(Q3Bsp.Lumps.LUMP_PLANES, Q3Bsp.dplane_t);

	for (var i = 0; i < planes.length; i++) {
		var plane = planes[i];
		var bits = 0;

		for (var j = 0; j < 3; j++) {
			if (plane.normal[j] < 0) {
				bits |= 1 << j;
			}
		}

		plane.type = PlaneTypeForNormal(plane.normal);
		plane.signbits = bits;
	}
}

function LoadNodesAndLeafs(map) {
	var world = re.world;
	var planes = world.planes;

	var setParent_r = function (node, parent) {
		node.parent = parent;
		if (!node.children) {
			return;
		}
		setParent_r(node.children[0], node);
		setParent_r(node.children[1], node);
	};

	// load leaf surfaces
	var leafSurfacesLump = map.GetLump(Q3Bsp.Lumps.LUMP_LEAFSURFACES);
	var leafSurfaces = world.leafSurfaces = Struct.readUint32Array(map.GetBuffer(), leafSurfacesLump.fileofs, leafSurfacesLump.filelen/4);

	// TODO Factor out this concat.
	var nodes = map.ParseLump(Q3Bsp.Lumps.LUMP_NODES, Q3Bsp.dnode_t);
	var leafs = map.ParseLump(Q3Bsp.Lumps.LUMP_LEAFS, Q3Bsp.dleaf_t);
	var allNodes = world.nodes = nodes.concat(leafs);

	// load nodes
	for (var i = 0, numNodes = nodes.length; i < numNodes; i++) {
		var node = allNodes[i];
	
		node.plane = planes[node.planeNum];

		node.children = new Array(2);
		for (var j = 0; j < 2; j++) {
			var p = node.childrenNum[j];

			if (p >= 0) {
				node.children[j] = allNodes[p];
			} else {
				node.children[j] =  allNodes[numNodes + (-1 - p)];
			}
		}
	}

	// load leafs
	for (var i = numNodes, numLeafs = leafs.length; i < numNodes + numLeafs; i++) {
		var leaf = allNodes[i];

		if (leaf.cluster >= world.numClusters ) {
			world.numClusters = leaf.cluster + 1;
		}
	}

	// chain decendants
	setParent_r(allNodes[0], null);
}

function LoadVisibility(map) {
	var world = re.world;
	var lump = map.GetLump(Q3Bsp.Lumps.LUMP_VISIBILITY);
	world.numClusters = Struct.readUint32Array(map.GetBuffer(), lump.fileofs, 1)[0];
	world.clusterBytes = Struct.readUint32Array(map.GetBuffer(), lump.fileofs + 4, 1)[0];
	world.vis = Struct.readUint8Array(map.GetBuffer(), lump.fileofs + 8, world.numClusters * world.clusterBytes);
}