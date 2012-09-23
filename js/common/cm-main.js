var map;

function LoadMap(map) {
	map = new Q3Bsp();

	map.load('../' + Q3W_BASE_FOLDER + '/maps/' + mapName + '.bsp', function () {
	});
}