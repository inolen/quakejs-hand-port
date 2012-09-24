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
		LoadNodes(map);
		LoadEntities(map);

		callback();
	});
}

function LoadShaders(map) {
	cm.shaders = map.ParseLump(Q3Bsp.LUMP_SHADERS, Q3Bsp.dshader_t);
}

function LoadLeafs(map) {
	cm.leaves = map.ParseLump(Q3Bsp.LUMP_LEAFS, Q3Bsp.dleaf_t);
}

function LoadLeafBrushes(map) {
	var lump = map.GetLump(Q3Bsp.LUMP_LEAFBRUSHES);
	cm.leafBrushes = Struct.readUint32Array(map.GetBuffer(), lump.fileofs, lump.filelen/4);
}

function LoadPlanes(map) {
	cm.planes = map.ParseLump(Q3Bsp.LUMP_PLANES, Q3Bsp.dplane_t);
}

function LoadBrushSides(map) {
	cm.brushSides = map.ParseLump(Q3Bsp.LUMP_BRUSHSIDES, Q3Bsp.dbrushside_t);
}

function LoadBrushes(map) {
	cm.brushes = map.ParseLump(Q3Bsp.LUMP_BRUSHES, Q3Bsp.dbrush_t);
}

function LoadNodes(map) {
	cm.nodes = map.ParseLump(Q3Bsp.LUMP_NODES, Q3Bsp.dnode_t);
}

function LoadEntities(map) {
	var lump = map.GetLump(Q3Bsp.LUMP_ENTITIES);
	var entityStr = Struct.readString(map.GetBuffer(), lump.fileofs, lump.filelen);

	var entities = cm.entities = {
		targets: {}
	};

	entityStr.replace(/\{([^}]*)\}/mg, function($0, entitySrc) {
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

		if (entity['targetname']) {
			entities.targets[entity['targetname']] = entity;
		}

		if (!entities[entity.classname]) {
			entities[entity.classname] = [];
		}
		
		entities[entity.classname].push(entity);
	});
}