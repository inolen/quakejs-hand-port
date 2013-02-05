var pml = new PmoveLocals();
var pm = null;  // current pmove

var MAX_CLIP_PLANES = 5;
var MIN_WALK_NORMAL = 0.7;
var STEPSIZE = 18;
var TIMER_LAND = 130;
var OVERCLIP = 1.001;

// Movement parameters.
var pm_stopspeed = 100;
var pm_duckScale = 0.25;
var pm_swimScale = 0.50;

var pm_accelerate = 10.0;
var pm_airaccelerate = 1.0;
var pm_wateraccelerate = 4.0;
var pm_flyaccelerate = 8.0;

var pm_friction = 6.0;
var pm_waterfriction = 1.0;
var pm_flightfriction = 3.0;
var pm_spectatorfriction = 5.0;

var pm_jumpvelocity = 270;
var pm_doublejumpvelocity = 100;

/**
 * Pmove
 */
function Pmove(pmove) {
	var ps = pmove.ps;
	var cmd = pmove.cmd;

	var finalTime = cmd.serverTime;

	if (finalTime < ps.commandTime) {
		// error('Pmove: cmd.serverTime < ps.commandTime', cmd.serverTime, ps.commandTime);
		return;  // should not happen
	}

	if (finalTime > ps.commandTime + 1000) {
		ps.commandTime = finalTime - 1000;
	}

	ps.pmove_framecount = (ps.pmove_framecount+1) & ((1<<QS.PMOVEFRAMECOUNTBITS)-1);

	// Chop the move up if it is too long, to prevent framerate
	// dependent behavior.
	while (ps.commandTime !== finalTime) {
		var msec = finalTime - ps.commandTime;

		if (pmove.pmove_fixed) {
			if (msec > pmove.pmove_msec) {
				msec = pmove.pmove_msec;
			}
		} else {
			if (msec > 66) {
				msec = 66;
			}
		}
		cmd.serverTime = ps.commandTime + msec;

		PmoveSingle(pmove);

		if (pmove.ps.pm_flags & PMF.JUMP_HELD) {
			pmove.cmd.upmove = 20;
		}
	}
}

/**
 * PmoveSingle
 */
function PmoveSingle(pmove) {
	pm = pmove;

	var ps = pm.ps;
	var cmd = pm.cmd;

	// Clear all pmove local vars.
	pml.reset();

	// Determine the time.
	pml.msec = cmd.serverTime - ps.commandTime;
	if (pml.msec < 1) {
		pml.msec = 1;
	} else if (pml.msec > 200) {
		pml.msec = 200;
	}
	ps.commandTime = cmd.serverTime;
	pml.frameTime = pml.msec * 0.001;

	// Make sure walking button is clear if they are running, to avoid
	// proxy no-footsteps cheats.
	if (Math.abs(cmd.forwardmove) > 64 || Math.abs(cmd.rightmove) > 64) {
		cmd.buttons &= ~QS.BUTTON.WALKING;
	}

	// Set the firing flag for continuous beam weapons.
	if (!(ps.pm_flags & PMF.RESPAWNED) && !(ps.pm_flags & PMF.NO_ATTACK) &&
	    ps.pm_type !== PM.INTERMISSION && ps.pm_type !== PM.NOCLIP &&
	    (cmd.buttons & QS.BUTTON.ATTACK) && ps.ammo[ps.weapon]) {
		ps.eFlags |= EF.FIRING;
	} else {
		ps.eFlags &= ~EF.FIRING;
	}

	// Clear the respawned flag if attack and use are cleared.
	if (ps.stats[STAT.HEALTH] > 0 && !(cmd.buttons & (QS.BUTTON.ATTACK | QS.BUTTON.USE_HOLDABLE))) {
		ps.pm_flags &= ~PMF.RESPAWNED;
	}

	// Save old velocity for crashlanding.
	vec3.set(ps.origin, pml.previous_origin);
	vec3.set(ps.velocity, pml.previous_velocity);

	// Update our view angles.
	UpdateViewAngles(ps, cmd);
	QMath.AnglesToVectors(ps.viewangles, pml.forward, pml.right, pml.up);

	// Make sure walking button is clear if they are running, to avoid
	// proxy no-footsteps cheats.
	if (Math.abs(cmd.forwardmove) > 64 || Math.abs(cmd.rightmove) > 64) {
		cmd.buttons &= ~QS.BUTTON.WALKING;
	}

	if (pm.cmd.upmove < 10) {
		// Not holding jump.
		ps.pm_flags &= ~PMF.JUMP_HELD;
	}

	// Decide if backpedaling animations should be used
	if (cmd.forwardmove < 0) {
		ps.pm_flags |= PMF.BACKWARDS_RUN;
	} else if (pm.cmd.forwardmove > 0 || (cmd.forwardmove === 0 && cmd.rightmove)) {
		ps.pm_flags &= ~PMF.BACKWARDS_RUN;
	}

	if (ps.pm_type >= PM.DEAD) {
		cmd.forwardmove = 0;
		cmd.rightmove = 0;
		cmd.upmove = 0;
	}

	if (pm.ps.pm_type === PM.SPECTATOR) {
		CheckDuck();
		FlyMove();
		DropTimers();
		return;
	}

	if (pm.ps.pm_type === PM.NOCLIP) {
		NoclipMove();
		DropTimers();
		return;
	}

	// if (pm.ps.pm_type == PM_FREEZE) {
	// 	return;		// no movement at all
	// }

	if (pm.ps.pm_type == PM.INTERMISSION || pm.ps.pm_type == PM.SPINTERMISSION) {
		return;  // no movement at all
	}

	// Set watertype, and waterlevel.
	SetWaterLevel();
	pml.previous_waterlevel = pm.waterlevel;

	// Set mins, maxs and viewheight.
	CheckDuck();

	// Set ground entity.
	GroundTrace();

	if (ps.pm_type === PM.DEAD) {
		DeadMove();
	}

	// Kill animation timers.
	DropTimers();

	if (ps.pm_flags & PMF.TIME_WATERJUMP) {
		WaterJumpMove();
	} else if (pm.waterlevel > 1) {
		// Swimming.
		WaterMove();
	} else if (pml.walking) {
		WalkMove();
	} else {
		AirMove();
	}

	// Set groundtype and waterlevel post-move.
	GroundTrace();
	SetWaterLevel();

	// Weapons.
	UpdateWeapon();

	// Torso animations.
	TorsoAnimation();

	// Footstep events / legs animations.
	FootstepEvents();

	// Entering / leaving water splashes.
	WaterEvents();

	// Snap some parts of playerstate to save network bandwidth.
	// NOTE This is necessary to enable jumps such as the mega jump in dm13.
	QMath.SnapVector(ps.velocity);

	pm = null;
}

/**
 * CmdScale
 *
 * Returns the scale factor to apply to cmd movements
 * This allows the clients to use axial -127 to 127 values for all directions
 * without getting a sqrt(2) distortion in speed.
 */
function CmdScale(cmd, speed) {
	var max = Math.abs(cmd.forwardmove);
	if (Math.abs(cmd.rightmove) > max) {
		max = Math.abs(cmd.rightmove);
	}
	if (Math.abs(cmd.upmove) > max) {
		max = Math.abs(cmd.upmove);
	}
	if (!max) {
		return 0;
	}

	var total = Math.sqrt(cmd.forwardmove * cmd.forwardmove + cmd.rightmove * cmd.rightmove + cmd.upmove * cmd.upmove);
	var scale = speed * max / (127.0 * total);

	return scale;
}

/**
 * SetWaterLevel
 *
 * Get waterlevel, accounting for ducking.
 * FIXME: avoid this twice?  certainly if not moving
 */
function SetWaterLevel() {
	var ps = pm.ps;

	pm.waterlevel = GetWaterLevel(ps.origin, ps.viewheight, ps.clientNum, pm.pointContents);

	var point = vec3.createFrom(ps.origin[0], ps.origin[1], ps.origin[2] + MINS_Z + 1);
	var contents = pm.pointContents(point, -1);
	if (contents & MASK.WATER) {
		pm.watertype = contents;
	} else {
		pm.watertype = 0;
	}
}

/**
 * CheckDuck
 */
function CheckDuck() {
	var ps = pm.ps;
	var trace = new QS.TraceResults();

	pm.mins[0] = -15;
	pm.mins[1] = -15;

	pm.maxs[0] = 15;
	pm.maxs[1] = 15;

	pm.mins[2] = MINS_Z;

	if (pm.pm_type === PM.DEAD) {
		pm.maxs[2] = -8;
		ps.viewheight = DEAD_VIEWHEIGHT;
		return;
	}

	if (pm.cmd.upmove < 0) {
		// Duck.
		ps.pm_flags |= PMF.DUCKED;
	} else {
		// Stand up if possible.
		if (ps.pm_flags & PMF.DUCKED) {
			// Try to stand up.
			pm.maxs[2] = 32;
			pm.trace(trace, ps.origin, ps.origin, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
			if (!trace.allSolid) {
				ps.pm_flags &= ~PMF.DUCKED;
			}
		}
	}

	if (ps.pm_flags & PMF.DUCKED) {
		pm.maxs[2] = 16;
		ps.viewheight = CROUCH_VIEWHEIGHT;
	} else {
		pm.maxs[2] = 32;
		ps.viewheight = DEFAULT_VIEWHEIGHT;
	}
}

/**
 * CheckJump
 */
function CheckJump() {
	var ps = pm.ps;

	if (pm.cmd.upmove < 10) {
		// Not holding jump.
		return false;
	}

	// Must wait for jump to be released.
	if (ps.pm_flags & PMF.JUMP_HELD) {
		// Clear upmove so cmdscale doesn't lower running speed.
		pm.cmd.upmove = 0;
		return false;
	}

	pml.groundPlane = false;  // jumping away
	pml.walking = false;
	ps.pm_flags |= PMF.JUMP_HELD;

	ps.groundEntityNum = QS.ENTITYNUM_NONE;
	ps.velocity[2] = pm_jumpvelocity;
	if (false) {
		if (ps.stats[STAT.JUMPTIME] > 0) {
			ps.velocity[2] += pm_doublejumpvelocity;
		}

		ps.stats[STAT.JUMPTIME] = 400;
	}
	AddEvent(EV.JUMP);

	if (pm.cmd.forwardmove >= 0) {
		ForceLegsAnim(ANIM.LEGS_JUMP);
		ps.pm_flags &= ~PMF.BACKWARDS_JUMP;
	} else {
		ForceLegsAnim(ANIM.LEGS_JUMPB);
		ps.pm_flags |= PMF.BACKWARDS_JUMP;
	}

	return true;
}

/**
 * GroundTrace
 */
function GroundTrace() {
	var ps = pm.ps;
	var trace = new QS.TraceResults();

	var point = vec3.createFrom(ps.origin[0], ps.origin[1], ps.origin[2] - 0.25);
	pm.trace(trace, ps.origin, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

	pml.groundTrace = trace;

	// Do something corrective if the trace starts in a solid.
	if (trace.allSolid) {
		// This will nudge us around and, if successful, copy its
		// new successful trace results into ours.
		if (!CorrectAllSolid(trace)) {
			return;
		}
	}

	// If the trace didn't hit anything, we are in free fall.
	if (trace.fraction === 1.0) {
		GroundTraceMissed();
		return;
	}

	// Check if getting thrown off the ground.
	if (ps.velocity[2] > 0 && vec3.dot(ps.velocity, trace.plane.normal) > 10 ) {
		// Go into jump animation.
		if (pm.cmd.forwardmove >= 0) {
			ForceLegsAnim(ANIM.LEGS_JUMP);
			ps.pm_flags &= ~PMF.BACKWARDS_JUMP;
		} else {
			ForceLegsAnim(ANIM.LEGS_JUMPB);
			ps.pm_flags |= PMF.BACKWARDS_JUMP;
		}

		ps.groundEntityNum = QS.ENTITYNUM_NONE;
		pml.groundPlane = false;
		pml.walking = false;

		return;
	}

	if (trace.plane.normal[2] < MIN_WALK_NORMAL) {
		ps.groundEntityNum = QS.ENTITYNUM_NONE;
		pml.groundPlane = true;
		pml.walking = false;

		return;
	}

	pml.groundPlane = true;
	pml.walking = true;

	// Hitting solid ground will end a waterjump.
	if (ps.pm_flags & PMF.TIME_WATERJUMP) {
		ps.pm_flags &= ~(PMF.TIME_WATERJUMP | PMF.TIME_LAND);
		ps.pm_time = 0;
	}

	if (ps.groundEntityNum === QS.ENTITYNUM_NONE) {
		CrashLand();

		// Don't do landing time if we were just going down a slope.
		if (pml.previous_velocity[2] < -200) {
			// Don't allow another jump for a little while.
			ps.pm_flags |= PMF.TIME_LAND;
			ps.pm_time = 250;
		}
	}

	// Set new groundEntityNum after crashland check.
	ps.groundEntityNum = trace.entityNum;

	AddTouchEnt(trace.entityNum);
}

/**
 * CheckWaterJump
 */
function CheckWaterJump() {
	var ps = pm.ps;

	if (ps.pm_time) {
		return false;
	}

	// Check for water jump.
	if (pm.waterlevel !== 2) {
		return false;
	}

	var flatforward = vec3.createFrom(pml.forward[0], pml.forward[1], 0);
	vec3.normalize(flatforward);

	var spot = vec3.add(vec3.scale(flatforward, 30, vec3.create()), ps.origin);
	spot[2] += 4;

	var contents = pm.pointContents(spot, ps.clientNum);
	if (!(contents & QS.CONTENTS.SOLID)) {
		return false;
	}

	spot[2] += 16;
	contents = pm.pointContents(spot, ps.clientNum);
	if (contents & (QS.CONTENTS.SOLID | QS.CONTENTS.PLAYERCLIP | QS.CONTENTS.BODY)) {
		return false;
	}

	// Jump out of water.
	vec3.scale(pml.forward, 200, ps.velocity);
	ps.velocity[2] = 350;

	ps.pm_flags |= PMF.TIME_WATERJUMP;
	ps.pm_time = 2000;

	return true;
}

/**
 * CorrectAllSolid
 */
function CorrectAllSolid(results) {
	var ps = pm.ps;
	var point = vec3.create();
	var trace = new QS.TraceResults();

	// Jitter around.
	for (var i = -1; i <= 1; i++) {
		for (var j = -1; j <= 1; j++) {
			for (var k = -1; k <= 1; k++) {
				vec3.set(ps.origin, point);
				point[0] += i;
				point[1] += j;
				point[2] += k;

				pm.trace(trace, point, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

				if (!trace.allSolid) {
					// Copy the results back into the original so GroundTrace can carry on.
					trace.clone(results);

					return true;
				}
			}
		}
	}

	ps.groundEntityNum = QS.ENTITYNUM_NONE;
	pml.groundPlane = false;
	pml.walking = false;

	return false;
}

/**
 * GroundTraceMissed
 */
function GroundTraceMissed() {
	var ps = pm.ps;
	var trace = new QS.TraceResults();

	if (ps.groundEntityNum !== QS.ENTITYNUM_NONE) {
		// If they aren't in a jumping animation and the ground is a ways away, force into it.
		// If we didn't do the trace, the player would be backflipping down staircases.
		var point = vec3.create(ps.origin);
		point[2] -= 64;

		pm.trace(trace, ps.origin, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
		if (trace.fraction === 1.0) {
			if (pm.cmd.forwardmove >= 0) {
				ForceLegsAnim(ANIM.LEGS_JUMP);
				ps.pm_flags &= ~PMF.BACKWARDS_JUMP;
			} else {
				ForceLegsAnim(ANIM.LEGS_JUMPB);
				ps.pm_flags |= PMF.BACKWARDS_JUMP;
			}
		}
	}

	ps.groundEntityNum = QS.ENTITYNUM_NONE;
	pml.groundPlane = false;
	pml.walking = false;
}

/**
 * DeadMove
 */
function DeadMove() {
	if (!pml.walking) {
		return;
	}

	var ps = pm.ps;

	// Extra friction.
	var speed = vec3.length(ps.velocity);
	speed -= 20;
	if (speed <= 0) {
		ps.velocity[0] = ps.velocity[1] = ps.velocity[2] = 0;
	} else {
		vec3.normalize(ps.velocity);
		vec3.scale(ps.velocity, speed);
	}
}

/**
 * FlyMove
 */
function FlyMove() {
	var ps = pm.ps;
	var cmd = pm.cmd;

	// normal slowdown
	Friction(true);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = vec3.create();
	for (var i = 0; i < 3; i++) {
		wishvel[i] = scale * pml.forward[i]*cmd.forwardmove + scale * pml.right[i]*cmd.rightmove;
	}
	wishvel[2] += cmd.upmove;
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, vec3.create());

	Accelerate(wishdir, wishspeed, pm_flyaccelerate);
	StepSlideMove(false);
}

/**
 * NoclipMove
 */
function NoclipMove() {
	var ps = pm.ps;
	var cmd = pm.cmd;

	ps.viewheight = DEFAULT_VIEWHEIGHT;

	// Friction.
	var speed = vec3.length(ps.velocity);

	if (speed < 1) {
		vec3.set(QMath.vec3origin, ps.velocity);
	} else {
		var friction = pm_friction * 1.5;  // extra friction
		var control = speed < pm_stopspeed ? pm_stopspeed : speed;
		var drop = control * friction * pml.frameTime;

		// Scale the velocity.
		var newspeed = speed - drop;
		if (newspeed < 0) {
			newspeed = 0;
		}
		newspeed /= speed;

		vec3.scale(ps.velocity, newspeed);
	}

	// Accelerate.
	var scale = CmdScale(cmd, ps.speed);
	var wishvel = vec3.create();
	for (var i = 0 ; i < 3 ; i++) {
		wishvel[i] = pml.forward[i]*cmd.forwardmove + pml.right[i]*cmd.rightmove;
	}
	wishvel[2] += cmd.upmove;
	var wishspeed = vec3.length(wishvel) * scale;
	var wishdir = vec3.normalize(wishvel, vec3.create());

	Accelerate(wishdir, wishspeed, pm_accelerate);

	// Move.
	vec3.add(ps.origin, vec3.scale(ps.velocity, pml.frameTime, vec3.create()));
}

/**
 * AirMove
 */
function AirMove() {
	var ps = pm.ps;
	var cmd = pm.cmd;

	Friction();

	// Set the movementDir so clients can rotate the legs for strafing.
	SetMovementDir();

	// project moves down to flat plane
	pml.forward[2] = 0;
	pml.right[2] = 0;
	vec3.normalize(pml.forward);
	vec3.normalize(pml.right);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = vec3.create();
	for (var i = 0; i < 2 ; i++) {
		wishvel[i] = pml.forward[i]*cmd.forwardmove + pml.right[i]*cmd.rightmove;
	}
	wishvel[2] = 0;
	var wishdir = vec3.normalize(wishvel, vec3.create());
	var wishspeed = vec3.length(wishvel) * scale;

	// Not on ground, so little effect on velocity.
	Accelerate(wishdir, wishspeed, pm_airaccelerate);

	// We may have a ground plane that is very steep, even though
	// we don't have a groundentity. Slide along the steep plane.
	if (pml.groundPlane) {
		ps.velocity = ClipVelocity(ps.velocity, pml.groundTrace.plane.normal, OVERCLIP);
	}

	StepSlideMove(true);
}

/**
 * WaterMove
 */
function WaterMove() {
	var ps = pm.ps;
	var cmd = pm.cmd;

	if (CheckWaterJump()) {
		WaterJumpMove();
		return;
	}

	Friction();

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = vec3.create();
	if (!scale) {
		wishvel[0] = 0;
		wishvel[1] = 0;
		wishvel[2] = -60;  // sink towards bottom
	} else {
		for (var i = 0; i < 3 ; i++) {
			wishvel[i] = pml.forward[i] * cmd.forwardmove + pml.right[i] * cmd.rightmove;
		}
		wishvel[2] += scale * pm.cmd.upmove;
	}

	var wishdir = vec3.normalize(wishvel, vec3.create());
	var wishspeed = vec3.length(wishvel);

	if (wishspeed > ps.speed * pm_swimScale) {
		wishspeed = ps.speed * pm_swimScale;
	}

	Accelerate(wishdir, wishspeed, pm_wateraccelerate);

	// Make sure we can go up slopes easily under water.
	if (pml.groundPlane && vec3.dot(ps.velocity, pml.groundTrace.plane.normal) < 0) {
		var vel = vec3.length(ps.velocity);

		// Slide along the ground plane.
		ClipVelocity(ps.velocity, pml.groundTrace.plane.normal, ps.velocity, OVERCLIP);

		vec3.normalize(ps.velocity);
		vec3.scale(ps.velocity, vel);
	}

	SlideMove(false);
}

/**
 * WaterJumpMove
 */
function WaterJumpMove() {
	var ps = pm.ps;

	// Waterjump has no control, but falls.
	StepSlideMove(true);

	ps.velocity[2] -= ps.gravity * pml.frameTime;
	if (ps.velocity[2] < 0) {
		// Cancel as soon as we are falling down again.
		ps.pm_flags &= ~PMF.ALL_TIMES;
		ps.pm_time = 0;
	}
}

/**
 * WalkMove
 */
function WalkMove() {
	var ps = pm.ps;
	var cmd = pm.cmd;

	if (CheckJump()) {
		AirMove();
		return;
	}

	Friction();

	// Set the movementDir so clients can rotate the legs for strafing.
	SetMovementDir();

	// Project moves down to flat plane.
	pml.forward[2] = 0;
	pml.right[2] = 0;

	// Project the forward and right directions onto the ground plane.
	pml.forward = ClipVelocity(pml.forward, pml.groundTrace.plane.normal, OVERCLIP);
	pml.right = ClipVelocity(pml.right, pml.groundTrace.plane.normal, OVERCLIP);
	vec3.normalize(pml.forward);
	vec3.normalize(pml.right);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = vec3.create();
	for (var i = 0 ; i < 3 ; i++ ) {
		wishvel[i] = pml.forward[i]*cmd.forwardmove + pml.right[i]*cmd.rightmove;
	}
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, vec3.create());
	wishspeed *= scale;

	// Clamp the speed lower if ducking.
	if (ps.pm_flags & PMF.DUCKED) {
		if (wishspeed > ps.speed * pm_duckScale ) {
			wishspeed = ps.speed * pm_duckScale;
		}
	}

	// Clamp the speed lower if wading or walking on the bottom.
	if (pm.waterlevel) {
		var waterScale = pm.waterlevel / 3.0;
		waterScale = 1.0 - (1.0 - pm_swimScale) * waterScale;
		if (wishspeed > ps.speed * waterScale) {
			wishspeed = ps.speed * waterScale;
		}
	}

	// When a player gets hit, they temporarily lose
	// full control, which allows them to be moved a bit.
	var accelerate = pm_accelerate;

	if ((pml.groundTrace.surfaceFlags & QS.SURF.SLICK) || (ps.pm_flags & PMF.TIME_KNOCKBACK)) {
		accelerate = pm_airaccelerate;
	}

	Accelerate(wishdir, wishspeed, accelerate);

	if ((pml.groundTrace.surfaceFlags & QS.SURF.SLICK) || (ps.pm_flags & PMF.TIME_KNOCKBACK)) {
		ps.velocity[2] -= ps.gravity * pml.frameTime;
	}

	var vel = vec3.length(ps.velocity);

	// Slide along the ground plane.
	ps.velocity = ClipVelocity(ps.velocity, pml.groundTrace.plane.normal, OVERCLIP);

	// Don't decrease velocity when going up or down a slope.
	vec3.normalize(ps.velocity);
	vec3.scale(ps.velocity, vel);

	// Don't do anything if standing still.
	if (!ps.velocity[0] && !ps.velocity[1]) {
		return;
	}

	StepSlideMove(false);
}

/**
 * SetMovementDir
 *
 * Determine the rotation of the legs relative
 * to the facing dir
 */
function SetMovementDir() {
	var ps = pm.ps;

	if (pm.cmd.forwardmove || pm.cmd.rightmove) {
		if (pm.cmd.rightmove === 0 && pm.cmd.forwardmove > 0) {
			ps.movementDir = 0;
		} else if (pm.cmd.rightmove < 0 && pm.cmd.forwardmove > 0) {
			ps.movementDir = 1;
		} else if (pm.cmd.rightmove < 0 && pm.cmd.forwardmove === 0) {
			ps.movementDir = 2;
		} else if (pm.cmd.rightmove < 0 && pm.cmd.forwardmove < 0) {
			ps.movementDir = 3;
		} else if (pm.cmd.rightmove === 0 && pm.cmd.forwardmove < 0) {
			ps.movementDir = 4;
		} else if (pm.cmd.rightmove > 0 && pm.cmd.forwardmove < 0) {
			ps.movementDir = 5;
		} else if (pm.cmd.rightmove > 0 && pm.cmd.forwardmove === 0) {
			ps.movementDir = 6;
		} else if (pm.cmd.rightmove > 0 && pm.cmd.forwardmove > 0) {
			ps.movementDir = 7;
		}
	} else {
		// If they aren't actively going directly sideways,
		// change the animation to the diagonal so they
		// don't stop too crooked.
		if (ps.movementDir === 2) {
			ps.movementDir = 1;
		} else if (ps.movementDir === 6) {
			ps.movementDir = 7;
		}
	}
}

/**
 * Friction
 */
function Friction(flying) {
	var ps = pm.ps;

	var vec = vec3.create(ps.velocity);
	if (pml.walking) {
		vec[2] = 0;	// ignore slope movement
	}

	var speed = vec3.length(vec);
	if (speed < 1) {
		ps.velocity[0] = 0;
		ps.velocity[1] = 0; // allow sinking underwater
		// FIXME: still have z friction underwater?
		return;
	}

	var drop = 0;

	// Apply ground friction.
	if (pm.waterlevel <= 1) {
		if (pml.walking && !(pml.groundTrace.surfaceFlags & QS.SURF.SLICK)) {
			// If getting knocked back, no friction.
			if (!(ps.pm_flags & PMF.TIME_KNOCKBACK)) {
				var control = speed < pm_stopspeed ? pm_stopspeed : speed;
				drop += control * pm_friction * pml.frameTime;
			}
		}
	}

	// Apply water friction even if just wading.
	if (pm.waterlevel) {
		drop += speed * pm_waterfriction * pm.waterlevel * pml.frameTime;
	}

	if (flying) {
		drop += speed * pm_flightfriction * pml.frameTime;
	}

	var newspeed = speed - drop;
	if (newspeed < 0) {
		newspeed = 0;
	}
	newspeed /= speed;

	vec3.scale(ps.velocity, newspeed);
}

/**
 * Accelerate
 */
function Accelerate(wishdir, wishspeed, accel) {
	var ps = pm.ps;
	var currentspeed = vec3.dot(ps.velocity, wishdir);
	var addspeed = wishspeed - currentspeed;

	if (addspeed <= 0) {
		return;
	}

	var accelspeed = accel * pml.frameTime * wishspeed;

	if (accelspeed > addspeed) {
		accelspeed = addspeed;
	}

	vec3.add(ps.velocity, vec3.scale(wishdir, accelspeed, vec3.create()));
}

/**
 * ClipVelocity
 */
function ClipVelocity(vel, normal, overbounce) {
	var backoff = vec3.dot(vel, normal);

	if (backoff < 0) {
		backoff *= overbounce;
	} else {
		backoff /= overbounce;
	}

	var change = vec3.scale(normal, backoff, vec3.create());
	return vec3.subtract(vel, change, vec3.create());
}

/**
 * SlideMove
 */
function SlideMove(gravity) {
	var ps = pm.ps;
	var endVelocity = vec3.create();
	var time_left = pml.frameTime;
	var planes = [];
	var numbumps = 4;
	var end = vec3.create();
	var trace = new QS.TraceResults();

	if (gravity) {
		vec3.set(ps.velocity, endVelocity);
		endVelocity[2] -= ps.gravity * time_left;
		ps.velocity[2] = (ps.velocity[2] + endVelocity[2]) * 0.5;

		if (pml.groundPlane) {
			// Slide along the ground plane.
			ps.velocity = ClipVelocity(ps.velocity, pml.groundTrace.plane.normal, OVERCLIP);
		}
	}

	// Never turn against the ground plane.
	if (pml.groundPlane) {
		planes.push(vec3.set(pml.groundTrace.plane.normal, vec3.create()));
	}

	// Never turn against original velocity.
	planes.push(vec3.normalize(ps.velocity, vec3.create()));

	for (var bumpcount = 0; bumpcount < numbumps; bumpcount++) {
		// Calculate position we are trying to move to.
		vec3.add(ps.origin, vec3.scale(ps.velocity, time_left, vec3.create()), end);

		// See if we can make it there.
		pm.trace(trace, ps.origin, end, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

		if (trace.allSolid) {
			// Entity is completely trapped in another solid.
			ps.velocity[2] = 0; // don't build up falling damage, but allow sideways acceleration
			return false;
		}

		if (trace.fraction > 0) {
			// Actually covered some distance.
			vec3.set(trace.endPos, ps.origin);
		}

		if (trace.fraction === 1) {
			 break;  // moved the entire distance
		}

		// Save entity for contact.
		AddTouchEnt(trace.entityNum);

		time_left -= time_left * trace.fraction;

		if (planes.length >= MAX_CLIP_PLANES) {
			// this shouldn't really happen
			ps.velocity = vec3.create();
			return false;
		}

		//
		// If this is the same plane we hit before, nudge velocity
		// out along it, which fixes some epsilon issues with
		// non-axial planes.
		//
		for (var i = 0; i < planes.length; i++) {
			if (vec3.dot(trace.plane.normal, planes[i]) > 0.99) {
				vec3.add(ps.velocity, trace.plane.normal);
				break;
			}
		}
		if (i < planes.length) {
			continue;
		}
		planes.push(vec3.set(trace.plane.normal, vec3.create()));

		//
		// Modify velocity so it parallels all of the clip planes.
		//

		// Find a plane that it enters.
		for (var i = 0; i < planes.length; ++i) {
			var into = vec3.dot(ps.velocity, planes[i]);
			if (into >= 0.1) {
				continue;  // move doesn't interact with the plane
			}

			// Slide along the plane.
			var clipVelocity = ClipVelocity(ps.velocity, planes[i], OVERCLIP);
			var endClipVelocity = ClipVelocity(endVelocity, planes[i], OVERCLIP);

			// See if there is a second plane that the new move enters.
			for (var j = 0; j < planes.length; j++) {
				if (j === i) {
					continue;
				}
				if (vec3.dot(clipVelocity, planes[j]) >= 0.1) {
					continue;  // move doesn't interact with the plane
				}

				// Try clipping the move to the plane.
				clipVelocity = ClipVelocity(clipVelocity, planes[j], OVERCLIP);
				endClipVelocity = ClipVelocity(endClipVelocity, planes[j], OVERCLIP);

				// See if it goes back into the first clip plane.
				if (vec3.dot(clipVelocity, planes[i]) >= 0) {
					continue;
				}

				// Slide the original velocity along the crease.
				var dir = vec3.cross(planes[i], planes[j], vec3.create());
				vec3.normalize(dir);
				var d = vec3.dot(dir, ps.velocity);
				vec3.scale(dir, d, clipVelocity);

				vec3.cross(planes[i], planes[j], dir);
				vec3.normalize(dir);
				d = vec3.dot(dir, endVelocity);
				vec3.scale(dir, d, endClipVelocity);

				// See if there is a third plane the the new move enters.
				for (var k = 0; k < planes.length; k++) {
					if ( k == i || k == j ) {
						continue;
					}
					if (vec3.dot(clipVelocity, planes[k]) >= 0.1) {
						continue;  // move doesn't interact with the plane
					}
					// Stop dead at a tripple plane interaction.
					ps.velocity = vec3.create();
					return false;
				}
			}

			// If we have fixed all interactions, try another move.
			vec3.set(clipVelocity, ps.velocity);
			vec3.set(endClipVelocity, endVelocity);
			break;
		}
	}

	if (gravity) {
		vec3.set(endVelocity, ps.velocity);
	}

	return bumpcount === 0;
}

/**
 * StepSlideMove
 */
function StepSlideMove(gravity) {
	var ps = pm.ps;
	var trace = new QS.TraceResults();

	// Make sure these are stored BEFORE the initial SlideMove.
	var start_o = vec3.create(ps.origin);
	var start_v = vec3.create(ps.velocity);

	// We got exactly where we wanted to go first try.
	if (SlideMove(gravity)) {
		return;
	}

	// Never step up when you still have up velocity.
	var up = vec3.createFrom(0, 0, 1);
	var down = vec3.create(start_o);
	down[2] -= STEPSIZE;

	pm.trace(trace, start_o, down, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	if (ps.velocity[2] > 0 && (trace.fraction === 1.0 || vec3.dot(trace.plane.normal, up) < 0.7)) {
		return;
	}

	// Test the player position if they were a stepheight higher.
	vec3.set(start_o, up);
	up[2] += STEPSIZE;

	pm.trace(trace, start_o, up, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	if (trace.allSolid) {
		return;  // can't step up
	}

	// Try slidemove from this position.
	vec3.set(trace.endPos, ps.origin);
	vec3.set(start_v, ps.velocity);
	SlideMove(gravity);

	// Push down the final amount.
	var stepSize = trace.endPos[2] - start_o[2];
	vec3.set(ps.origin, down);
	down[2] -= stepSize;
	pm.trace(trace, ps.origin, down, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	if (!trace.allSolid) {
		vec3.set(trace.endPos, ps.origin);
	}
	if (trace.fraction < 1.0) {
		ps.velocity = ClipVelocity(ps.velocity, trace.plane.normal, OVERCLIP);
	}

	// Use the step move.
	var delta = ps.origin[2] - start_o[2];
	if (delta > 2) {
		if (delta < 7) {
			AddEvent(EV.STEP_4);
		} else if (delta < 11) {
			AddEvent(EV.STEP_8);
		} else if (delta < 15 ) {
			AddEvent(EV.STEP_12);
		} else {
			AddEvent(EV.STEP_16);
		}
	}
}

/**
 * UpdateViewAngles
 */
function UpdateViewAngles(ps, cmd) {
	if (ps.pm_type === PM.INTERMISSION || ps.pm_type === PM.SPINTERMISSION) {
		return;  // no view changes at all
	}

	if (ps.pm_type !== PM.SPECTATOR && ps.stats[STAT.HEALTH] <= 0) {
		return;  // no view changes at all
	}

	for (var i = 0; i < 3; i++) {
		// Circularly clamp uint16 to in16.
		var temp = (cmd.angles[i] + ps.delta_angles[i]) & 0xFFFF;
		if (temp > 0x7FFF) {
			temp = temp - 0xFFFF;
		}

		if (i === QMath.PITCH) {
			// Don't let the player look up or down more than 90 degrees.
			if (temp > 16000) {
				ps.delta_angles[i] = 16000 - cmd.angles[i];
				temp = 16000;
			} else if (temp < -16000) {
				ps.delta_angles[i] = -16000 - cmd.angles[i];
				temp = -16000;
			}
		}

		ps.viewangles[i] = QMath.ShortToAngle(temp);
	}
}

/**
 * DropTimers
 */
function DropTimers() {
	var ps = pm.ps;

	// Drop misc timing counter.
	if (ps.pm_time) {
		if (pml.msec >= ps.pm_time) {
			ps.pm_flags &= ~PMF.ALL_TIMES;
			ps.pm_time = 0;
		} else {
			ps.pm_time -= pml.msec;
		}
	}

	// Drop animation counter.
	if (ps.legsTimer > 0) {
		ps.legsTimer -= pml.msec;
		if (ps.legsTimer < 0) {
			ps.legsTimer = 0;
		}
	}

	if (ps.torsoTimer > 0) {
		ps.torsoTimer -= pml.msec;
		if (ps.torsoTimer < 0) {
			ps.torsoTimer = 0;
		}
	}

	// Drop double jump timer.
	if (ps.stats[STAT.JUMPTIME] > 0) {
		ps.stats[STAT.JUMPTIME] -= pml.msec;
	}
}

/**
 * UpdateWeapon
 */
function UpdateWeapon() {
	var ps = pm.ps;

	// Don't allow attack until all buttons are up.
	if (ps.pm_flags & PMF.RESPAWNED) {
		return;
	}

	// Ignore if spectator.
	if (pm.ps.persistant[PERS.SPECTATOR_STATE] !== SPECTATOR.NOT) {
		return;
	}

	// Check for dead player.
	if (ps.pm_type === PM.DEAD) {
		ps.weapon = WP.NONE;
		return;
	}

	// // Check for item using.
	// if ( pm.cmd.buttons & BUTTON_USE_HOLDABLE ) {
	// 	if ( ! ( pm.ps.pm_flags & PMF.USE_ITEM_HELD ) ) {
	// 		if ( bg_itemlist[pm.ps.stats[STAT.HOLDABLE_ITEM]].giTag == HI_MEDKIT
	// 			&& pm.ps.stats[STAT.HEALTH] >= (pm.ps.stats[STAT.MAX_HEALTH] + 25) ) {
	// 			// don't use medkit if at max health
	// 		} else {
	// 			pm.ps.pm_flags |= PMF.USE_ITEM_HELD;
	// 			PM_AddEvent( EV_USE_ITEM0 + bg_itemlist[pm.ps.stats[STAT.HOLDABLE_ITEM]].giTag );
	// 			pm.ps.stats[STAT.HOLDABLE_ITEM] = 0;
	// 		}
	// 		return;
	// 	}
	// } else {
	// 	pm.ps.pm_flags &= ~PMF.USE_ITEM_HELD;
	// }

	// Make weapon function.
	if (ps.weaponTime > 0) {
		ps.weaponTime -= pml.msec;
	}

	// Check for weapon change.
	// Can't change if weapon is firing, but can change
	// again if lowering or raising.
	if (ps.weaponTime <= 0 || ps.weaponState !== WS.FIRING) {
		if (ps.weapon !== pm.cmd.weapon) {
			BeginWeaponChange(pm.cmd.weapon);
		}
	}

	if (ps.weaponTime > 0) {
		return;
	}

	// Change weapon if time.
	if (ps.weaponState === WS.DROPPING) {
		FinishWeaponChange();
		return;
	}

	if (ps.weaponState === WS.RAISING) {
		ps.weaponState = WS.READY;
		if (ps.weapon === WP.GAUNTLET) {
			StartTorsoAnim(ANIM.TORSO_STAND2);
		} else {
			StartTorsoAnim(ANIM.TORSO_STAND);
		}
		return;
	}

	// CA warmups don't allow attacking.
	if (ps.pm_flags & PMF.NO_ATTACK) {
		return;
	}

	// Check for fire.
	if (!(pm.cmd.buttons & QS.BUTTON.ATTACK)) {
		ps.weaponTime = 0;
		ps.weaponState = WS.READY;
		return;
	}

	// Start the animation even if out of ammo.
	if (ps.weapon === WP.GAUNTLET) {
		// The guantlet only "fires" when it actually hits something.
		if (!pm.gauntletHit) {
			ps.weaponTime = 0;
			ps.weaponState = WS.READY;
			return;
		}
		StartTorsoAnim(ANIM.TORSO_ATTACK2);
	} else {
		StartTorsoAnim(ANIM.TORSO_ATTACK);
	}

	ps.weaponState = WS.FIRING;

	// Check for out of ammo.
	if (!ps.ammo[ps.weapon]) {
		AddEvent(EV.NOAMMO);
		ps.weaponTime += 500;
		return;
	}

	// Take an ammo away if not infinite.
	if (ps.ammo[ps.weapon] !== -1) {
		ps.ammo[ps.weapon]--;
	}

	// Fire weapon.
	AddEvent(EV.FIRE_WEAPON);

	var addTime = 0;

	switch (ps.weapon) {
		case WP.GAUNTLET:
			addTime = 400;
			break;
		case WP.LIGHTNING:
			addTime = 50;
			break;
		case WP.SHOTGUN:
			addTime = 1000;
			break;
		case WP.MACHINEGUN:
			addTime = 100;
			break;
		case WP.GRENADE_LAUNCHER:
			addTime = 800;
			break;
		case WP.ROCKET_LAUNCHER:
			addTime = 800;
			break;
		case WP.PLASMAGUN:
			addTime = 100;
			break;
		case WP.RAILGUN:
			addTime = 1500;
			break;
		case WP.BFG:
			addTime = 200;
			break;
		case WP.GRAPPLING_HOOK:
			addTime = 400;
			break;
		default:
			addTime = 400;
			break;
	}

	if (ps.powerups[PW.HASTE]) {
		addTime /= 1.3;
	}

	ps.weaponTime += addTime;
}

/**
 * BeginWeaponChange
 */
function BeginWeaponChange(weapon) {
	var ps = pm.ps;

	if (weapon <= WP.NONE || weapon >= WP.NUM_WEAPONS) {
		return;
	}

	if (!(ps.stats[STAT.WEAPONS] & (1 << weapon))) {
		return;
	}

	if (ps.weaponState == WS.DROPPING) {
		return;
	}

	AddEvent(EV.CHANGE_WEAPON);
	ps.weaponState = WS.DROPPING;
	ps.weaponTime += 200;
	StartTorsoAnim(ANIM.TORSO_DROP);
}

/**
 * FinishWeaponChange
 */
function FinishWeaponChange() {
	var ps = pm.ps;
	var weapon = pm.cmd.weapon;

	if (weapon < WP.NONE || weapon >= WP.NUM_WEAPONS) {
		weapon = WP.NONE;
	}
	if (!(ps.stats[STAT.WEAPONS] & (1 << weapon))) {
		weapon = WP.NONE;
	}

	ps.weapon = weapon;
	ps.weaponState = WS.RAISING;
	ps.weaponTime += 250;
	StartTorsoAnim(ANIM.TORSO_RAISE);
}

/**
 * TorsoAnimation
 */
function TorsoAnimation() {
	var ps = pm.ps;

	if (ps.weaponState === WS.READY) {
		if (ps.weapon == WP.GAUNTLET) {
			ContinueTorsoAnim(ANIM.TORSO_STAND2);
		} else {
			ContinueTorsoAnim(ANIM.TORSO_STAND);
		}
	}
}

/**
 * CrashLand
 *
 * Check for hard landings that generate sound events.
 */
function CrashLand() {
	var ps = pm.ps;

	// Decide which landing animation to use.
	if (ps.pm_flags & PMF.BACKWARDS_JUMP) {
		ForceLegsAnim(ANIM.LEGS_LANDB);
	} else {
		ForceLegsAnim(ANIM.LEGS_LAND);
	}

	ps.legsTimer = TIMER_LAND;

	// Calculate the exact velocity on landing.
	var dist = ps.origin[2] - pml.previous_origin[2];
	var vel = pml.previous_velocity[2];
	var acc = -ps.gravity;

	var a = acc / 2.0;
	var b = vel;
	var c = -dist;

	var den =  b * b - 4 * a * c;
	if (den < 0) {
		return;
	}

	var t = (-b - Math.sqrt(den)) / (2 * a);

	var delta = vel + t * acc;
	delta = delta*delta * 0.0001;

	// Ducking while falling doubles damage.
	if (ps.pm_flags & PMF.DUCKED) {
		delta *= 2;
	}

	// Never take falling damage if completely underwater.
	if (pm.waterlevel === 3) {
		return;
	}

	// Reduce falling damage if there is standing water.
	if (pm.waterlevel === 2) {
		delta *= 0.25;
	}
	if (pm.waterlevel === 1) {
		delta *= 0.5;
	}

	if (delta < 1) {
		return;
	}

	// Create a local entity event to play the sound.

	// SURF_NODAMAGE is used for bounce pads where you don't ever
	// want to take damage or play a crunch sound.
	if (!(pml.groundTrace.surfaceFlags & QS.SURF.NODAMAGE))  {
		if (delta > 60) {
			AddEvent(EV.FALL_FAR);
		} else if (delta > 40) {
			// This is a pain grunt, so don't play it if dead.
			if (ps.pm_type === PM.DEAD) {
				AddEvent(EV.FALL_MEDIUM);
			}
		} else if (delta > 7) {
			AddEvent(EV.FALL_SHORT);
		} else {
			AddEvent(FootstepForSurface());
		}
	}

	// Start footstep cycle over.
	ps.bobCycle = 0;
}

/**
 * FootstepEvents
 */
function FootstepEvents() {
	var ps = pm.ps;

	// Calculate speed and cycle to be used for
	// all cyclic walking effects.
	pm.xyspeed = Math.sqrt( ps.velocity[0] * ps.velocity[0] + ps.velocity[1] * ps.velocity[1]);

	if (ps.groundEntityNum === QS.ENTITYNUM_NONE) {
		// if (ps.powerups[PW_INVULNERABILITY]) {
		// 	ContinueLegsAnim(ANIM.LEGS_IDLECR);
		// }
		// Airborne leaves position in cycle intact, but doesn't advance.
		if (pm.waterlevel > 1) {
			ContinueLegsAnim(ANIM.LEGS_SWIM);
		}
		return;
	}

	// If not trying to move.
	if (!pm.cmd.forwardmove && !pm.cmd.rightmove) {
		if (pm.xyspeed < 5) {
			ps.bobCycle = 0;  // start at beginning of cycle again
			if (ps.pm_flags & PMF.DUCKED) {
				ContinueLegsAnim(ANIM.LEGS_IDLECR);
			} else {
				ContinueLegsAnim(ANIM.LEGS_IDLE);
			}
		}
		return;
	}

	var footstep = false;
	var bobmove = 0.0;

	if (ps.pm_flags & PMF.DUCKED) {
		bobmove = 0.5;  // ducked characters bob much faster
		if (ps.pm_flags & PMF.BACKWARDS_RUN) {
			ContinueLegsAnim(ANIM.LEGS_BACKCR);
		} else {
			ContinueLegsAnim(ANIM.LEGS_WALKCR);
		}
		// Ducked characters never play footsteps.
	} else {
		if (!(pm.cmd.buttons & QS.BUTTON.WALKING)) {
			bobmove = 0.4; // faster speeds bob faster
			if (ps.pm_flags & PMF.BACKWARDS_RUN) {
				ContinueLegsAnim(ANIM.LEGS_BACK);
			} else {
				ContinueLegsAnim(ANIM.LEGS_RUN);
			}
			footstep = true;
		} else {
			bobmove = 0.3;  // walking bobs slow
			if (ps.pm_flags & PMF.BACKWARDS_RUN) {
				ContinueLegsAnim(ANIM.LEGS_BACKWALK);
			} else {
				ContinueLegsAnim(ANIM.LEGS_WALK);
			}
		}
	}

	// Check for footstep / splash sounds.
	var old = ps.bobCycle;
	ps.bobCycle = parseInt(old + bobmove * pml.msec, 10) % 256;

	// // If we just crossed a cycle boundary, play an apropriate footstep event.
	if (((old + 64) ^ (ps.bobCycle + 64)) & 128) {
		if (pm.waterlevel === 0) {
			// On ground will only play sounds if running
			if (footstep/* && !pm.noFootsteps*/) {
				AddEvent(FootstepForSurface());
			}
		} else if (pm.waterlevel === 1) {
			// Splashing.
			AddEvent(EV.FOOTSPLASH);
		} else if (pm.waterlevel === 2) {
			// Wading / swimming at surface
			AddEvent(EV.SWIM);
		} else if (pm.waterlevel === 3) {
			// No sound when completely underwater.
		}
	}
}

/**
 * WaterEvents
 *
 * Generate sound events for entering and leaving water.
 */
function WaterEvents() {
	//
	// If just entered a water volume, play a sound.
	//
	if (!pml.previous_waterlevel && pm.waterlevel) {
		AddEvent(EV.WATER_TOUCH);
	}

	//
	// If just completely exited a water volume, play a sound.
	//
	if (pml.previous_waterlevel && !pm.waterlevel) {
		AddEvent(EV.WATER_LEAVE);
	}

	//
	// Check for head just going under water.
	//
	if (pml.previous_waterlevel !== 3 && pm.waterlevel === 3) {
		AddEvent(EV.WATER_UNDER);
	}

	//
	// Check for head just coming out of water.
	//
	if (pml.previous_waterlevel === 3 && pm.waterlevel !== 3) {
		AddEvent(EV.WATER_CLEAR);
	}
}

/**
 * FootstepForSurface
 */
function FootstepForSurface() {
	if (pml.groundTrace.surfaceFlags & QS.SURF.NOSTEPS) {
		return 0;
	}
	if (pml.groundTrace.surfaceFlags & QS.SURF.METALSTEPS) {
		return EV.FOOTSTEP_METAL;
	}
	return EV.FOOTSTEP;
}

/**
 * AddEvent
 */
function AddEvent(newEvent) {
	AddPredictableEventToPlayerstate(pm.ps, newEvent, 0);
}

/**
 * AddTouchEnt
 */
function AddTouchEnt(entityNum) {
	if (entityNum === QS.ENTITYNUM_WORLD) {
		return;
	}
	if (pm.numTouch === MAX_TOUCH_ENTS) {
		return;
	}

	// See if it is already added.
	if (pm.touchEnts.indexOf(entityNum) !== -1) {
		return;
	}

	// Add it.
	pm.touchEnts[pm.numTouch] = entityNum;
	pm.numTouch++;
}

/**
 * StartTorsoAnim
 */
function StartTorsoAnim(anim) {
	var ps = pm.ps;

	if (ps.pm_type >= PM.DEAD) {
		return;
	}

	ps.torsoAnim = ((ps.torsoAnim & ANIM_TOGGLEBIT) ^ ANIM_TOGGLEBIT ) | anim;
}

/**
 * StartLegsAnim
 */
function StartLegsAnim(anim) {
	var ps = pm.ps;

	if (ps.pm_type >= PM.DEAD) {
		return;
	}

	if (ps.legsTimer > 0) {
		return;  // a high priority animation is running
	}

	ps.legsAnim = ((ps.legsAnim & ANIM_TOGGLEBIT ) ^ ANIM_TOGGLEBIT ) | anim;
}

/**
 * ContinueLegsAnim
 */
function ContinueLegsAnim(anim) {
	var ps = pm.ps;

	if ((ps.legsAnim & ~ANIM_TOGGLEBIT) === anim) {
		return;
	}

	if (ps.legsTimer > 0) {
		return;  // a high priority animation is running
	}

	StartLegsAnim(anim);
}

/**
 * ContinueTorsoAnim
 */
function ContinueTorsoAnim(anim) {
	var ps = pm.ps;

	if ((ps.torsoAnim & ~ANIM_TOGGLEBIT) === anim) {
		return;
	}

	if (ps.torsoTimer > 0) {
		return;  // a high priority animation is running
	}

	StartTorsoAnim(anim);
}

/**
 * ForceLegsAnim
 */
function ForceLegsAnim(anim) {
	var ps = pm.ps;

	ps.legsTimer = 0;
	StartLegsAnim(anim);
}
