var com;
var sv;

var level;

var g_gravity;

/**
 * Init
 */
function Init(cominterface, svinterface) {
	com = cominterface;
	sv = svinterface;

	level = new LevelLocals();

	g_gravity = com.AddCvar('g_gravity', 800);

	// Let the server system know where the entites are.
	sv.LocateGameData(level.gentities, level.clients);

	// Spawn all the entities for the current level.
	SpawnAllEntitiesFromDefs();
}

/**
 * Shutdown
 */
function Shutdown() {
}

/**
 * Frame
 */
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