var sv;
var level;

function Init(sv_interface) {
	sv = sv_interface;
	level = new LevelLocals();

	SpawnGameEntities();
}