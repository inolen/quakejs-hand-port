var cm;

/**
 * LoadWorld
 */
function LoadWorld(world) {
	log('Initializing');

	cm = new ClipWorld();

	cm.entities = world.entities;
	cm.shaders = world.shaders;
	cm.planes = world.planes;
	cm.nodes = world.nodes;
	cm.numClusters = world.numClusters;
	cm.clusterBytes = world.clusterBytes;
	cm.vis = world.vis;

	LoadLeafs(world.leafs, world.leafBrushes, world.leafSurfaces);
	LoadBrushes(world.brushes, world.brushSides);
	LoadBrushModels(world.bmodels);
	LoadPatches(world.surfaces, world.verts);

	InitBoxHull();
	FloodAreaConnections();
}


/**
 * LoadLeafs
 */
function LoadLeafs(leafs, leafBrushes, leafSurfaces) {
	cm.leafs = leafs;
	cm.leafBrushes = leafBrushes;
	cm.leafSurfaces = leafSurfaces;

	var numAreas = 0;
	for (var i = 0; i < leafs.length; i++) {
		var leaf = leafs[i];

		if (leaf.area >= numAreas) {
			numAreas = leaf.area + 1;
		}
	}

	cm.areas = new Array(numAreas);
	cm.areaPortals = new Array(numAreas * numAreas);

	for (var i = 0; i < numAreas; i++) {
		cm.areas[i] = new ClipArea();
	}
	for (var i = 0; i < numAreas * numAreas; i++) {
		cm.areaPortals[i] = 0;
	}
}

/**
 * LoadBrushes
 */
function LoadBrushes(brushes, brushSides) {
	var shaders = cm.shaders;
	var planes = cm.planes;

	//
	// Process brush sides.
	//
	var cbrushSides = cm.brushSides = new Array(brushSides.length);

	for (var i = 0; i < brushSides.length; i++) {
		var side = brushSides[i];
		var cside = cbrushSides[i] = new ClipBrushSide();

		cside.plane = planes[side.planeNum];
		cside.surfaceFlags = shaders[side.shaderNum].surfaceFlags;
	}

	//
	// Process brushes.
	//
	var cbrushes = cm.brushes = new Array(brushes.length);

	for (var i = 0; i < brushes.length; i++) {
		var brush = brushes[i];
		var cbrush = cbrushes[i] = new ClipBrush();

		cbrush.shader = shaders[brush.shaderNum];
		cbrush.contents = cbrush.shader.contents;

		cbrush.bounds[0][0] = -cbrushSides[brush.side + 0].plane.dist;
		cbrush.bounds[0][1] = -cbrushSides[brush.side + 2].plane.dist;
		cbrush.bounds[0][2] = -cbrushSides[brush.side + 4].plane.dist;

		cbrush.bounds[1][0] = cbrushSides[brush.side + 1].plane.dist;
		cbrush.bounds[1][1] = cbrushSides[brush.side + 3].plane.dist;
		cbrush.bounds[1][2] = cbrushSides[brush.side + 5].plane.dist;

		cbrush.firstSide = brush.side;
		cbrush.numSides = brush.numSides;
	}
}

/**
 * LoadBrushModels
 */
function LoadBrushModels(models) {
	cm.models = new Array(models.length);

	for (var i = 0; i < models.length; i++) {
		var model = models[i];
		var cmodel = cm.models[i] = new ClipModel();

		// Spread the mins / maxs by a unit.
		var spread = vec3.createFrom(1, 1, 1);
		vec3.subtract(model.bounds[0], spread, cmodel.mins);
		vec3.add(model.bounds[1], spread, cmodel.maxs);

		if (i === 0) {
			continue;  // world model doesn't need other info
		}

		// Make a "leaf" just to hold the model's brushes and surfaces.
		var leaf = cmodel.leaf;
		leaf.numLeafBrushes = model.numBrushes;
		leaf.firstLeafBrush = cm.leafBrushes.length;
		for (var j = 0; j < model.numBrushes; j++) {
			cm.leafBrushes.push(model.firstBrush + j);
		}

		leaf.numLeafSurfaces = model.numSurfaces;
		leaf.firstLeafSurface = cm.leafSurfaces.length;
		for (var j = 0; j < model.numSurfaces; j++) {
			cm.leafSurfaces.push(model.firstSurface + j);
		}
	}
}

/**
 * LoadPatches
 */
function LoadPatches(surfaces, verts) {
	cm.surfaces = new Array(surfaces.length);

	// Scan through all the surfaces, but only load patches,
	// not planar faces.
	var points = new Array(MAX_PATCH_VERTS);
	for (var i = 0; i < MAX_PATCH_VERTS; i++) {
		points[i] = vec3.create();
	}

	for (var i = 0; i < surfaces.length; i++) {
		var surface = surfaces[i];
		if (surface.surfaceType !== MST.PATCH) {
			continue;  // ignore other surfaces
		}

		var patch = cm.surfaces[i] = new cpatch_t();

		// Load the full drawverts onto the stack.
		var width = surface.patchWidth;
		var height = surface.patchHeight;
		var c = width * height;
		if (c > MAX_PATCH_VERTS) {
			com.Error(ERR.DROP, 'ParseMesh: MAX_PATCH_VERTS');
		}
		for (var j = 0; j < c ; j++) {
			vec3.set(verts[surface.vertex + j].pos, points[j]);
		}

		patch.contents = cm.shaders[surface.shaderNum].contents;
		patch.surfaceFlags = cm.shaders[surface.shaderNum].surfaceFlags;

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
	box_model = new ClipModel();
	box_model.leaf.numLeafBrushes = 1;
	box_model.leaf.firstLeafBrush = cm.leafBrushes.length;
	cm.leafBrushes.push(cm.brushes.length);

	box_brush = new ClipBrush();
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