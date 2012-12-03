/*
 * QUAKED func_door (0 .5 .8) ? START_OPEN x CRUSHER
 * TOGGLE        wait in both the start and end states for a trigger event.
 * START_OPEN    the door to moves to its destination when spawned, and operate in reverse.  It is used to temporarily or permanently close off an area when triggered (not useful for touch or takedamage doors).
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
entityEvents['func_door'] = {
	spawn: function (self) {
		// self.sound1to2 = self.sound2to1 = G_SoundIndex('sound/movers/doors/dr1_strt.wav');
		// self.soundPos1 = self.soundPos2 = G_SoundIndex('sound/movers/doors/dr1_end.wav');

		// self.blocked = Blocked_Door;

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

		// Calculate second position..
		sv.SetBrushModel(self, self.model);
		SetMovedir(self.s.angles, self.movedir);

		var absMovedir = [
			Math.abs(self.movedir[0]),
			Math.abs(self.movedir[1]),
			Math.abs(self.movedir[2])
		];
		var size = vec3.subtract(self.maxs, self.mins, [0, 0, 0]);
		var distance = vec3.dot(absMovedir, size) - lip;
		vec3.add(self.pos1, vec3.scale(self.movedir, distance, [0, 0, 0]), self.pos2);

		// If "start_open", reverse position 1 and 2.
		if (self.spawnflags & 1) {
			var temp = vec3.set(self.pos2, [0, 0, 0]);
			vec3.set(self.s.origin, self.pos2);
			vec3.set(temp, self.pos1);
		}

		InitMover(self);

		// self.nextthink = level.time + FRAMETIME;

		// if (!(self.flags & GFL.TEAMSLAVE)) {
		// 	int health;

		// 	G_SpawnInt( "health", "0", &health );
		// 	if (health) {
		// 		self.takeDamage = true;
		// 	}
		// 	if (self.targetName || health) {
		// 		// Non touch/shoot doors.
		// 		self.think = Think_MatchTeam;
		// 	} else {
		// 		self.think = Think_SpawnNewDoorTrigger;
		// 	}
		// }
	}
};