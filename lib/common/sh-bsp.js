/**
 * LoadWorld
 */
function LoadWorld(data) {
	var world = new World();

	var bb = new ByteBuffer(data, ByteBuffer.LITTLE_ENDIAN);

	// Parse the header.
	var header = new dheader_t();
	header.ident = bb.readASCIIString(4);
	header.version = bb.readInt();
	for (var i = 0; i < LUMP.NUM_LUMPS; i++) {
		header.lumps[i].fileofs = bb.readInt();
		header.lumps[i].filelen = bb.readInt();
	}

	if (header.ident !== 'IBSP' && header.version !== 46) {
		return null;
	}

	LoadEntities(world, data, header.lumps[LUMP.ENTITIES]);
	LoadShaders(world, data, header.lumps[LUMP.SHADERS]);
	LoadPlanes(world, data, header.lumps[LUMP.PLANES]);
	LoadNodes(world, data, header.lumps[LUMP.NODES])
	LoadLeafs(world, data, header.lumps[LUMP.LEAFS]);
	LoadLeafSurfaces(world, data, header.lumps[LUMP.LEAFSURFACES]);
	LoadLeafBrushes(world, data, header.lumps[LUMP.LEAFBRUSHES]);
	LoadBrushModels(world, data, header.lumps[LUMP.MODELS]);
	LoadBrushes(world, data, header.lumps[LUMP.BRUSHES]);
	LoadBrushSides(world, data, header.lumps[LUMP.BRUSHSIDES]);
	LoadVerts(world, data, header.lumps[LUMP.DRAWVERTS]);
	LoadIndexes(world, data, header.lumps[LUMP.DRAWINDEXES]);
	LoadFogs(world, data, header.lumps[LUMP.FOGS]);
	LoadSurfaces(world, data, header.lumps[LUMP.SURFACES]);
	LoadLightmaps(world, data, header.lumps[LUMP.LIGHTMAPS]);
	LoadLightGrid(world, data, header.lumps[LUMP.LIGHTGRID]);
	LoadVisibility(world, data, header.lumps[LUMP.VISIBILITY]);

	return world;
}

/**
 * LoadEntities
 */
function LoadEntities(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var entityStr = bb.readASCIIString(lump.filelen);

	var entities = [];

	entityStr.replace(/\{([^}]*)\}/mg, function($0, entitySrc) {
		var entity = {
			classname: 'unknown'
		};

		entitySrc.replace(/"(.+)" "(.+)"$/mg, function($0, key, value) {
			entity[key] = value;
		});

		entities.push(entity);
	});

	// Parse worldspawn.
	var worldspawn = entities[0];
	if (worldspawn.classname !== 'worldspawn') {
		error('Worldspawn isn\'t the first entity');
		return;
	}

	// Check for a different grid size
	if (worldspawn.gridsize) {
		var split = worldspawn.gridsize.split(' ');
		world.lightGridSize[0] = parseFloat(split[0]);
		world.lightGridSize[1] = parseFloat(split[1]);
		world.lightGridSize[2] = parseFloat(split[2]);
	}
}

/**
 * LoadShaders
 */
function LoadShaders(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var shaders = world.shaders = new Array(lump.filelen / dshader_t.size);

	for (var i = 0; i < shaders.length; i++) {
		var shader = shaders[i] = new dshader_t();

		shader.shaderName = bb.readASCIIString(MAX_QPATH);
		shader.surfaceFlags = bb.readInt();
		shader.contents = bb.readInt();
	}
}

/**
 * LoadPlanes
 */
function LoadPlanes(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var planes = world.planes = new Array(lump.filelen / dplane_t.size);

	for (var i = 0; i < planes.length; i++) {
		var plane = planes[i] = new QMath.Plane();

		plane.normal[0] = bb.readFloat();
		plane.normal[1] = bb.readFloat();
		plane.normal[2] = bb.readFloat();
		plane.dist = bb.readFloat();
		plane.signbits = QMath.GetPlaneSignbits(plane.normal);
		plane.type = QMath.PlaneTypeForNormal(plane.normal);
	}
}

/**
 * LoadNodes
 */
function LoadNodes(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var nodes = world.nodes = new Array(lump.filelen / dnode_t.size);

	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i] = new dnode_t();

		node.planeNum = bb.readInt();
		node.childrenNum[0] = bb.readInt();
		node.childrenNum[1] = bb.readInt();
		node.mins[0] = bb.readInt();
		node.mins[1] = bb.readInt();
		node.mins[2] = bb.readInt();
		node.maxs[0] = bb.readInt();
		node.maxs[1] = bb.readInt();
		node.maxs[2] = bb.readInt();
	}
}

/**
 * LoadLeafs
 */
function LoadLeafs(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var leafs = world.leafs = new Array(lump.filelen / dleaf_t.size);

	for (var i = 0; i < leafs.length; i++) {
		var leaf = leafs[i] = new dleaf_t();

		leaf.cluster = bb.readInt();
		leaf.area = bb.readInt();
		leaf.mins[0] = bb.readInt();
		leaf.mins[1] = bb.readInt();
		leaf.mins[2] = bb.readInt();
		leaf.maxs[0] = bb.readInt();
		leaf.maxs[1] = bb.readInt();
		leaf.maxs[2] = bb.readInt();
		leaf.firstLeafSurface = bb.readInt();
		leaf.numLeafSurfaces = bb.readInt();
		leaf.firstLeafBrush = bb.readInt();
		leaf.numLeafBrushes = bb.readInt();
	}
}

/**
 * LoadLeafSurfaces
 */
function LoadLeafSurfaces(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var leafSurfaces = world.leafSurfaces = new Array(lump.filelen / 4);

	for (var i = 0; i < leafSurfaces.length; i++) {
		leafSurfaces[i] = bb.readInt();
	}
}

/**
 * LoadLeafBrushes
 */
function LoadLeafBrushes(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var leafBrushes = world.leafBrushes = new Array(lump.filelen / 4);

	for (var i = 0; i < leafBrushes.length; i++) {
		leafBrushes[i] = bb.readInt();
	}
}

/**
 * LoadBrushModels
 */
function LoadBrushModels(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var models = world.bmodels = new Array(lump.filelen / dmodel_t.size);

	for (var i = 0; i < models.length; i++) {
		var model = models[i] = new dmodel_t();

		model.bounds[0][0] = bb.readFloat();
		model.bounds[0][1] = bb.readFloat();
		model.bounds[0][2] = bb.readFloat();

		model.bounds[1][0] = bb.readFloat();
		model.bounds[1][1] = bb.readFloat();
		model.bounds[1][2] = bb.readFloat();

		model.firstSurface = bb.readInt();
		model.numSurfaces = bb.readInt();
		model.firstBrush = bb.readInt();
		model.numBrushes = bb.readInt();
	}
}

/**
 * LoadBrushes
 */
function LoadBrushes(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var brushes = world.brushes = new Array(lump.filelen / dbrush_t.size);

	for (var i = 0; i < brushes.length; i++) {
		var brush = brushes[i] = new dbrush_t();

		brush.side = bb.readInt();
		brush.numSides = bb.readInt();
		brush.shaderNum = bb.readInt();
	}
}

/**
 * LoadBrushSides
 */
function LoadBrushSides(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var brushSides = world.brushSides = new Array(lump.filelen / dbrushside_t.size);

	for (var i = 0; i < brushSides.length; i++) {
		var side = brushSides[i] = new dbrushside_t();

		side.planeNum = bb.readInt();
		side.shaderNum = bb.readInt();
	}
}

/**
 * LoadVerts
 */
function LoadVerts(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var verts = world.verts = new Array(lump.filelen / drawVert_t.size);

	for (var i = 0; i < verts.length; i++) {
		var vert = verts[i] = new drawVert_t();

		vert.pos[0] = bb.readFloat();
		vert.pos[1] = bb.readFloat();
		vert.pos[2] = bb.readFloat();
		vert.texCoord[0] = bb.readFloat();
		vert.texCoord[1] = bb.readFloat();
		vert.lmCoord[0] = bb.readFloat();
		vert.lmCoord[1] = bb.readFloat();
		vert.normal[0] = bb.readFloat();
		vert.normal[1] = bb.readFloat();
		vert.normal[2] = bb.readFloat();
		vert.color[0] = bb.readUnsignedByte();
		vert.color[1] = bb.readUnsignedByte();
		vert.color[2] = bb.readUnsignedByte();
		vert.color[3] = bb.readUnsignedByte();
	}
}

/**
 * LoadIndexes
 */
function LoadIndexes(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var indexes = world.indexes = new Array(lump.filelen / 4);

	for (var i = 0; i < indexes.length; i++) {
		indexes[i] = bb.readInt();
	}
}

/**
 * LoadFogs
 */
function LoadFogs(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var fogs = world.fogs = new Array(lump.filelen / dfog_t.size);

	for (var i = 0; i < fogs.length; i++) {
		var fog = fogs[i] = new dfog_t();

		fog.shaderName = bb.readASCIIString(MAX_QPATH);
		fog.brushNum = bb.readInt();
		fog.visibleSide = bb.readInt();
	}
}

/**
 * LoadSurfaces
 */
function LoadSurfaces(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	var surfaces = world.surfaces = new Array(lump.filelen / dsurface_t.size);

	for (var i = 0; i < surfaces.length; i++) {
		var surface = surfaces[i] = new dsurface_t();

		surface.shaderNum = bb.readInt();
		surface.fogNum = bb.readInt();
		surface.surfaceType = bb.readInt();
		surface.vertex = bb.readInt();
		surface.vertCount = bb.readInt();
		surface.meshVert = bb.readInt();
		surface.meshVertCount = bb.readInt();
		surface.lightmapNum = bb.readInt();
		surface.lightmapX = bb.readInt();
		surface.lightmapY = bb.readInt();
		surface.lightmapWidth = bb.readInt();
		surface.lightmapHeight = bb.readInt();
		surface.lightmapOrigin[0] = bb.readFloat();
		surface.lightmapOrigin[1] = bb.readFloat();
		surface.lightmapOrigin[2] = bb.readFloat();
		surface.lightmapVecs[0][0] = bb.readFloat();
		surface.lightmapVecs[0][1] = bb.readFloat();
		surface.lightmapVecs[0][2] = bb.readFloat();
		surface.lightmapVecs[1][0] = bb.readFloat();
		surface.lightmapVecs[1][1] = bb.readFloat();
		surface.lightmapVecs[1][2] = bb.readFloat();
		surface.lightmapVecs[2][0] = bb.readFloat();
		surface.lightmapVecs[2][1] = bb.readFloat();
		surface.lightmapVecs[2][2] = bb.readFloat();
		surface.patchWidth = bb.readInt();
		surface.patchHeight = bb.readInt();
	}
}

/**
 * LoadLightmaps
 */
function LoadLightmaps(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	world.lightmaps = new Uint8Array(lump.filelen);

	for (var i = 0; i < lump.filelen; i++) {
		world.lightmaps[i] = bb.readUnsignedByte();
	}
}

/**
 * LoadLightGrid
 */
function LoadLightGrid(world, buffer, lump) {
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

	if (lump.filelen !== numGridPoints * 8) {
		log('WARNING: light grid mismatch', lump.filelen, numGridPoints * 8);
		world.lightGridData = null;
		return;
	}

	// Read the actual light grid data.
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	world.lightGridData = new Uint8Array(lump.filelen);
	for (var i = 0; i < lump.filelen; i++) {
		world.lightGridData[i] = bb.readUnsignedByte();
	}
}

/**
 * LoadVisibility
 */
function LoadVisibility(world, buffer, lump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lump.fileofs;

	world.numClusters = bb.readInt();
	world.clusterBytes = bb.readInt();

	var size = world.numClusters * world.clusterBytes;
	world.vis = new Uint8Array(size);

	for (var i = 0; i < size; i++) {
		world.vis[i] = bb.readUnsignedByte();
	}
}