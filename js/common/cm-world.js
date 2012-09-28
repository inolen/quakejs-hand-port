var cm;

function LoadMap(mapName, callback) {
	cm = new ClipMap();

	var map = new Q3Bsp();
	map.Load('../' + Q3W_BASE_FOLDER + '/maps/' + mapName + '.bsp', function () {
		LoadShaders(map);
		LoadLeafs(map);
		LoadLeafBrushes(map);
		LoadPlanes(map);
		LoadBrushSides(map);
		LoadBrushes(map);
		LoadSubmodels(map);
		LoadNodes(map);
		LoadEntities(map);

		callback();
	});
}

function LoadShaders(map) {
	cm.shaders = map.ParseLump(Q3Bsp.Lumps.LUMP_SHADERS, Q3Bsp.dshader_t);
}

function LoadLeafs(map) {
	cm.leaves = map.ParseLump(Q3Bsp.Lumps.LUMP_LEAFS, Q3Bsp.dleaf_t);
}

function LoadLeafBrushes(map) {
	var lump = map.GetLump(Q3Bsp.Lumps.LUMP_LEAFBRUSHES);
	cm.leafBrushes = Struct.readUint32Array(map.GetBuffer(), lump.fileofs, lump.filelen/4);
}

// TODO Move this into some shared area
var PLANE_X			= 0;
var PLANE_Y			= 1;
var PLANE_Z			= 2;
var PLANE_NON_AXIAL	= 3;

function PlaneTypeForNormal(x) {
	return x[0] == 1.0 ? PLANE_X : (x[1] == 1.0 ? PLANE_Y : (x[2] == 1.0 ? PLANE_Z : PLANE_NON_AXIAL))
}

function LoadPlanes(map) {
	var planes = cm.planes = map.ParseLump(Q3Bsp.Lumps.LUMP_PLANES, Q3Bsp.dplane_t);

	for (var i = 0; i < cm.planes.length; i++) {
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

function LoadBrushSides(map) {
	cm.brushSides = map.ParseLump(Q3Bsp.Lumps.LUMP_BRUSHSIDES, Q3Bsp.dbrushside_t);

	for (var i = 0; i < cm.brushSides.length; i++) {
		var side = cm.brushSides[i];

		side.plane = cm.planes[side.planeNum];
	}
}

function LoadBrushes(map) {
	var shaders = cm.shaders;
	var brushes = cm.brushes = map.ParseLump(Q3Bsp.Lumps.LUMP_BRUSHES, Q3Bsp.dbrush_t);

	for (var i = 0; i < brushes.length; i++) {
		var brush = brushes[i];

		brush.sides = cm.brushSides.slice(brush.side, brush.side + brush.numsides);
		brush.bounds = [
			[-brush.sides[0].plane.dist, -brush.sides[2].plane.dist, -brush.sides[4].plane.dist],
			[brush.sides[1].plane.dist, brush.sides[3].plane.dist, brush.sides[5].plane.dist]
		];
		brush.contents = shaders[brush.shader].contents;
	}
}

function LoadSubmodels(map) {
	var cmodels = cm.cmodels = map.ParseLump(Q3Bsp.Lumps.LUMP_MODELS, Q3Bsp.dmodel_t);

	for (var i = 0; i < cmodels.length; i++) {
		var model = cmodels[i];

		// spread the mins / maxs by a pixel
		vec3.subtract(model.mins, [-1, -1, -1]);
		vec3.add(model.maxs, [1, 1, 1]);

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

function LoadNodes(map) {
	cm.nodes = map.ParseLump(Q3Bsp.Lumps.LUMP_NODES, Q3Bsp.dnode_t);
}

function LoadEntities(map) {
	var lump = map.GetLump(Q3Bsp.Lumps.LUMP_ENTITIES);
	var entityStr = Struct.readString(map.GetBuffer(), lump.fileofs, lump.filelen);

	var entities = cm.entities = [];

	entityStr.replace(/\{([^}]*)\}/mg, function($0, entitySrc) {
		var entity = {
			classname: 'unknown'
		};

		entitySrc.replace(/"(.+)" "(.+)"$/mg, function($0, key, value) {

			switch (key) {
				case 'origin':
				case 'origin2':
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
		
		entities.push(entity);
	});
}

function EntityDefs() {
	return cm.entities;
};

function ClipHandleToModel(handle) {
	if (handle < 0) {
		throw new Error('ClipHandleToModel: bad handle ' + handle);
	}
	if (handle < cm.cmodels.length) {
		return cm.cmodels[handle];
	}
	/*if ( handle == BOX_MODEL_HANDLE ) {
		return &box_model;
	}*/
	
	throw new Error('ClipHandleToModel: bad handle ' + cm.cmodels.length + ' < ' + handle);
}

function InlineModel(num) {
	if (num < 0 || num >= cm.cmodels.length) {
		throw new Error('GetInlineModel: bad number');
	}

	return num;
}

function ModelBounds(model, mins, maxs) {
	var cmod = ClipHandleToModel( model );
	vec3.set(cmod.mins, mins);
	vec3.set(cmod.maxs, maxs);
}