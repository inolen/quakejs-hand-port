function SpawnGameEntities() {
	//var entities = sv.GetEntities();
	//console.log(entities);
}

/*
		function ParseEntities(buffer, lump) {
			var entities = Struct.readString(buffer, lump.fileofs, lump.filelen);

			var elements = {
				targets: {}
			};

			entities.replace(/\{([^}]*)\}/mg, function($0, entitySrc) {
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

				if(entity['targetname']) {
					elements.targets[entity['targetname']] = entity;
				}

				if(!elements[entity.classname]) { elements[entity.classname] = []; }
				elements[entity.classname].push(entity);
			});

			return elements;
		}*/