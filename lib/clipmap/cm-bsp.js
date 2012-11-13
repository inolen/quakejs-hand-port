var cm;

/**
 * LoadMap
 */
function LoadMap(mapName, callback) {
	log('Initializing');
	log('Loading map for ' + mapName);

	cm = new ClipMapLocals();

	imp.sys_ReadFile('maps/' + mapName + '.bsp', 'binary', function (err, data) {
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
		LoadPatches(data, header.lumps[sh.Lumps.SURFACES], header.lumps[sh.Lumps.DRAWVERTS]);

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
		shader.flags = bb.readInt();
		shader.contents = bb.readInt();
	}
}

/**
 * LoadLeafs
 */
function LoadLeafs(buffer, leafLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = leafLump.fileofs;

	var leafs = cm.leafs = new Array(leafLump.filelen / sh.dleaf_t.size);

	for (var i = 0; i < leafs.length; i++) {
		var leaf = leafs[i] = new cleaf_t();

		leaf.cluster = bb.readInt();
		leaf.area = bb.readInt();
		
		// Skip mins/maxs.
		bb.index += 24;

		leaf.firstLeafSurface = bb.readInt();
		leaf.numLeafSurfaces = bb.readInt();
		leaf.firstLeafBrush = bb.readInt();
		leaf.numLeafBrushes = bb.readInt();
	}
}

/**
 * LoadLeafBrushes
 */
function LoadLeafBrushes(buffer, leafBrushLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = leafBrushLump.fileofs;

	var leafBrushes = cm.leafBrushes = new Array(leafBrushLump.filelen / 4);

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

	var planes = cm.planes = new Array(planeLump.filelen / sh.dplane_t.size);

	for (var i = 0; i < planes.length; i++) {
		var plane = planes[i] = new qm.Plane();

		plane.normal = [bb.readFloat(), bb.readFloat(), bb.readFloat()];
		plane.dist = bb.readFloat();
		plane.signbits = qm.GetPlaneSignbits(plane.normal);
		plane.type = qm.PlaneTypeForNormal(plane.normal);
	}
}

/**
 * LoadBrushSides
 */
function LoadBrushSides(buffer, brushSideLump) {
	var planes = cm.planes;

	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = brushSideLump.fileofs;

	var brushSides = cm.brushSides = new Array(brushSideLump.filelen / sh.dbrushside_t.size);

	for (var i = 0; i < brushSides.length; i++) {
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

	var brushes = cm.brushes = new Array(brushLump.filelen / sh.dbrush_t.size);

	for (var i = 0; i < brushes.length; i++) {
		var brush = brushes[i] = new cbrush_t();

		brush.side = bb.readInt();
		brush.numsides = bb.readInt();
		brush.shaderNum = bb.readInt();
		brush.sides = brushSides.slice(brush.side, brush.side + brush.numsides);
		brush.bounds = [
			[-brush.sides[0].plane.dist, -brush.sides[2].plane.dist, -brush.sides[4].plane.dist],
			[brush.sides[1].plane.dist, brush.sides[3].plane.dist, brush.sides[5].plane.dist]
		];
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
		model.mins = [bb.readFloat() - 1, bb.readFloat() - 1, bb.readFloat() - 1];
		model.maxs = [bb.readFloat() + 1, bb.readFloat() + 1, bb.readFloat() + 1];

		var firstSurface = bb.readInt();
		var numSurfaces = bb.readInt();
		var firstBrush = bb.readInt();
		var numBrushes = bb.readInt();

		if (i === 0) {
			continue;	// world model doesn't need other info
		}

		// make a "leaf" just to hold the model's brushes and surfaces
		/*out->leaf.numLeafBrushes = LittleLong( in->numBrushes );
		indexes = Hunk_Alloc( out->leaf.numLeafBrushes * 4, h_high );
		out->leaf.firstLeafBrush = indexes - cm.leafbrushes;
		for ( j = 0 ; j < out->leaf.numLeafBrushes ; j++ ) {
			indexes[j] = LittleLong( in->firstBrush ) + j;
		}

		out->leaf.numLeafSurfaces = LittleLong( in->numSurfaces );
		indexes = Hunk_Alloc( out->leaf.numLeafSurfaces * 4, h_high );
		out->leaf.firstLeafSurface = indexes - cm.leafsurfaces;
		for ( j = 0 ; j < out->leaf.numLeafSurfaces ; j++ ) {
			indexes[j] = LittleLong( in->firstSurface ) + j;
		}*/
	}
}

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

			switch (key) {
				case 'origin':
					value.replace(/(.+) (.+) (.+)/, function($0, x, y, z) {
						entity[key] = [
							parseFloat(x),
							parseFloat(y),
							parseFloat(z)
						];
					});
					break;
				case 'angles':
					value.replace(/(.+) (.+) (.+)/, function($0, x, y, z) {
						entity[key] = [
							parseFloat(x),
							parseFloat(y),
							parseFloat(z)
						];
					});
					break;
				case 'angle':
					entity['angles'] = [0, parseFloat(value), 0];
					break;
				default:
					entity[key] = value;
					break;
			}
		});
		
		entities.push(entity);
	});
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
		points[i] = [0, 0, 0];
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
			com.error(sh.Err.DROP, 'ParseMesh: MAX_PATCH_VERTS');
		}

		for (var j = 0; j < c ; j++) {
			bb.index = vertsLump.fileofs + (dface.vertex + j) * sh.drawVert_t.size;

			points[j][0] = bb.readFloat();
			points[j][1] = bb.readFloat();
			points[j][2] = bb.readFloat();
		}

		patch.contents = cm.shaders[dface.shaderNum].contents;
		patch.surfaceFlags = cm.shaders[dface.shaderNum].flags;

		// Create the internal facet structure
		patch.pc = GeneratePatchCollide(width, height, points);
	}
}

/**
 * ClipHandleToModel
 */
function ClipHandleToModel(handle) {
	if (handle < 0) {
		com.error(sh.Err.DROP, 'ClipHandleToModel: bad handle ' + handle);
	}
	if (handle < cm.models.length) {
		return cm.models[handle];
	}
	/*if ( handle == BOX_MODEL_HANDLE ) {
		return &box_model;
	}*/
	
	com.error(sh.Err.DROP, 'ClipHandleToModel: bad handle ' + cm.models.length + ' < ' + handle);
}

/**
 * InlineModel
 */
function InlineModel(num) {
	if (num < 0 || num >= cm.models.length) {
		com.error(sh.Err.DROP, 'GetInlineModel: bad number');
	}

	return num;
}

// /**
//  * InitBoxHull
//  * 
//  * Set up the planes and nodes so that the six floats of a bounding box
//  * can just be stored out and get a proper clipping hull structure.
//  */
// cmodel_t	box_model;
// cplane_t	*box_planes;
// cbrush_t	*box_brush;

// function InitBoxHull() {
// 	int			i;
// 	int			side;
// 	cplane_t	*p;
// 	cbrushside_t	*s;

// 	box_planes = cm.planes[cm.numPlanes];

// 	box_brush = cm.brushes[cm.numBrushes];
// 	box_brush.numsides = 6;
// 	box_brush.sides = cm.brushsides + cm.numBrushSides;
// 	box_brush.contents = ContentTypes.BODY;

// 	box_model.leaf.numLeafBrushes = 1;
// 	box_model.leaf.firstLeafBrush = cm.numLeafBrushes;
// 	cm.leafbrushes[cm.numLeafBrushes] = cm.numBrushes;

// 	for (var i = 0; i < 6; i++) {
// 		side = i&1;

// 		// brush sides
// 		var s = cm.brushsides[cm.numBrushSides+i];
// 		s.plane = 	cm.planes + (cm.numPlanes+i*2+side);
// 		s.surfaceFlags = 0;

// 		// planes
// 		var p = box_planes[i*2];
// 		p.type = i>>1;
// 		p.signbits = 0;
// 		vec3.set([0, 0, 0], p.normal);
// 		p.normal[i>>1] = 1;

// 		p = box_planes[i*2+1];
// 		p.type = 3 + (i>>1);
// 		p.signbits = 0;
// 		vec3.set([0, 0, 0], p.normal);
// 		p.normal[i>>1] = -1;

// 		p.signbits = qm.GetPlaneSignbits(p);
// 	}	
// }

// /**
//  * TempBoxModel
//  *
//  * To keep everything totally uniform, bounding boxes are turned into small
//  * BSP trees instead of being compared directly.
//  * Capsules are handled differently though.
//  */
// function TempBoxModel(mins, maxs, capsule) {
// 	vec3.set(mins, box_model.mins);
// 	vec3.set(maxs, box_model.maxs);

// 	if (capsule) {
// 		return CAPSULE_MODEL_HANDLE;
// 	}

// 	box_planes[0].dist = maxs[0];
// 	box_planes[1].dist = -maxs[0];
// 	box_planes[2].dist = mins[0];
// 	box_planes[3].dist = -mins[0];
// 	box_planes[4].dist = maxs[1];
// 	box_planes[5].dist = -maxs[1];
// 	box_planes[6].dist = mins[1];
// 	box_planes[7].dist = -mins[1];
// 	box_planes[8].dist = maxs[2];
// 	box_planes[9].dist = -maxs[2];
// 	box_planes[10].dist = mins[2];
// 	box_planes[11].dist = -mins[2];

// 	vec3.set(mins, box_brush.bounds[0]);
// 	vec3.set(maxs, box_brush.bounds[1]);

// 	return BOX_MODEL_HANDLE;
// }

/**
 * ModelBounds
 */
function ModelBounds(model, mins, maxs) {
	var cmod = ClipHandleToModel( model );
	vec3.set(cmod.mins, mins);
	vec3.set(cmod.maxs, maxs);
}