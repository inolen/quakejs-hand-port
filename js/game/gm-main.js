var sv;
var level;

var g_gravity;

function Init(sv_interface) {
	// Due to circular dependencies, we need to re-require now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	com = require('common/com');
	
	g_gravity = com.CvarAdd('g_gravity', 800);
	
	sv = sv_interface;
	level = new LevelLocals();

	// Let the server system know where the entites are.
	sv.LocateGameData(level.gentities, level.clients);

	// Spawn all the entities for the current level.
	EntitySpawnAllFromDefs();
}

function Shutdown() {
}

function Frame(levelTime) {
	level.framenum++;
	level.previousTime = level.time;
	level.time = levelTime;

	for (var i = 0; i < level.gentities.length; i++) {
		var ent = level.gentities[i];

		if (!ent) {
			continue;
		}

		if (!ent.linked) {
			continue;
		}

		/*if (i < MAX_CLIENTS) {
			ClientThink(ent.client.number);
			continue;
		}*/

		EntityThink(ent);
	}
}