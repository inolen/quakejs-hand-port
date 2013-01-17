/**
 * LoadBsp
 */
function LoadBsp(mapName, callback) {
	sys.ReadFile('maps/' + mapName + '.bsp', 'binary', function (err, data) {
		if (err) {
			return callback(err);
		}

		var world = BspSerializer.deserialize(data);
		callback(null, world);
	});
}

/**
 * LoadMap
 */
function LoadMap(mapName, callback) {
	sys.ReadFile('maps/' + mapName + '.map', 'utf8', function (err, data) {
		if (err) {
			return callback(err);
		}

		var map = MapSerializer.deserialize(data);
		var world = MapCompiler.compile(map);

		callback(null, world);
	});
}