var sys;
var sv;

var level;

var g_gravity;

function Init(sv_) {
	sys = require('system/sys');
	sv = sv_;

	level = new LevelLocals();

	g_gravity = sv.AddCvar('g_gravity', 800);

	// Let the server system know where the entites are.
	sv.LocateGameData(level.gentities, level.clients);

	// Spawn all the entities for the current level.
	SpawnAllEntitiesFromDefs();
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
		
		/*if (i < MAX_CLIENTS) {
			ClientThink(ent.client.number);
			continue;
		}*/

		EntityThink(ent);
	}
}