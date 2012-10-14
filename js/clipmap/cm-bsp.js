var cm;

function LoadMap(mapName, callback) {
	console.log('--------- CM Init ---------');
	console.log('Loading clipmap for ' + mapName);

	cm = new ClipMapLocals();

	com.ReadFile('../' + Q3W_BASE_FOLDER + '/maps/' + mapName + '.bsp', 'binary', function (data) {
		var bb = new ByteBuffer(data, ByteBuffer.LITTLE_ENDIAN);

		// Parse the header.
		var header = new dheader_t();
		header.ident = bb.readUTFChars(4);
		header.version = bb.readInt();
		for (var i = 0; i < Lumps.NUM_LUMPS; i++) {
			header.lumps[i].fileofs = bb.readInt();
			header.lumps[i].filelen = bb.readInt();
		}

		if (header.ident !== 'IBSP' && header.version !== 46) {
			return;
		}

		LoadShaders(data, header.lumps[Lumps.SHADERS]);
		LoadLeafs(data, header.lumps[Lumps.LEAFS]);
		LoadLeafBrushes(data, header.lumps[Lumps.LEAFBRUSHES]);
		LoadPlanes(data, header.lumps[Lumps.PLANES]);
		LoadBrushSides(data, header.lumps[Lumps.BRUSHSIDES]);
		LoadBrushes(data, header.lumps[Lumps.BRUSHES]);
		LoadSubmodels(data, header.lumps[Lumps.MODELS]);
		LoadNodes(data, header.lumps[Lumps.NODES]);
		LoadEntities(data, header.lumps[Lumps.ENTITIES]);

		if (callback) {
			callback();
		}
	});
}

function LoadShaders(buffer, shaderLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = shaderLump.fileofs;

	var shaders = cm.shaders = new Array(shaderLump.filelen / dshader_t.size);

	for (var i = 0; i < shaders.length; i++) {
		var shader = shaders[i] = new dshader_t();

		shader.shaderName = bb.readUTFChars(MAX_QPATH);
		shader.flags = bb.readInt();
		shader.contents = bb.readInt();
	}
}

function LoadLeafs(buffer, leafLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = leafLump.fileofs;

	var leafs = cm.leafs = new Array(leafLump.filelen / dleaf_t.size);

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

function LoadLeafBrushes(buffer, leafBrushLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = leafBrushLump.fileofs;

	var leafBrushes = cm.leafBrushes = new Array(leafBrushLump.filelen / 4);

	for (var i = 0; i < leafBrushes.length; i++) {
		leafBrushes[i] = bb.readInt();
	}
}

function LoadPlanes(buffer, planeLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = planeLump.fileofs;

	var planes = cm.planes = new Array(planeLump.filelen / dplane_t.size);

	for (var i = 0; i < planes.length; i++) {
		var plane = planes[i] = new Plane();

		plane.normal = [bb.readFloat(), bb.readFloat(), bb.readFloat()]
		plane.dist = bb.readFloat();
		plane.signbits = GetPlaneSignbits(plane);
		plane.type = PlaneTypeForNormal(plane.normal);
	}
}

function LoadBrushSides(buffer, brushSideLump) {
	var planes = cm.planes;

	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = brushSideLump.fileofs;

	var brushSides = cm.brushSides = new Array(brushSideLump.filelen / dbrushside_t.size);

	for (var i = 0; i < brushSides.length; i++) {
		var side = brushSides[i] = new cbrushside_t();

		var planeNum = bb.readInt();
		var shaderNum = bb.readInt();

		side.plane = planes[planeNum];
		side.shaderNum = shaderNum;
		side.surfaceFlags = cm.shaders[shaderNum].surfaceFlags;
	}
}

function LoadBrushes(buffer, brushLump) {
	var shaders = cm.shaders;
	var brushSides = cm.brushSides;

	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = brushLump.fileofs;

	var brushes = cm.brushes = new Array(brushLump.filelen / dbrush_t.size);

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

function LoadSubmodels(buffer, modelLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = modelLump.fileofs;

	var models = cm.models = new Array(modelLump.filelen / dmodel_t.size);

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

	var nodes = cm.nodes = new Array(nodeLump.filelen / dnode_t.size);

	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i] = new cnode_t();

		node.planeNum = bb.readInt();
		node.childrenNum = [bb.readInt(), bb.readInt()];

		// Skip mins/maxs.
		bb.index += 24;
	}
}

function LoadEntities(buffer, entityLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = entityLump.fileofs;

	var entityStr = bb.readString(entityLump.filelen);

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

function ClipHandleToModel(handle) {
	if (handle < 0) {
		throw new Error('ClipHandleToModel: bad handle ' + handle);
	}
	if (handle < cm.models.length) {
		return cm.models[handle];
	}
	/*if ( handle == BOX_MODEL_HANDLE ) {
		return &box_model;
	}*/
	
	throw new Error('ClipHandleToModel: bad handle ' + cm.models.length + ' < ' + handle);
}

function InlineModel(num) {
	if (num < 0 || num >= cm.models.length) {
		throw new Error('GetInlineModel: bad number');
	}

	return num;
}

function ModelBounds(model, mins, maxs) {
	var cmod = ClipHandleToModel( model );
	vec3.set(cmod.mins, mins);
	vec3.set(cmod.maxs, maxs);
}