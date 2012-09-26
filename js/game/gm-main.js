var sv;
var level;

function Init(sv_interface) {
	// Due to sv/cl/com having a circular dependency on eachother,
	// we need to re-grab com now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	com = require('common/com');
	
	sv = sv_interface;
	level = new LevelLocals();

	// let the server system know where the entites are
	sv.LocateGameData(level.gentities, level.clients);

	EntitySpawnAllDefs();
}