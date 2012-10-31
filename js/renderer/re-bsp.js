/**
 * LoadMap
 */
function LoadMap(mapName, callback) {
	re.world = new WorldData();

	console.log('Loading render map for ' + mapName);

	sys.ReadFile('maps/' + mapName + '.bsp', 'binary', function (err, data) {
		if (err) throw err;
		
		var bb = new ByteBuffer(data, ByteBuffer.LITTLE_ENDIAN);

		// Parse the header.
		var header = new dheader_t();
		header.ident = bb.readASCIIString(4);
		header.version = bb.readInt();
		for (var i = 0; i < Lumps.NUM_LUMPS; i++) {
			header.lumps[i].fileofs = bb.readInt();
			header.lumps[i].filelen = bb.readInt();
		}

		if (header.ident !== 'IBSP' && header.version !== 46) {
			return;
		}

		// Parse the remaining lumps.
		LoadShaders(data, header.lumps[Lumps.SHADERS]);
		LoadLightmaps(data, header.lumps[Lumps.LIGHTMAPS]);
		LoadSurfaces(data,
			header.lumps[Lumps.SURFACES],
			header.lumps[Lumps.DRAWVERTS],
			header.lumps[Lumps.DRAWINDEXES]);
		LoadPlanes(data, header.lumps[Lumps.PLANES]);
		LoadNodesAndLeafs(data,
			header.lumps[Lumps.NODES],
			header.lumps[Lumps.LEAFS],
			header.lumps[Lumps.LEAFSURFACES]);
		LoadVisibility(data, header.lumps[Lumps.VISIBILITY]);
		LoadSubmodels(data, header.lumps[Lumps.MODELS]);
		LoadLightGrid(data, header.lumps[Lumps.LIGHTGRID]);

		BuildWorldBuffers();

		if (callback) {
			callback();
		}
	});
}

/**
 * BrightnessAdjust
 */
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

/**
 * ColorToVec
 */
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

/**
 * ShaderForShaderNum
 */
function ShaderForShaderNum(shaderNum, lightmapNum) {
	var shaders = re.world.shaders;
	if (shaderNum < 0 || shaderNum >= shaders.length) {
		throw new Error('ShaderForShaderNum: bad num ' + shaderNum);
	}
	var dsh = shaders[shaderNum];
	var shader = FindShader(dsh.shaderName, lightmapNum);

	return shader;
}

/**
 * LoadShaders
 */
function LoadShaders(buffer, shaderLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = shaderLump.fileofs;

	var shaders = re.world.shaders = new Array(shaderLump.filelen / dshader_t.size);

	for (var i = 0; i < shaders.length; i++) {
		var shader = shaders[i] = new dshader_t();

		shader.shaderName = bb.readASCIIString(MAX_QPATH);
		shader.flags = bb.readInt();
		shader.contents = bb.readInt();
	}
}

/**
 * LoadLightmaps
 */
function LoadLightmaps(buffer, lightmapLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lightmapLump.fileofs;

	var LIGHTMAP_WIDTH  = 128;
	var LIGHTMAP_HEIGHT = 128;
	var lightmapSize = LIGHTMAP_WIDTH * LIGHTMAP_HEIGHT;
	var count = lightmapLump.filelen / (lightmapSize*3);

	var gridSize = 2;
	while(gridSize * gridSize < count) gridSize *= 2;
	var textureSize = gridSize * LIGHTMAP_WIDTH;

	var xOffset = 0;
	var yOffset = 0;

	re.world.lightmaps = [];

	for(var i = 0; i < count; ++i) {
		var elements = new Array(lightmapSize*4);

		for(var j = 0; j < lightmapSize*4; j+=4) {
			var rgb = [
				bb.readUnsignedByte(),
				bb.readUnsignedByte(),
				bb.readUnsignedByte()
			];

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

	re.lightmapTexture = CreateImage('*lightmap', re.world.lightmaps, textureSize, textureSize);
}

/**
 * LoadSurfaces
 */
function LoadSurfaces(buffer, faceLump, vertLump, meshVertLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	// Load verts.
	bb.index = vertLump.fileofs;

	var verts = re.world.verts = new Array(vertLump.filelen / drawVert_t.size);

	for (var i = 0; i < verts.length; i++) {
		var vert = verts[i] = new drawVert_t();

		vert.pos = [bb.readFloat(), bb.readFloat(), bb.readFloat()];
		vert.texCoord = [bb.readFloat(), bb.readFloat()];
		vert.lmCoord = [bb.readFloat(), bb.readFloat()];
		vert.normal = [bb.readFloat(), bb.readFloat(), bb.readFloat()];
		vert.color = [
			bb.readUnsignedByte(), bb.readUnsignedByte(),
			bb.readUnsignedByte(), bb.readUnsignedByte()
		];

		vert.color = ColorToVec(BrightnessAdjust(vert.color, 4.0));
	}

	// Load vert indexes.
	bb.index = meshVertLump.fileofs;

	var meshVerts = re.world.meshVerts = new Array(meshVertLump.filelen / 4);

	for (var i = 0; i < meshVerts.length; i++) {
		meshVerts[i] = bb.readInt();
	}

	// Load surfaces.
	bb.index = faceLump.fileofs;

	var faces = re.world.faces = new Array(faceLump.filelen / dsurface_t.size);

	for (var i = 0; i < faces.length; i++) {
		var face = faces[i] = new msurface_t();

		// Read the source data into temp variabesl.
		var dface = new dsurface_t();

		dface.shaderNum = bb.readInt();
		dface.fogNum = bb.readInt();
		dface.surfaceType = bb.readInt();
		dface.vertex = bb.readInt();
		dface.vertCount = bb.readInt();
		dface.meshVert = bb.readInt();
		dface.meshVertCount = bb.readInt();
		dface.lightmapNum = bb.readInt();
		dface.lmStart = [bb.readInt(), bb.readInt()];
		dface.lmSize = [bb.readInt(), bb.readInt()];
		dface.lmOrigin = [bb.readFloat(), bb.readFloat(), bb.readFloat()];
		dface.lmVecs = [
			[bb.readFloat(), bb.readFloat(), bb.readFloat()],
			[bb.readFloat(), bb.readFloat(), bb.readFloat()],
			[bb.readFloat(), bb.readFloat(), bb.readFloat()]
		];
		dface.patchWidth = bb.readInt();
		dface.patchHeight = bb.readInt();

		// Setup our in-memory representation.
		face.surfaceType = SurfaceType.FACE;
		face.shader = ShaderForShaderNum(dface.shaderNum, dface.lightmapNum);
		face.fogIndex = dface.fogNum + 1;
		face.vertex = dface.vertex;
		face.vertCount = dface.vertCount;
		face.meshVert = dface.meshVert;
		face.meshVertCount = dface.meshVertCount;
		face.lightmapNum = dface.lightmapNum;
		face.patchWidth = dface.patchWidth;
		face.patchHeight = dface.patchHeight;

		if (dface.surfaceType === MapSurfaceType.PATCH) {
			ParseMesh(dface, face, r_subdivisions());
		} else if (dface.surfaceType === MapSurfaceType.PLANAR) {
			ParseFace(dface, face);
		}
	}

	// Transform lightmap coords to match position in combined texture.
	var lightmaps = re.world.lightmaps;
	var processed = new Array(verts.length);

	for (var i = 0; i < faces.length; i++) {
		var face = faces[i];
		var lightmap = lightmaps[face.lightmapNum];

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

/**
 * ParseMesh
 */
function ParseMesh(dface, face, level) {
	var verts = re.world.verts;
	var meshVerts = re.world.meshVerts;
	var points = verts.slice(face.vertex, face.vertex + face.vertCount);
	var grid = SubdividePatchToGrid(points, face.patchWidth, face.patchHeight, level);

	face.surfaceType = SurfaceType.GRID;

	// Start at the end of the current vert array.
	face.vertex = verts.length;
	face.vertCount = grid.verts.length;

	face.meshVert = meshVerts.length;
	face.meshVertCount = (grid.width-1) * (grid.height-1) * 6;

	// Append the grid's verts to the world.
	verts.push.apply(verts, grid.verts);

	// Triangulate the indexes and append to the world.
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

/**
 * ParseFace
 */
function ParseFace(dface, face) {
	var verts = re.world.verts;

	face.surfaceType = SurfaceType.FACE;

	// Take the plane information from the lightmap vector
	face.plane.normal = vec3.create(dface.lmVecs[2]);
	face.plane.dist = vec3.dot(verts[face.vertex].pos, face.plane.normal);
	face.plane.signbits = GetPlaneSignbits(face.plane);
	face.plane.type = PlaneTypeForNormal(face.plane.normal);
}

/**
 * LoadPlanes
 */
function LoadPlanes(buffer, planeLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = planeLump.fileofs;

	var planes = re.world.planes = new Array(planeLump.filelen / dplane_t.size);

	for (var i = 0; i < planes.length; i++) {
		var plane = planes[i] = new Plane();

		plane.normal = [bb.readFloat(), bb.readFloat(), bb.readFloat()];
		plane.dist = bb.readFloat();
		plane.signbits = GetPlaneSignbits(plane);
		plane.type = PlaneTypeForNormal(plane.normal);
	}
}

/**
 * LoadNodesAndLeafs
 */
function LoadNodesAndLeafs(buffer, nodeLump, leafLump, leafSurfacesLump) {
	var world = re.world;
	var planes = world.planes;
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	var setParent_r = function (node, parent) {
		node.parent = parent;
		if (!node.children) {
			return;
		}
		setParent_r(node.children[0], node);
		setParent_r(node.children[1], node);
	};

	var numNodes = nodeLump.filelen / dnode_t.size;
	var numLeafs = leafLump.filelen / dleaf_t.size;
	var allNodes = world.nodes = new Array(numNodes + numLeafs);

	// Go ahead and create node / leaf objects so we can wire up
	// the children references.	
	for (var i = 0; i < numNodes; i++) {
		allNodes[i] = new mnode_t();
	}
	for (var i = numNodes; i < numNodes + numLeafs; i++) {
		allNodes[i] = new mleaf_t();
	}

	// Load leaf surfaces.
	bb.index = leafSurfacesLump.fileofs;

	var leafSurfaces = re.world.leafSurfaces = new Array(leafSurfacesLump.filelen / 4);
	for (var i = 0; i < leafSurfaces.length; i++) {
		leafSurfaces[i] = bb.readInt();
	}

	// Load nodes.
	bb.index = nodeLump.fileofs;

	for (var i = 0; i < numNodes; i++) {
		var node = allNodes[i];
		
		var planeNum = bb.readInt();
		var childrenNum = [bb.readInt(), bb.readInt()];
		var mins = [bb.readInt(), bb.readInt(), bb.readInt()];
		var maxs = [bb.readInt(), bb.readInt(), bb.readInt()];

		node.plane = planes[planeNum];
		node.children = new Array(2);
		for (var j = 0; j < 2; j++) {
			var p = childrenNum[j];

			if (p >= 0) {
				node.children[j] = allNodes[p];
			} else {
				node.children[j] = allNodes[numNodes + (-1 - p)];
			}
		}
		vec3.set(mins, node.mins);
		vec3.set(maxs, node.maxs);
	}

	// Load leafs.
	bb.index = leafLump.fileofs;

	for (var i = numNodes; i < numNodes + numLeafs; i++) {
		var leaf = allNodes[i];

		leaf.cluster = bb.readInt();
		leaf.area = bb.readInt();
		leaf.mins = [bb.readInt(), bb.readInt(), bb.readInt()];
		leaf.maxs = [bb.readInt(), bb.readInt(), bb.readInt()];
		leaf.firstLeafSurface = bb.readInt();
		leaf.numLeafSurfaces = bb.readInt();
		leaf.firstLeafBrush = bb.readInt();
		leaf.numLeafBrushes = bb.readInt();

		if (leaf.cluster >= world.numClusters ) {
			world.numClusters = leaf.cluster + 1;
		}
	}

	// chain decendants
	setParent_r(allNodes[0], null);
}

/**
 * LoadVisibility
 */
function LoadVisibility(buffer, visLump) {
	var world = re.world;
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = visLump.fileofs;

	world.numClusters = bb.readInt();
	world.clusterBytes = bb.readInt();

	var vissize = world.numClusters * world.clusterBytes;
	world.vis = new Uint8Array(vissize);

	for (var i = 0; i < vissize; i++) {
		world.vis[i] = bb.readUnsignedByte();
	}
}

/**
 * LoadSubmodels
 */
function LoadSubmodels(buffer, modelLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = modelLump.fileofs;

	var models = re.world.bmodels = new Array(modelLump.filelen / dmodel_t.size);

	for (var i = 0; i < models.length; i++) {
		var model = models[i] = new bmodel_t();

		model.bounds[0] = [bb.readFloat(), bb.readFloat(), bb.readFloat()];
		model.bounds[1] = [bb.readFloat(), bb.readFloat(), bb.readFloat()];

		model.firstSurface = bb.readInt();
		model.numSurfaces = bb.readInt();

		bb.readInt(); // firstBrush
		bb.readInt(); // numBrushes
	}
}

/**
 * LoadLightGrid
 */
function LoadLightGrid(buffer, gridLump) {
	var world = re.world;
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = gridLump.fileofs;

	world.lightGridInverseSize[0] = 1 / world.lightGridSize[0];
	world.lightGridInverseSize[1] = 1 / world.lightGridSize[1];
	world.lightGridInverseSize[2] = 1 / world.lightGridSize[2];

	var wMins = world.bmodels[0].bounds[0];
	var wMaxs = world.bmodels[0].bounds[1];

	for (var i = 0; i < 3; i++) {
		world.lightGridOrigin[i] = world.lightGridSize[i] * Math.ceil(wMins[i] / world.lightGridSize[i]);
		var t = world.lightGridSize[i] * Math.floor(wMaxs[i] / world.lightGridSize[i]);
		world.lightGridBounds[i] = (t - world.lightGridOrigin[i])/world.lightGridSize[i] + 1;
	}

	var numGridPoints = world.lightGridBounds[0] * world.lightGridBounds[1] * world.lightGridBounds[2];

	if (gridLump.filelen !== numGridPoints * 8 ) {
		throw new Error('WARNING: light grid mismatch');
		world.lightGridData = null;
		return;
	}

	var len = gridLump.filelen;
	world.lightGridData = new Uint8Array(len);
	for (var i = 0; i < len; i++) {
		world.lightGridData[i] = bb.readUnsignedByte();
	}

	// Deal with overbright bits.
	// for ( i = 0 ; i < numGridPoints ; i++ ) {
	// 	R_ColorShiftLightingBytes( &world.lightGridData[i*8], &world.lightGridData[i*8] );
	// 	R_ColorShiftLightingBytes( &world.lightGridData[i*8+3], &world.lightGridData[i*8+3] );
	// }
}