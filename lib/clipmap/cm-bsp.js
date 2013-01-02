var cm;

/**
 * LoadMap
 */
function LoadMap(mapName, callback) {
	log('Initializing');
	log('Loading map for ' + mapName);

	cm = new ClipMapLocals();

	sys.ReadFile('maps/' + mapName + '.bsp', 'binary', function (err, data) {
		if (err) throw err;

		var bb = new ByteBuffer(data, ByteBuffer.LITTLE_ENDIAN);

		// Parse the header.
		var header = new sh.dheader_t();
		header.ident = bb.readASCIIString(4);
		header.version = bb.readInt();
		for (var i = 0; i < sh.Lumps.NUM_LUMPS; i++) {
			header.lumps[i].fileofs = bb.readInt();
			header.lumps[i].filelen = bb.readInt();
		}

		if (header.ident !== 'IBSP' && header.version !== 46) {
			return;
		}

		LoadShaders(data, header.lumps[sh.Lumps.SHADERS]);
		LoadLeafs(data, header.lumps[sh.Lumps.LEAFS]);
		LoadLeafBrushes(data, header.lumps[sh.Lumps.LEAFBRUSHES]);
		LoadLeafSurfaces(data, header.lumps[sh.Lumps.LEAFSURFACES]);
		LoadPlanes(data, header.lumps[sh.Lumps.PLANES]);
		LoadBrushSides(data, header.lumps[sh.Lumps.BRUSHSIDES]);
		LoadBrushes(data, header.lumps[sh.Lumps.BRUSHES]);
		LoadSubmodels(data, header.lumps[sh.Lumps.MODELS]);
		LoadNodes(data, header.lumps[sh.Lumps.NODES]);
		LoadEntities(data, header.lumps[sh.Lumps.ENTITIES]);
		LoadVisibility(data, header.lumps[sh.Lumps.VISIBILITY]);
		LoadPatches(data, header.lumps[sh.Lumps.SURFACES], header.lumps[sh.Lumps.DRAWVERTS]);

		InitBoxHull();
		FloodAreaConnections();

		if (callback) {
			callback();
		}
	});
}

/**
 * LoadShaders
 */
function LoadShaders(buffer, shaderLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = shaderLump.fileofs;

	var shaders = cm.shaders = new Array(shaderLump.filelen / sh.dshader_t.size);

	for (var i = 0; i < shaders.length; i++) {
		var shader = shaders[i] = new sh.dshader_t();

		shader.shaderName = bb.readASCIIString(MAX_QPATH);
		shader.surfaceFlags = bb.readInt();
		shader.contents = bb.readInt();
	}
}

/**
 * LoadLeafs
 */
function LoadLeafs(buffer, leafLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = leafLump.fileofs;

	var numLeafs = leafLump.filelen / sh.dleaf_t.size;
	var leafs = cm.leafs = new Array(numLeafs);

	var numAreas = 0;

	for (var i = 0; i < numLeafs; i++) {
		var leaf = leafs[i] = new cleaf_t();

		leaf.cluster = bb.readInt();
		leaf.area = bb.readInt();

		// Skip mins/maxs.
		bb.index += 24;

		leaf.firstLeafSurface = bb.readInt();
		leaf.numLeafSurfaces = bb.readInt();
		leaf.firstLeafBrush = bb.readInt();
		leaf.numLeafBrushes = bb.readInt();

		if (leaf.area >= numAreas) {
			numAreas = leaf.area + 1;
		}
	}

	cm.areas = new Array(numAreas);
	cm.areaPortals = new Array(numAreas * numAreas);

	for (var i = 0; i < numAreas; i++) {
		cm.areas[i] = new carea_t();
	}
	for (var i = 0; i < numAreas * numAreas; i++) {
		cm.areaPortals[i] = 0;
	}
}

/**
 * LoadLeafBrushes
 */
function LoadLeafBrushes(buffer, leafBrushLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = leafBrushLump.fileofs;

	var numLeafBrushes = leafBrushLump.filelen / 4;
	var leafBrushes = cm.leafBrushes = new Array(numLeafBrushes);

	for (var i = 0; i < leafBrushes.length; i++) {
		leafBrushes[i] = bb.readInt();
	}
}

/**
 * LoadLeafSurfaces
 */
function LoadLeafSurfaces(buffer, leafSurfacesLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = leafSurfacesLump.fileofs;

	var leafSurfaces = cm.leafSurfaces = new Array(leafSurfacesLump.filelen / 4);
	for (var i = 0; i < leafSurfaces.length; i++) {
		leafSurfaces[i] = bb.readInt();
	}
}

/**
 * LoadPlanes
 */
function LoadPlanes(buffer, planeLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = planeLump.fileofs;

	var numPlanes = planeLump.filelen / sh.dplane_t.size;
	var planes = cm.planes = new Array(numPlanes);

	for (var i = 0; i < numPlanes; i++) {
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
 * LoadBrushSides
 */
function LoadBrushSides(buffer, brushSideLump) {
	var planes = cm.planes;

	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = brushSideLump.fileofs;

	var numBrushSides = brushSideLump.filelen / sh.dbrushside_t.size;
	var brushSides = cm.brushSides = new Array(numBrushSides);

	for (var i = 0; i < numBrushSides; i++) {
		var side = brushSides[i] = new cbrushside_t();

		var planeNum = bb.readInt();
		var shaderNum = bb.readInt();

		side.plane = planes[planeNum];
		side.shaderNum = shaderNum;
		side.surfaceFlags = cm.shaders[shaderNum].surfaceFlags;
	}
}

/**
 * LoadBrushes
 */
function LoadBrushes(buffer, brushLump) {
	var shaders = cm.shaders;
	var brushSides = cm.brushSides;

	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = brushLump.fileofs;

	var numBrushes = brushLump.filelen / sh.dbrush_t.size;
	var brushes = cm.brushes = new Array(numBrushes);

	for (var i = 0; i < numBrushes; i++) {
		var brush = brushes[i] = new cbrush_t();

		brush.firstSide = bb.readInt();
		brush.numSides = bb.readInt();
		brush.shaderNum = bb.readInt();

		brush.bounds[0][0] = -cm.brushSides[brush.firstSide + 0].plane.dist;
		brush.bounds[0][1] = -cm.brushSides[brush.firstSide + 2].plane.dist;
		brush.bounds[0][2] = -cm.brushSides[brush.firstSide + 4].plane.dist;

		brush.bounds[1][0] = cm.brushSides[brush.firstSide + 1].plane.dist;
		brush.bounds[1][1] = cm.brushSides[brush.firstSide + 3].plane.dist;
		brush.bounds[1][2] = cm.brushSides[brush.firstSide + 5].plane.dist;

		brush.contents = shaders[brush.shaderNum].contents;
	}
}

/**
 * LoadSubmodels
 */
function LoadSubmodels(buffer, modelLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = modelLump.fileofs;

	var models = cm.models = new Array(modelLump.filelen / sh.dmodel_t.size);

	for (var i = 0; i < models.length; i++) {
		var model = models[i] = new cmodel_t();

		// Spread the mins / maxs by a pixel.
		model.mins[0] = bb.readFloat() - 1;
		model.mins[1] = bb.readFloat() - 1;
		model.mins[2] = bb.readFloat() - 1;

		model.maxs[0] = bb.readFloat() + 1;
		model.maxs[1] = bb.readFloat() + 1;
		model.maxs[2] = bb.readFloat() + 1;

		var firstSurface = bb.readInt();
		var numSurfaces = bb.readInt();
		var firstBrush = bb.readInt();
		var numBrushes = bb.readInt();

		if (i === 0) {
			continue;  // world model doesn't need other info
		}

		// Make a "leaf" just to hold the model's brushes and surfaces.
		var leaf = model.leaf;
		leaf.numLeafBrushes = numBrushes;
		leaf.firstLeafBrush = cm.leafBrushes.length;
		for (var j = 0; j < numBrushes; j++) {
			cm.leafBrushes.push(firstBrush + j);
		}

		leaf.numLeafSurfaces = numSurfaces;
		leaf.firstLeafSurface = cm.leafSurfaces.length;
		for (var j = 0; j < numSurfaces; j++) {
			cm.leafSurfaces.push(firstSurface + j);
		}
	}
}

/**
 * LoadNodes
 */
function LoadNodes(buffer, nodeLump) {
	var planes = cm.planes;

	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = nodeLump.fileofs;

	var nodes = cm.nodes = new Array(nodeLump.filelen / sh.dnode_t.size);

	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i] = new cnode_t();

		node.planeNum = bb.readInt();
		node.childrenNum = [bb.readInt(), bb.readInt()];

		// Skip mins/maxs.
		bb.index += 24;
	}
}

/**
 * LoadEntities
 */
function LoadEntities(buffer, entityLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = entityLump.fileofs;

	var entityStr = bb.readASCIIString(entityLump.filelen);

	var entities = cm.entities = [];

	entityStr.replace(/\{([^}]*)\}/mg, function($0, entitySrc) {
		var entity = {
			classname: 'unknown'
		};

		entitySrc.replace(/"(.+)" "(.+)"$/mg, function($0, key, value) {
			entity[key] = value;
		});

		entities.push(entity);
	});
}

/**
 * LoadVisibility
 */
function LoadVisibility(buffer, visLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = visLump.fileofs;

	cm.numClusters = bb.readInt();
	cm.clusterBytes = bb.readInt();

	var vissize = cm.numClusters * cm.clusterBytes;
	cm.vis = new Uint8Array(vissize);

	for (var i = 0; i < vissize; i++) {
		cm.vis[i] = bb.readUnsignedByte();
	}
}

/**
 * LoadPatches
 */
function LoadPatches(buffer, surfsLump, vertsLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	var count = surfsLump.filelen / sh.dsurface_t.size;
	cm.surfaces = new Array(count);

	// Scan through all the surfaces, but only load patches,
	// not planar faces.
	var patch;
	var width;
	var height;
	var c;
	var dface = new sh.dsurface_t();
	var points = new Array(MAX_PATCH_VERTS);
	for (var i = 0; i < MAX_PATCH_VERTS; i++) {
		points[i] = vec3.create();
	}

	var surfidx = surfsLump.fileofs;

	for (var i = 0; i < count; i++) {
		// Read face into temp variable.
		bb.index = surfidx;

		dface.shaderNum = bb.readInt();
		dface.fogNum = bb.readInt();
		dface.surfaceType = bb.readInt();
		dface.vertex = bb.readInt();
		dface.vertCount = bb.readInt();
		dface.meshVert = bb.readInt();
		dface.meshVertCount = bb.readInt();
		dface.lightmapNum = bb.readInt();
		dface.lmStart[0] = bb.readInt();
		dface.lmStart[1] = bb.readInt();
		dface.lmSize[0] = bb.readInt();
		dface.lmSize[1] = bb.readInt();
		dface.lmOrigin[0] = bb.readFloat();
		dface.lmOrigin[1] = bb.readFloat();
		dface.lmOrigin[2] = bb.readFloat();
		dface.lmVecs[0][0] = bb.readFloat();
		dface.lmVecs[0][1] = bb.readFloat();
		dface.lmVecs[0][2] = bb.readFloat();
		dface.lmVecs[1][0] = bb.readFloat();
		dface.lmVecs[1][1] = bb.readFloat();
		dface.lmVecs[1][2] = bb.readFloat();
		dface.lmVecs[2][0] = bb.readFloat();
		dface.lmVecs[2][1] = bb.readFloat();
		dface.lmVecs[2][2] = bb.readFloat();
		dface.patchWidth = bb.readInt();
		dface.patchHeight = bb.readInt();

		if (dface.surfaceType !== sh.MapSurfaceType.PATCH) {
			continue;  // ignore other surfaces
		}

		cm.surfaces[i] = patch = new cpatch_t();

		// Store our current pos before we read the verts.
		surfidx = bb.index;

		// Load the full drawverts onto the stack.
		width = dface.patchWidth;
		height = dface.patchHeight;
		c = width * height;

		if (c > MAX_PATCH_VERTS) {
			com.Error(ERR.DROP, 'ParseMesh: MAX_PATCH_VERTS');
		}

		for (var j = 0; j < c ; j++) {
			bb.index = vertsLump.fileofs + (dface.vertex + j) * sh.drawVert_t.size;

			points[j][0] = bb.readFloat();
			points[j][1] = bb.readFloat();
			points[j][2] = bb.readFloat();
		}

		patch.contents = cm.shaders[dface.shaderNum].contents;
		patch.surfaceFlags = cm.shaders[dface.shaderNum].surfaceFlags;

		// Create the internal facet structure
		patch.pc = GeneratePatchCollide(width, height, points);
	}
}

/**
 * InitBoxHull
 *
 * Set up the planes and nodes so that the six floats of a bounding box
 * can just be stored out and get a proper clipping hull structure.
 */
var BOX_BRUSHES = 1;
var BOX_SIDES   = 6;
var BOX_LEAFS   = 2;
var BOX_PLANES  = 12;

var box_model = null;
var box_brush = null;
var box_planes = null;

function InitBoxHull() {
	box_model = new cmodel_t();
	box_model.leaf.numLeafBrushes = 1;
	box_model.leaf.firstLeafBrush = cm.leafBrushes.length;
	cm.leafBrushes.push(cm.brushes.length);

	box_brush = new cbrush_t();
	box_brush.firstSide = cm.brushSides.length;
	box_brush.numSides = BOX_SIDES;
	box_brush.contents = CONTENTS.BODY;
	cm.brushes.push(box_brush);

	box_planes = new Array(BOX_PLANES);
	for (var i = 0; i < BOX_PLANES; i++) {
		var plane = box_planes[i] = new QMath.Plane();
		cm.planes.push(plane);
	}

	for (var i = 0; i < 6; i++) {
		var side = i & 1;

		// Brush sides.
		var s = new sh.dbrushside_t();
		s.plane = box_planes[i * 2 + side];
		s.surfaceFlags = 0;

		// Planes.
		var p = box_planes[i * 2];
		p.type = i >> 1;
		p.normal[0] = p.normal[1] = p.normal[2] = 0;
		p.normal[i >> 1] = 1;
		p.signbits = 0;

		p = box_planes[i * 2 + 1];
		p.type = 3 + (i >> 1);
		p.normal[0] = p.normal[1] = p.normal[2] = 0;
		p.normal[i >> 1] = -1;
		p.signbits = QMath.GetPlaneSignbits(p.normal);

		cm.brushSides.push(s);
	}
}

/**
 * InlineModel
 */
function InlineModel(num) {
	if (num < 0 || num >= cm.models.length) {
		com.Error(ERR.DROP, 'GetInlineModel: bad number');
	}

	return num;
}

/**
 * TempBoxModel
 *
 * To keep everything totally uniform, bounding boxes are turned into small
 * BSP trees instead of being compared directly.
 * Capsules are handled differently though.
 */
function TempBoxModel(mins, maxs, capsule) {
	vec3.set(mins, box_model.mins);
	vec3.set(maxs, box_model.maxs);

	if (capsule) {
		return CAPSULE_MODEL_HANDLE;
	}

	box_planes[0].dist = maxs[0];
	box_planes[1].dist = -maxs[0];
	box_planes[2].dist = mins[0];
	box_planes[3].dist = -mins[0];
	box_planes[4].dist = maxs[1];
	box_planes[5].dist = -maxs[1];
	box_planes[6].dist = mins[1];
	box_planes[7].dist = -mins[1];
	box_planes[8].dist = maxs[2];
	box_planes[9].dist = -maxs[2];
	box_planes[10].dist = mins[2];
	box_planes[11].dist = -mins[2];

	vec3.set(mins, box_brush.bounds[0]);
	vec3.set(maxs, box_brush.bounds[1]);

	return BOX_MODEL_HANDLE;
}

/**
 * ModelBounds
 */
function ModelBounds(model, mins, maxs) {
	var cmod = ClipHandleToModel(model);
	vec3.set(cmod.mins, mins);
	vec3.set(cmod.maxs, maxs);
}

/**
 * ClipHandleToModel
 */
function ClipHandleToModel(handle) {
	if (handle < 0) {
		com.Error(ERR.DROP, 'ClipHandleToModel: bad handle ' + handle);
	}
	if (handle < cm.models.length) {
		return cm.models[handle];
	}
	if (handle === BOX_MODEL_HANDLE) {
		return box_model;
	}

	com.Error(ERR.DROP, 'ClipHandleToModel: bad handle ' + cm.models.length + ' < ' + handle);
}

/**
 * LeafCluster
 */
function LeafCluster(leafNum) {
	if (leafNum < 0 || leafNum >= cm.leafs.length) {
		com.Error(ERR.DROP, 'LeafCluster: bad number');
	}
	return cm.leafs[leafNum].cluster;
}

/**
 * LeafArea
 */
function LeafArea(leafNum) {
	if (leafNum < 0 || leafNum >= cm.leafs.length) {
		com.Error(ERR.DROP, 'LeafArea: bad number');
	}
	return cm.leafs[leafNum].area;
}
