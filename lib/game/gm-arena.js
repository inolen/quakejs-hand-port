// /**
//  * InitArenas
//  *
//  * Initializes a single default arena, as well as
//  * one per unique arena in info_player_intermission.
//  */
// function InitArenas() {
// 	var arenas = [0];
// 	var points = FindEntity({ classname: 'info_player_intermission' });

// 	for (var i = 0; i < points.length; i++) {
// 		var point = points[i];

// 		if (arenas.indexOf(point.arenaNum) === -1) {
// 			arenas.push(point.arenaNum);
// 		}
// 	}

// 	for (var i = 0; i < arenas.length; i++) {
// 		var arena = new ArenaLocals();
// 		arena.number = arenas[i];
// 		level.arenas[arenas[i]] = arena;
// 	}
// }