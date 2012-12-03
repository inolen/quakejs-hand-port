/**
 * InitMover
 * 
 * "pos1", "pos2", and "speed" should be set before calling,
 * so the movement delta can be calculated
 */
function InitMover(ent) {
	// // If the "model2" key is set, use a seperate model
	// // for drawing, but clip against the brushes
	// if (ent.model2) {
	// 	ent.s.modelIndex2 = ModelIndex(ent.model2);
	// }

	// // If the "loopsound" key is set, use a constant looping sound when moving.
	// if ( G_SpawnString( "noise", "100", &sound ) ) {
	// 	ent->s.loopSound = G_SoundIndex( sound );
	// }

	// // if the "color" or "light" keys are set, setup constantLight
	// lightSet = G_SpawnFloat( "light", "100", &light );
	// colorSet = G_SpawnVector( "color", "1 1 1", color );
	// if ( lightSet || colorSet ) {
	// 	int		r, g, b, i;

	// 	r = color[0] * 255;
	// 	if ( r > 255 ) {
	// 		r = 255;
	// 	}
	// 	g = color[1] * 255;
	// 	if ( g > 255 ) {
	// 		g = 255;
	// 	}
	// 	b = color[2] * 255;
	// 	if ( b > 255 ) {
	// 		b = 255;
	// 	}
	// 	i = light / 4;
	// 	if ( i > 255 ) {
	// 		i = 255;
	// 	}
	// 	ent->s.constantLight = r | ( g << 8 ) | ( b << 16 ) | ( i << 24 );
	// }

	// ent.use = Use_BinaryMover;
	// ent.reached = Reached_BinaryMover;

	ent.moverState = MOVER.POS1;
	ent.svFlags = SVF.USE_CURRENT_ORIGIN;
	ent.s.eType = ET.MOVER;
	vec3.set(ent.pos1, ent.currentOrigin);
	sv.LinkEntity(ent);

	ent.s.pos.trType = TR.STATIONARY;
	vec3.set(ent.pos1, ent.s.pos.trBase);

	// Calculate time to reach second position from speed.
	var move = vec3.subtract(ent.pos2, ent.pos1, [0, 0, 0]);
	var distance = vec3.length(move);
	if (!ent.speed) {
		ent.speed = 100;
	}
	vec3.scale(move, ent.speed, ent.s.pos.trDelta);
	ent.s.pos.trDuration = distance * 1000 / ent.speed;
	if (ent.s.pos.trDuration <= 0) {
		ent.s.pos.trDuration = 1;
	}
}