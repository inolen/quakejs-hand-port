/*
 * QUAKED func_train (0 .5 .8) ? START_ON TOGGLE BLOCK_STOPS
 * A train is a mover that moves between path_corner target points.
 * Trains MUST HAVE AN ORIGIN BRUSH.
 * The train spawns at the first target it is pointing at.
 * "model2"  .md3 model to also draw
 * "speed"   default 100
 * "dmg"     default 2
 * "noise"   looping sound to play when the train is in motion
 * "target"  next path corner
 * "color"   constantLight color
 * "light"   constantLight radius
 */

var TRAIN_START_ON    = 1;
var TRAIN_TOGGLE      = 2;
var TRAIN_BLOCK_STOPS = 4;

spawnFuncs['func_train'] = function (self) {
	console.log('SPAWANING func_train');
	self.s.angles[0] = self.s.angles[1] = self.s.angles[2] = 0;

	if (self.spawnflags & TRAIN_BLOCK_STOPS) {
		self.damage = 0;
	} else if (!self.damage) {
		self.damage = 2;
	}

	if (!self.speed) {
		self.speed = 100;
	}

	if (!self.target) {
		log('func_train without a target at', self.absmin);
		FreeEntity(self);
		return;
	}

	sv.SetBrushModel(self, self.model);
	InitMover(self);

	self.reached = TrainReached;

	// Start trains on the second frame, to make sure their targets have had
	// a chance to spawn.
	self.nextthink = level.time + FRAMETIME;
	self.think = TrainSetupTargets;
};

/**
 * TrainSetupTargets
 * 
 * Link all the corners together
 */
function TrainSetupTargets(ent) {
	var entities = FindEntity('targetname', ent.target);
	if (!entities.length) {
		log('func_train at', ent.absmin, 'with an unfound target');
		return;
	}
	ent.nextTrain = entities[0];

	var start;
	for (var path = ent.nextTrain; path !== start; path = next) {
		if (!start) {
			start = path;
		}

		if (!path.target) {
			log('Train corner at', path.s.origin, 'without a target');
			return;
		}

		// Find a path_corner among the targets.
		// There may also be other targets that get fired when the corner
		// is reached.
		entities = FindEntity('targetname', path.target);
		var next;

		for (var i = 0; i < entities.length; i++) {
			next = entities[i++];
			if (next.classname === 'path_corner') {
				break;
			}
		}

		path.nextTrain = next;
	}

	// Start the train moving from the first corner.
	TrainReached(ent);
}

/**
 * TrainReached
 */
function TrainReached(ent) {
	// Copy the apropriate values.
	var next = ent.nextTrain;
	if (!next || !next.nextTrain) {
		return;  // just stop
	}

	// Fire all other targets.
	UseTargets(next, null);

	// Set the new trajectory.
	ent.nextTrain = next.nextTrain;
	vec3.set(next.s.origin, ent.pos1);
	vec3.set(next.nextTrain.s.origin, ent.pos2);

	// If the path_corner has a speed, use that
	var speed = next.speed ? next.speed : ent.speed;
	if (speed < 1) {
		speed = 1;
	}

	// Calculate duration.
	var move = vec3.subtract(ent.pos2, ent.pos1, [0, 0, 0]);
	var length = vec3.length(move);

	ent.s.pos.trDuration = length * 1000 / speed;

	// Tequila comment: Be sure to send to clients after any fast move case.
	ent.svFlags &= ~SVF.NOCLIENT;

	// Tequila comment: Fast move case
	if (ent.s.pos.trDuration < 1) {
		// Tequila comment: As trDuration is used later in a division, we need to avoid that case now.
		// With null trDuration,
		// the calculated rocks bounding box becomes infinite and the engine think for a short time
		// any entity is riding that mover but not the world entity... In rare case, I found it
		// can also stuck every map entities after func_door are used.
		// The desired effect with very very big speed is to have instant move, so any not null duration
		// lower than a frame duration should be sufficient.
		// Afaik, the negative case don't have to be supported.
		ent.s.pos.trDuration = 1;

		// Tequila comment: Don't send entity to clients so it becomes really invisible 
		ent.svFlags |= SVF.NOCLIENT;
	}

	// Looping sound.
	ent.s.loopSound = next.soundLoop;

	// Start it going
	SetMoverState(ent, MOVER.ONETOTWO, level.time);

	// If there is a "wait" value on the target, don't start moving yet.
	if (next.wait) {
		ent.nextthink = level.time + next.wait * 1000;
		ent.think = TrainBeginMoving;
		ent.s.pos.trType = TR.STATIONARY;
	}
}

/**
 * TrainBeginMoving
 *
 * The wait time at a corner has completed, so start moving again.
*/
function TrainBeginMoving(ent) {
	ent.s.pos.trTime = level.time;
	ent.s.pos.trType = TR.LINEAR_STOP;
}