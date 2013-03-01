/**********************************************************
 *
 * General movers
 *
 * Doors, plats, and buttons are all binary (two position) movers.
 * Pos1 is "at rest", pos2 is "activated".
 *
 **********************************************************/

var Pushed = function () {
	this.ent = null;
	this.origin = vec3.create();
	this.angles = vec3.create();
	this.deltayaw = 0;
};
var pushed = new Array(MAX_GENTITIES);
for (var i = 0; i < MAX_GENTITIES; i++) {
	pushed[i] = new Pushed();
}
var pidx = 0;

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
	ent.r.svFlags = SVF.USE_CURRENT_ORIGIN;
	ent.s.eType = ET.MOVER;
	vec3.set(ent.pos1, ent.r.currentOrigin);
	SV.LinkEntity(ent);

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
	pidx = 0;
	for (part = ent; part; part = part.teamchain) {
		// Get current position.
		BG.EvaluateTrajectory(part.s.pos, level.time, origin);
		BG.EvaluateTrajectory(part.s.apos, level.time, angles);
		vec3.subtract(origin, part.r.currentOrigin, move);
		vec3.subtract(angles, part.r.currentAngles, amove);

		obstacle = MoverPush(part, move, amove);
		if (obstacle) {
			break;  // move was blocked
		}
	}

	if (part) {
		// Go back to the previous position.
		for (part = ent; part; part = part.teamchain) {
			part.s.pos.trTime += level.time - level.previousTime;
			part.s.apos.trTime += level.time - level.previousTime;
			BG.EvaluateTrajectory(part.s.pos, level.time, part.r.currentOrigin);
			BG.EvaluateTrajectory(part.s.apos, level.time, part.r.currentAngles);
			SV.LinkEntity(part);
		}

		// If the pusher has a "blocked" function, call it.
		if (ent.blocked) {
			ent.blocked(ent, obstacle);
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
 * If false is returned, obstacle will be the blocking entity.
 */
function MoverPush(pusher, move, amove) {
	var mins = vec3.create();
	var maxs = vec3.create();
	var totalMins = vec3.create();
	var totalMaxs = vec3.create();

	// mins/maxs are the bounds at the destination
	// totalMins / totalMaxs are the bounds for the entire move.
	if (pusher.r.currentAngles[0] || pusher.r.currentAngles[1] || pusher.r.currentAngles[2] ||
		amove[0] || amove[1] || amove[2] ) {
		var radius = QMath.RadiusFromBounds(pusher.r.mins, pusher.r.maxs);
		for (var i = 0; i < 3; i++) {
			mins[i] = pusher.r.currentOrigin[i] + move[i] - radius;
			maxs[i] = pusher.r.currentOrigin[i] + move[i] + radius;
			totalMins[i] = mins[i] - move[i];
			totalMaxs[i] = maxs[i] - move[i];
		}
	} else {
		for (var i = 0; i < 3; i++) {
			mins[i] = pusher.r.absmin[i] + move[i];
			maxs[i] = pusher.r.absmax[i] + move[i];
		}

		vec3.set(pusher.r.absmin, totalMins);
		vec3.set(pusher.r.absmax, totalMaxs);

		for (i = 0; i < 3; i++) {
			if (move[i] > 0) {
				totalMaxs[i] += move[i];
			} else {
				totalMins[i] += move[i];
			}
		}
	}

	// Unlink the pusher so we don't get it in the entityList
	SV.UnlinkEntity(pusher);

	var entityNums = FindEntitiesInBox(totalMins, totalMaxs);

	// Move the pusher to its final position.
	vec3.add(pusher.r.currentOrigin, move);
	vec3.add(pusher.r.currentAngles, amove);
	SV.LinkEntity(pusher);

	// See if any solid entities are inside the final position.
	for (var i = 0; i < entityNums.length; i++) {
		var check = level.gentities[entityNums[i]];

		// Only push items and players.
		if (check.s.eType !== ET.ITEM && check.s.eType !== ET.PLAYER && !check.physicsObject) {
			continue;
		}

		// If the entity is standing on the pusher, it will definitely be moved
		if (check.s.groundEntityNum !== pusher.s.number) {
			// See if the ent needs to be tested.
			if (check.r.absmin[0] >= maxs[0] ||
				check.r.absmin[1] >= maxs[1] ||
				check.r.absmin[2] >= maxs[2] ||
				check.r.absmax[0] <= mins[0] ||
				check.r.absmax[1] <= mins[1] ||
				check.r.absmax[2] <= mins[2]) {
				continue;
			}

			// See if the ent's bbox is inside the pusher's final position
			// this does allow a fast moving object to pass through a thin entity...
			if (!TestEntityPosition(check)) {
				continue;
			}
		}

		// The entity needs to be pushed.
		if (TryPushingEntity(check, pusher, move, amove)) {
			continue;
		}

		// The move was blocked an entity.

		// Bobbing entities are instant-kill and never get blocked.
		if (pusher.s.pos.trType === TR.SINE || pusher.s.apos.trType === TR.SINE) {
			Damage(check, pusher, pusher, null, null, 99999, 0, MOD.CRUSH);
			continue;
		}

		// Save off the obstacle so we can call the block function (crush, etc).
		var obstacle = check;

		// Move back any entities we already moved.
		// Go backwards, so if the same entity was pushed
		// twice, it goes back to the original position.
		for (var idx = pidx-1; idx >= 0; idx--) {
			var p = pushed[idx];

			vec3.set(p.origin, p.ent.s.pos.trBase);
			vec3.set(p.angles, p.ent.s.apos.trBase);

			if (p.ent.client) {
				p.ent.client.ps.delta_angles[QMath.YAW] = p.deltayaw;
				vec3.set(p.origin, p.ent.client.ps.origin);
			}

			SV.LinkEntity(p.ent);
		}

		return obstacle;
	}

	return null;
}

/**
 * TestEntityPosition
 */
function TestEntityPosition(ent) {
	var mask;
	if (ent.clipmask) {
		mask = ent.clipmask;
	} else {
		mask = MASK.SOLID;
	}

	var trace = new QS.TraceResults();
	if (ent.client) {
		Trace(trace, ent.client.ps.origin, ent.client.ps.origin, ent.r.mins, ent.r.maxs, ent.s.number, mask);
	} else {
		Trace(trace, ent.s.pos.trBase, ent.s.pos.trBase, ent.r.mins, ent.r.maxs, ent.s.number, mask);
	}

	if (trace.startSolid) {
		return level.gentities[trace.entityNum];
	}

	return null;
}

/**
 * TryPushingEntity
 *
 * Returns false if the move is blocked.
 */
function TryPushingEntity(check, pusher, move, amove) {
	var org = vec3.create();
	var org2 = vec3.create();
	var move2 = vec3.create();

	// EF.MOVER_STOP will just stop when contacting another entity
	// instead of pushing it, but entities can still ride on top of it.
	if ((pusher.s.eFlags & EF.MOVER_STOP) &&
		check.s.groundEntityNum !== pusher.s.number) {
		return false;
	}

	if (pidx > MAX_GENTITIES) {
		error('pidx > MAX_GENTITIES');
		return;
	}

	//
	// Save off the old position.
	//
	var pushed_p = pushed[pidx];
	pushed_p.ent = check;
	vec3.set(check.s.pos.trBase, pushed_p.origin);
	vec3.set(check.s.apos.trBase, pushed_p.angles);
	if (check.client) {
		pushed_p.deltayaw = check.client.ps.delta_angles[QMath.YAW];
		vec3.set(check.client.ps.origin, pushed_p.origin);
	}
	pushed_p = pushed[++pidx];

	//
	// Try moving the contacted entity figure movement due to the pusher's amove.
	//
	var matrix = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	var transpose = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	QMath.AnglesToAxis(amove, matrix);
	QMath.TransposeMatrix(matrix, transpose);
	if (check.client) {
		vec3.subtract(check.client.ps.origin, pusher.r.currentOrigin, org);
	}
	else {
		vec3.subtract(check.s.pos.trBase, pusher.r.currentOrigin, org);
	}
	vec3.set(org, org2);
	QMath.RotatePoint(org2, transpose);
	vec3.subtract(org2, org, move2);

	//
	// Add movement.
	//
	vec3.add(check.s.pos.trBase, move, check.s.pos.trBase);
	vec3.add(check.s.pos.trBase, move2, check.s.pos.trBase);
	if (check.client) {
		vec3.add(check.client.ps.origin, move, check.client.ps.origin);
		vec3.add(check.client.ps.origin, move2, check.client.ps.origin);

		// Make sure the client's view rotates when on a rotating mover.
		check.client.ps.delta_angles[QMath.YAW] += QMath.AngleToShort(amove[QMath.YAW]);
	}

	// May have pushed them off an edge.
	if (check.s.groundEntityNum !== pusher.s.number) {
		check.s.groundEntityNum = ENTITYNUM_NONE;
	}

	var block = TestEntityPosition(check);
	if (!block) {
		// Pushed ok.
		if (check.client) {
			vec3.set(check.client.ps.origin, check.r.currentOrigin);
		} else {
			vec3.set(check.s.pos.trBase, check.r.currentOrigin);
		}
		SV.LinkEntity(check);
		return true;
	}

	// If it is ok to leave in the old position, do it.
	// This is only relevent for riding entities, not pushed.
	// Sliding trapdoors can cause this..
	var old_pushed_p = pushed[pidx-1];

	vec3.set(old_pushed_p.origin, check.s.pos.trBase);
	if (check.client) {
		vec3.set(old_pushed_p.origin, check.client.ps.origin);
	}
	vec3.set(old_pushed_p.angles, check.s.apos.trBase);
	block = TestEntityPosition(check);
	if (!block) {
		check.s.groundEntityNum = ENTITYNUM_NONE;
		pidx--;
		return true;
	}

	// Blocked.
	return false;
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

	BG.EvaluateTrajectory(ent.s.pos, level.time, ent.r.currentOrigin);
	SV.LinkEntity(ent);
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
			SV.AdjustAreaPortalState(ent, true);
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
			SV.AdjustAreaPortalState(ent, false);
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