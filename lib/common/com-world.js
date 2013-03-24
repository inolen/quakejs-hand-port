/**
 * LoadBsp
 */
function LoadBsp(mapname, callback) {
	SYS.ReadFile('maps/' + mapname + '.bsp', 'binary', function (err, data) {
		if (err) {
			return callback(err);
		}

		try {
			var world = BSPLoader.load(data);
			callback(null, world);
		} catch (e) {
			callback(e);
		}
	});
}

// /**
//  * LoadMap
//  */
// function LoadMap(mapname, callback) {
// 	SYS.ReadFile('maps/' + mapname + '.map', 'utf8', function (err, data) {
// 		if (err) {
// 			return callback(err);
// 		}

// 		var map = MapSerializer.deserialize(data);
// 		var bsp = MapCompiler.compile(map);

// 		callback(null, bsp);
// 	});
// }