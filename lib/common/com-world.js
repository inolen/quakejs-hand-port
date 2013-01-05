/**
 * LoadBsp
 */
function LoadBsp(mapName, callback) {
	sys.ReadFile('maps/' + mapName + '.bsp', 'binary', function (err, data) {
		if (err) {
			return callback(err);
		}

		var bsp = bspSerializer.deserialize(data);
		callback(null, bsp);
	});
}

/**
 * LoadMap
 */
function LoadMap(mapName, callback) {

}