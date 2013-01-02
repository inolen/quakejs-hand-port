/**********************************************************
 *
 * General movers
 *
 * Doors, plats, and buttons are all binary (two position) movers.
 * Pos1 is "at rest", pos2 is "activated".
 *
 **********************************************************/

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
	// 	ent.s.loopSound = G_SoundIndex( sound );
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
	// 	ent.s.constantLight = r | ( g << 8 ) | ( b << 16 ) | ( i << 24 );
	// }

	ent.use = UseBinaryMover;
	ent.reached = ReachedBinaryMover;

	ent.moverState = MOVER.POS1;
	ent.svFlags = SVF.USE_CURRENT_ORIGIN;
	ent.s.eType = ET.MOVER;
	vec3.set(ent.pos1, ent.currentOrigin);
	sv.LinkEntity(ent);

	ent.s.pos.trType = TR.STATIONARY;
	vec3.set(ent.pos1, ent.s.pos.trBase);

	// Calculate time to reach second position from speed.
	var move = vec3.subtract(ent.pos2, ent.pos1, vec3.create());
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

/**
 * RunMover
 *
 */
function RunMover(ent) {
	// If not a team captain, don't do anything, because
	// the captain will handle everything.
	if (ent.flags & GFL.TEAMSLAVE) {
		return;
	}

	// If stationary at one of the positions, don't move anything.
	if (ent.s.pos.trType !== TR.STATIONARY || ent.s.apos.trType !== TR.STATIONARY) {
		RunMoverTeam(ent);
	}

	// Check think function.
	RunEntity(ent);
}

/**
 * RunMoverTeam
 */
function RunMoverTeam(ent) {
	var part;
	var obstacle;

	var move = vec3.create();
	var amove = vec3.create();
	var origin = vec3.create();
	var angles = vec3.create();

	// Make sure all team slaves can move before commiting
	// any moves or calling any think functions.
	// If the move is blocked, all moved objects will be backed out.
	// pushed_p = pushed;
	for (part = ent; part; part = part.teamchain) {
		// Get current position.
		bg.EvaluateTrajectory(part.s.pos, level.time, origin);
		bg.EvaluateTrajectory(part.s.apos, level.time, angles);
		vec3.subtract(origin, part.currentOrigin, move);
		vec3.subtract(angles, part.currentAngles, amove);

		var obstactle = MoverPush(part, move, amove);
		if (obstacle) {
			break;  // move was blocked
		}
	}

	if (part) {
		// Go back to the previous position.
		for (part = ent; part; part = part.teamchain) {
			part.s.pos.trTime += level.time - level.previousTime;
			part.s.apos.trTime += level.time - level.previousTime;
			bg.EvaluateTrajectory(part.s.pos, level.time, part.currentOrigin);
			bg.EvaluateTrajectory(part.s.apos, level.time, part.currentAngles);
			sv.LinkEntity(part);
		}

		// If the pusher has a "blocked" function, call it.
		if (ent.blocked) {
			ent.blocked( ent, obstacle );
		}
		return;
	}

	// The move succeeded
	for (part = ent; part; part = part.teamchain) {
		// Call the reached function if time is at or past end point.
		if (part.s.pos.trType === TR.LINEAR_STOP) {
			if (level.time >= part.s.pos.trTime + part.s.pos.trDuration) {
				if (part.reached) {
					part.reached(part);
				}
			}
		}
	}
}

/**
 * MoverPush
 *
 * Objects need to be moved back on a failed push,
 * otherwise riders would continue to slide.
 * If false is returned, *obstacle will be the blocking entity
 */
function MoverPush(pusher, move, amove) {
	// int			i, e;
	// gentity_t	*check;
	// pushed_t	*p;
	var i;
	var obstacle;
	var mins = vec3.create();
	var maxs = vec3.create();
	var totalMins = vec3.create();
	var totalMaxs = vec3.create();

	// mins/maxs are the bounds at the destination
	// totalMins / totalMaxs are the bounds for the entire move.
	if (pusher.currentAngles[0] || pusher.currentAngles[1] || pusher.currentAngles[2] ||
		amove[0] || amove[1] || amove[2] ) {
		var radius = QMath.RadiusFromBounds(pusher.mins, pusher.maxs);
		for (i = 0; i < 3; i++) {
			mins[i] = pusher.currentOrigin[i] + move[i] - radius;
			maxs[i] = pusher.currentOrigin[i] + move[i] + radius;
			totalMins[i] = mins[i] - move[i];
			totalMaxs[i] = maxs[i] - move[i];
		}
	} else {
		for (i = 0; i < 3; i++) {
			mins[i] = pusher.absmin[i] + move[i];
			maxs[i] = pusher.absmax[i] + move[i];
		}

		vec3.set(pusher.absmin, totalMins);
		vec3.set(pusher.absmax, totalMaxs);

		for (i = 0; i < 3; i++) {
			if (move[i] > 0) {
				totalMaxs[i] += move[i];
			} else {
				totalMins[i] += move[i];
			}
		}
	}

	// Unlink the pusher so we don't get it in the entityList
	sv.UnlinkEntity(pusher);

	var entityNums = sv.FindEntitiesInBox(totalMins, totalMaxs);

	// Move the pusher to its final position.
	vec3.add(pusher.currentOrigin, move);
	vec3.add(pusher.currentAngles, amove);
	sv.LinkEntity(pusher);

	// // See if any solid entities are inside the final position.
	// for ( e = 0 ; e < listedEntities ; e++ ) {
	// 	check = &g_entities[ entityList[ e ] ];

	// 	// Only push items and players.
	// 	if (check.s.eType !== ET,ITEM && check.s.eType !== ET.PLAYER && !check.physicsObject) {
	// 		continue;
	// 	}

	// 	// If the entity is standing on the pusher, it will definitely be moved
	// 	if (check.s.groundEntityNum !== pusher.s.number) {
	// 		// See if the ent needs to be tested.
	// 		if (check.absmin[0] >= maxs[0] ||
	// 			check.absmin[1] >= maxs[1] ||
	// 			check.absmin[2] >= maxs[2] ||
	// 			check.absmax[0] <= mins[0] ||
	// 			check.absmax[1] <= mins[1] ||
	// 			check.absmax[2] <= mins[2]) {
	// 			continue;
	// 		}
	// 		// See if the ent's bbox is inside the pusher's final position
	// 		// this does allow a fast moving object to pass through a thin entity...
	// 		if (!G_TestEntityPosition (check)) {
	// 			continue;
	// 		}
	// 	}

	// 	// the entity needs to be pushed
	// 	if (TryPushingEntity(check, pusher, move, amove)) {
	// 		continue;
	// 	}

	// 	// The move was blocked an entity.

	// 	// Bobbing entities are instant-kill and never get blocked.
	// 	if (pusher.s.pos.trType === TR.SINE || pusher.s.apos.trType === TR.SINE) {
	// 		Damage(check, pusher, pusher, null, null, 99999, 0, MOD.CRUSH);
	// 		continue;
	// 	}

	// 	// Save off the obstacle so we can call the block function (crush, etc).
	// 	*obstacle = check;

	// 	// Move back any entities we already moved.
	// 	// Go backwards, so if the same entity was pushed
	// 	// twice, it goes back to the original position.
	// 	for (p = pushed_p-1; p >= pushed; p--) {
	// 		vec3.set(p.origin, p.ent.s.pos.trBase);
	// 		vec3.set(p.angles, p.ent.s.apos.trBase);
	// 		if (p.ent.client) {
	// 			p.ent.client.ps.delta_angles[QMath.YAW] = p.deltayaw;
	// 			vec3.set(p.origin, p.ent.client.ps.origin);
	// 		}
	// 		sv.LinkEntity(p.ent);
	// 	}
	// 	return false;
	// }

	return null;
}

/**
 * SetMoverState
 */
function SetMoverState(ent, moverState, time) {
	var delta = vec3.create();
	var f;

	ent.moverState = moverState;
	ent.s.pos.trTime = time;

	switch (moverState) {
		case MOVER.POS1:
			vec3.set(ent.pos1, ent.s.pos.trBase);
			ent.s.pos.trType = TR.STATIONARY;
			break;
		case MOVER.POS2:
			vec3.set(ent.pos2, ent.s.pos.trBase);
			ent.s.pos.trType = TR.STATIONARY;
			break;
		case MOVER.ONETOTWO:
			vec3.set(ent.pos1, ent.s.pos.trBase);
			vec3.subtract(ent.pos2, ent.pos1, delta);
			f = 1000.0 / ent.s.pos.trDuration;
			vec3.scale(delta, f, ent.s.pos.trDelta);
			ent.s.pos.trType = TR.LINEAR_STOP;
			break;
		case MOVER.TWOTOONE:
			vec3.set(ent.pos2, ent.s.pos.trBase);
			vec3.subtract(ent.pos1, ent.pos2, delta);
			f = 1000.0 / ent.s.pos.trDuration;
			vec3.scale(delta, f, ent.s.pos.trDelta);
			ent.s.pos.trType = TR.LINEAR_STOP;
			break;
	}

	bg.EvaluateTrajectory(ent.s.pos, level.time, ent.currentOrigin);
	sv.LinkEntity(ent);
}

/**
 * UseBinaryMover
 */
function UseBinaryMover(ent, other, activator) {
	var total;
	var partial;

	// Only the master should be used.
	if (ent.flags & GFL.TEAMSLAVE) {
		UseBinaryMover(ent.teammaster, other, activator);
		return;
	}

	ent.activator = activator;

	if (ent.moverState === MOVER.POS1) {
		// Start moving 50 msec later, becase if this was player
		// triggered, level.time hasn't been advanced yet.
		MatchTeam(ent, MOVER.ONETOTWO, level.time + 50);

		// Starting sound.
		if (ent.sound1to2) {
			AddEvent(ent, EV.GENERAL_SOUND, ent.sound1to2);
		}

		// Looping sound.
		ent.s.loopSound = ent.soundLoop;

		// Open areaportal.
		if (ent.teammaster === ent || !ent.teammaster) {
			sv.AdjustAreaPortalState(ent, true);
		}

		return;
	}

	// If all the way up, just delay before coming down.
	if (ent.moverState === MOVER.POS2) {
		ent.nextthink = level.time + ent.wait;
		return;
	}

	// Only partway down before reversing.
	if (ent.moverState === MOVER.TWOTOONE) {
		total = ent.s.pos.trDuration;
		partial = level.time - ent.s.pos.trTime;
		if (partial > total) {
			partial = total;
		}

		MatchTeam(ent, MOVER.ONETOTWO, level.time - (total - partial));

		if (ent.sound1to2) {
			AddEvent(ent, EV.GENERAL_SOUND, ent.sound1to2);
		}
		return;
	}

	// Only partway up before reversing.
	if (ent.moverState === MOVER.ONETOTWO) {
		total = ent.s.pos.trDuration;
		partial = level.time - ent.s.pos.trTime;
		if (partial > total) {
			partial = total;
		}

		MatchTeam(ent, MOVER.TWOTOONE, level.time - (total - partial));

		if (ent.sound2to1) {
			AddEvent(ent, EV.GENERAL_SOUND, ent.sound2to1);
		}
		return;
	}
}

/**
 * ReachedBinaryMover
 */
function ReachedBinaryMover(ent) {
	// Stop the looping sound.
	ent.s.loopSound = ent.soundLoop;

	if (ent.moverState === MOVER.ONETOTWO) {
		// Reached pos2.
		SetMoverState(ent, MOVER.POS2, level.time);

		// Play sound.
		if (ent.soundPos2) {
			AddEvent(ent, EV.GENERAL_SOUND, ent.soundPos2);
		}

		// Return to pos1 after a delay.
		ent.think = ReturnToPos1;
		ent.nextthink = level.time + ent.wait;

		// Fire targets.
		if (!ent.activator) {
			ent.activator = ent;
		}
		UseTargets(ent, ent.activator);
	} else if (ent.moverState === MOVER.TWOTOONE) {
		// Reached pos1.
		SetMoverState(ent, MOVER.POS1, level.time);

		// Play sound.
		if (ent.soundPos1) {
			AddEvent(ent, EV.GENERAL_SOUND, ent.soundPos1);
		}

		// Close areaportals.
		if (ent.teammaster === ent || !ent.teammaster) {
			sv.AdjustAreaPortalState(ent, false);
		}
	} else {
		error('ReachedBinaryMover: bad moverState');
	}
}

/**
 * MatchTeam
 *
 * All entities in a mover team will move from pos1 to pos2
 * in the same amount of time
 */
function MatchTeam(teamLeader, moverState, time) {
	for (var slave = teamLeader; slave; slave = slave.teamchain) {
		SetMoverState(slave, moverState, time);
	}
}

/**
 * ReturnToPos1
 */
function ReturnToPos1(ent) {
	MatchTeam(ent, MOVER.TWOTOONE, level.time);

	// Looping sound.
	ent.s.loopSound = ent.soundLoop;

	// Starting sound.
	if (ent.sound2to1) {
		AddEvent(ent, EV.GENERAL_SOUND, ent.sound2to1);
	}
}