define('common/bsp-serializer',
['ByteBuffer', 'common/qmath'],
function (ByteBuffer, QMath) {

var MAX_QPATH = 64;

var World = function () {
	this.entities             = {};
	this.shaders              = null;
	this.planes               = null;
	this.nodes                = null;
	this.leafs                = null;
	this.leafSurfaces         = null;
	this.leafBrushes          = null;
	this.bmodels              = null;
	this.brushes              = null;
	this.brushSides           = null;
	this.verts                = null;
	this.indexes              = null;
	this.fogs                 = null;
	this.surfaces             = null;
	this.lightmaps            = null;
	this.lightGridOrigin      = vec3.create();
	this.lightGridSize        = vec3.createFrom(64, 64, 128);
	this.lightGridInverseSize = vec3.create();
	this.lightGridBounds      = vec3.create();
	this.lightGridData        = null;
	this.numClusters          = 0;
	this.clusterBytes         = 0;
	this.vis                  = null;
};

var LUMP = {
	ENTITIES:     0,
	SHADERS:      1,
	PLANES:       2,
	NODES:        3,
	LEAFS:        4,
	LEAFSURFACES: 5,
	LEAFBRUSHES:  6,
	MODELS:       7,
	BRUSHES:      8,
	BRUSHSIDES:   9,
	DRAWVERTS:    10,
	DRAWINDEXES:  11,
	FOGS:         12,
	SURFACES:     13,
	LIGHTMAPS:    14,
	LIGHTGRID:    15,
	VISIBILITY:   16,
	NUM_LUMPS:    17
};

var MST = {
	BAD:           0,
	PLANAR:        1,
	PATCH:         2,
	TRIANGLE_SOUP: 3,
	FLARE:         4
};

var dheader_t = function () {
	this.ident    = null;                                  // byte * 4 (string)
	this.version  = 0;                                     // int32
	this.lumps    = new Array(LUMP.NUM_LUMPS);             // lumps_t * LUMP.NUM_LUMPS

	for (var i = 0; i < LUMP.NUM_LUMPS; i++) {
		this.lumps[i] = new lumps_t();
	}
};

var lumps_t = function () {
	this.fileofs  = 0;                                     // int32
	this.filelen = 0;                                      // int32
};

var dmodel_t = function () {
	this.bounds = [                                        // float32 * 6
		vec3.create(),
		vec3.create()
	];
	this.firstSurface = 0;                                 // int32
	this.numSurfaces  = 0;                                 // int32
	this.firstBrush   = 0;                                 // int32
	this.numBrushes   = 0;                                 // int32
};
dmodel_t.size = 40;

var dshader_t = function () {
	this.shaderName   = null;                              // byte * MAX_QPATH (string)
	this.surfaceFlags = 0;                                 // int32
	this.contents     = 0;                                 // int32
};
dshader_t.size = 72;

var dplane_t = function () {
	this.normal = vec3.create();                           // float32 * 3
	this.dist   = 0;                                       // float32
};
dplane_t.size = 16;

var dnode_t = function () {
	this.planeNum    = 0;                                  // int32
	this.childrenNum = [0, 0];                             // int32 * 2
	this.mins        = vec3.create();                      // int32 * 3
	this.maxs        = vec3.create();                      // int32 * 3
};
dnode_t.size = 36;

var dleaf_t = function () {
	this.cluster          = 0;                             // int32
	this.area             = 0;                             // int32
	this.mins             = vec3.create();                 // int32 * 3
	this.maxs             = vec3.create();                 // int32 * 3
	this.firstLeafSurface = 0;                             // int32
	this.numLeafSurfaces  = 0;                             // int32
	this.firstLeafBrush   = 0;                             // int32
	this.numLeafBrushes   = 0;                             // int32
};
dleaf_t.size = 48;

var dbrushside_t = function () {
	this.planeNum  = 0;                                    // int32
	this.shaderNum = 0;                                    // int32
};
dbrushside_t.size = 8;

var dbrush_t = function () {
	this.side      = 0;                                    // int32
	this.numSides  = 0;                                    // int32
	this.shaderNum = 0;                                    // int32
};
dbrush_t.size = 12;

var dfog_t = function () {
	this.shaderName  = null;                               // byte * MAX_QPATH (string)
	this.brushNum    = 0;                                  // int32
	this.visibleSide = 0;                                  // int32
};
dfog_t.size = 72;

var drawVert_t = function () {
	this.pos      = vec3.create();                         // float32 * 3
	this.texCoord = [0, 0];                                // float32 * 2
	this.lmCoord  = [0, 0];                                // float32 * 2
	this.normal   = vec3.create();                         // float32 * 3
	this.color    = [0, 0, 0, 0];                          // uint8 * 4
};
drawVert_t.size = 44;

var dsurface_t = function () {
	this.shaderNum      = 0;                               // int32
	this.fogNum         = 0;                               // int32
	this.surfaceType    = 0;                               // int32
	this.vertex         = 0;                               // int32
	this.vertCount      = 0;                               // int32
	this.meshVert       = 0;                               // int32
	this.meshVertCount  = 0;                               // int32
	this.lightmapNum    = 0;                               // int32
	this.lightmapX      = 0;
	this.lightmapY      = 0;
	this.lightmapWidth  = 0;
	this.lightmapHeight = 0;
	this.lightmapOrigin = vec3.create();
	this.lightmapVecs   = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	this.patchWidth     = 0;                               // int32
	this.patchHeight    = 0;                               // int32
};
dsurface_t.size = 104;

/**
 * Deserialize
 */
function Deserialize(data) {
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
		return callback(new Error('Invalid BSP version: ' + header.version));
	}

	var world = new World();

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

	var entities = world.entities = [];

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
		error('worldspawn isn\'t the first entity');
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

return {
	MST:          MST,

	dmodel_t:     dmodel_t,
	dshader_t:    dshader_t,
	dplane_t:     dplane_t,
	dnode_t:      dnode_t,
	dleaf_t:      dleaf_t,
	dbrushside_t: dbrushside_t,
	dbrush_t:     dbrush_t,
	dfog_t:       dfog_t,
	drawVert_t:   drawVert_t,
	dsurface_t:   dsurface_t,

	deserialize:  Deserialize
};

});