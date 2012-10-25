/**
 * ParseServerinfo
 *
 * This is called explicitly when the gamestate is first received,
 * and whenever the server updates any serverinfo flagged cvars
 */
function ParseServerinfo() {
	var serverInfo = ConfigString('serverInfo');

	cgs.mapname = serverInfo['sv_mapname'];
}