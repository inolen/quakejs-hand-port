/*
 * QUAKED func_door (0 .5 .8) ? START_OPEN x CRUSHER
 * TOGGLE        wait in both the start and end states for a trigger event.
 * START_OPEN    the door to moves to its destination when spawned, and operate in reverse.  It is used to temporarily or permanently close off an area when triggered (not useful for touch or takeDamage doors).
 * NOMONSTER     monsters will not trigger this door
 *
 * "model2"      .md3 model to also draw
 * "angle"       determines the opening direction
 * "targetname"  if set, no touch field will be spawned and a remote button or trigger field activates the door.
 * "speed"       movement speed (100 default)
 * "wait"        wait before returning (3 default, -1 = never return)
 * "lip"         lip remaining at end of move (8 default)
 * "dmg"         damage to inflict when blocked (2 default)
 * "color"       constantLight color
 * "light"       constantLight radius
 * "health"      if set, the door must be shot open
 */
spawnFuncs['func_door'] = function (self) {
	// self.sound1to2 = self.sound2to1 = G_SoundIndex('sound/movers/doors/dr1_strt.wav');
	// self.soundPos1 = self.soundPos2 = G_SoundIndex('sound/movers/doors/dr1_end.wav');

	self.blocked = DoorBlocked;

	// Default speed of 400.
	if (!self.speed) {
		self.speed = 400;
	}

	// Default wait of 2 seconds.
	if (!self.wait) {
		self.wait = 2;
	}
	self.wait *= 1000;

	// Default lip of 8 units.
	var lip = SpawnFloat('lip', 8);

	// Default damage of 2 points.
	self.damage = SpawnInt('dmg', 2);

	// First position at start.
	vec3.set(self.s.origin, self.pos1);

	// Calculate second position.
	sv.SetBrushModel(self, self.model);
	SetMovedir(self.s.angles, self.movedir);

	var absMovedir = vec3.createFrom(
		Math.abs(self.movedir[0]),
		Math.abs(self.movedir[1]),
		Math.abs(self.movedir[2])
	);
	var size = vec3.subtract(self.maxs, self.r.mins, vec3.create());
	var distance = vec3.dot(absMovedir, size) - lip;
	vec3.add(self.pos1, vec3.scale(self.movedir, distance, vec3.create()), self.pos2);

	// If "start_open", reverse position 1 and 2.
	if (self.spawnflags & 1) {
		var temp = vec3.create(self.pos2);
		vec3.set(self.s.origin, self.pos2);
		vec3.set(temp, self.pos1);
	}

	InitMover(self);

	self.nextthink = level.time + FRAMETIME;

	if (!(self.flags & GFL.TEAMSLAVE)) {
		var health = SpawnInt('health', 0);

		if (health) {
			self.takeDamage = true;
		}

		if (self.targetName || health) {
			// Non touch/shoot doors.
			self.think = DoorMatchTeam;
		} else {
			self.think = DoorSpawnNewTrigger;
		}
	}
};

/**
 * DoorBlocked
 */
function DoorBlocked(ent, other) {
	// Remove anything other than a client.
	if (!other.client) {
		// // Except CTF flags!!!!
		// if (other.s.eType === ET.ITEM && other.item.giType === IT.TEAM ) {
		// 	Team_DroppedFlagThink( other );
		// 	return;
		// }
		TempEntity(other.s.origin, EV.ITEM_POP);
		FreeEntity(other);
		return;
	}

	if (ent.damage) {
		Damage(other, ent, ent, null, null, ent.damage, 0, MOD.CRUSH);
	}

	if (ent.spawnflags & 4) {
		return;  // crushers don't reverse
	}

	// Reverse direction.
	UseBinaryMover(ent, ent, other);
}

/**
 * DoorSpawnNewTrigger
 *
 * All of the parts of a door have been spawned, so create
 * a trigger that encloses all of them.
 */
function DoorSpawnNewTrigger(ent) {
	// Set all of the slaves as shootable.
	for (var other = ent; other; other = other.teamchain) {
		other.takeDamage = true;
	}

	// Find the bounds of everything on the team.
	var mins = vec3.create(ent.r.absmin);
	var maxs = vec3.create(ent.r.absmax);

	for (var other = ent.teamchain; other; other = other.teamchain) {
		QMath.AddPointToBounds(other.r.absmin, mins, maxs);
		QMath.AddPointToBounds(other.r.absmax, mins, maxs);
	}

	// Find the thinnest axis, which will be the one we expand.
	var best = 0;
	for (var i = 1; i < 3; i++) {
		if ( maxs[i] - mins[i] < maxs[best] - mins[best] ) {
			best = i;
		}
	}
	maxs[best] += 120;
	mins[best] -= 120;

	// Create a trigger with this size.
	var other = SpawnEntity();
	other.classname = 'door_trigger';
	vec3.set(mins, other.r.mins);
	vec3.set(maxs, other.r.maxs);
	other.parent = ent;
	other.contents = CONTENTS.TRIGGER;
	other.touch = DoorTriggerTouch;
	// Remember the thinnest axis.
	other.count = best;
	sv.LinkEntity (other);

	MatchTeam(ent, ent.moverState, level.time);
}

/**
 * DoorMatchTeam
 */
function DoorMatchTeam(ent) {
	MatchTeam(ent, ent.moverState, level.time);
}

/**
 * DoorTriggerTouch
 */
function DoorTriggerTouch(ent, other, trace) {
	if (other.client && other.client.sess.spectatorState !== SPECTATOR.NOT) {
		// If the door is not open and not opening.
		if (ent.parent.moverState !== MOVER.ONETOTWO &&
			ent.parent.moverState !== MOVER.POS2) {
			DoorTriggerTouchSpectator(ent, other, trace);
		}
	} else if (ent.parent.moverState !== MOVER.ONETOTWO) {
		UseBinaryMover(ent.parent, ent, other);
	}
}

/**
 * DoorTriggerTouchSpectator
 */
function DoorTriggerTouchSpectator(ent, other, trace) {
	var axis = ent.count;
	// The constants below relate to constants in DoorSpawnNewTrigger().
	var doorMin = ent.r.absmin[axis] + 100;
	var doorMax = ent.r.absmax[axis] - 100;

	var origin = vec3.create(other.client.ps.origin);

	if (origin[axis] < doorMin || origin[axis] > doorMax) {
		return;
	}

	if (Math.abs(origin[axis] - doorMax) < Math.abs(origin[axis] - doorMin)) {
		origin[axis] = doorMin - 10;
	} else {
		origin[axis] = doorMax + 10;
	}

	TeleportPlayer(other, origin, vec3.createFrom(10000000, 0, 0));
}