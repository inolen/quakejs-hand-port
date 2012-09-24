var entities;

function LoadMap(mapName, callback) {
	var map = new Q3Bsp();

	map.Load('../' + Q3W_BASE_FOLDER + '/maps/' + mapName + '.bsp', function () {
		LoadEntities(map);
		callback();
	});
}

function GetEntities() {
	return entities;
}

function LoadEntities(map) {
	var lump = map.GetLump(Q3Bsp.LUMP_ENTITIES);
	var entityStr = Struct.readString(map.GetBuffer(), lump.fileofs, lump.filelen);

	entities = {
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