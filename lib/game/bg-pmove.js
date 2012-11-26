var pml = new PmoveLocals();
var pm = null;  // current pmove

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

/**
 * Pmove
 */
function Pmove(pmove) {
	var ps = pmove.ps;
	var cmd = pmove.cmd;

	var finalTime = cmd.serverTime;

	// TODO WHY DOES THIS HAPPEN
	if (finalTime < ps.commandTime) {
		//com.error(sh.Err.DROP, 'Pmove: cmd.serverTime < ps.commandTime', cmd.serverTime, ps.commandTime);
		return;  // should not happen
	}

	if (finalTime > ps.commandTime + 1000) {
		ps.commandTime = finalTime - 1000;
	}

	ps.pmove_framecount = (ps.pmove_framecount+1) & ((1<<PMOVEFRAMECOUNTBITS)-1);

	// Chop the move up if it is too long, to prevent framerate
	// dependent behavior.
	while (ps.commandTime !== cmd.serverTime) {
		var msec = finalTime - ps.commandTime;
		if ( msec > 66 ) {
			msec = 66;
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
		cmd.buttons &= ~BUTTON.WALKING;
	}

	// Set the firing flag for continuous beam weapons.
	if ( !(ps.pm_flags & PMF.RESPAWNED) && ps.pm_type !== PM.INTERMISSION && ps.pm_type !== PM.NOCLIP
		&& (cmd.buttons & BUTTON.ATTACK) && ps.ammo[ps.weapon]) {
		ps.eFlags |= EF.FIRING;
	} else {
		ps.eFlags &= ~EF.FIRING;
	}

	// Clear the respawned flag if attack and use are cleared
	if (ps.stats[STAT.HEALTH] > 0 && 
		!(cmd.buttons & (BUTTON.ATTACK | BUTTON.USE_HOLDABLE))) {
		ps.pm_flags &= ~PMF.RESPAWNED;
	}

	// Update our view angles.
	UpdateViewAngles(ps, cmd);
	qm.AnglesToVectors(ps.viewangles, pml.forward, pml.right, pml.up);

	// Make sure walking button is clear if they are running, to avoid
	// proxy no-footsteps cheats.
	if (Math.abs(cmd.forwardmove) > 64 || Math.abs(cmd.rightmove) > 64) {
		cmd.buttons &= ~BUTTON.WALKING;
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

	// if ( pm.ps.pm_type == PM_SPECTATOR ) {
	// 	PM_CheckDuck ();
	// 	PM_FlyMove ();
	// 	PM_DropTimers ();
	// 	return;
	// }

	// if ( pm.ps.pm_type == PM_NOCLIP ) {
	// 	PM_NoclipMove ();
	// 	PM_DropTimers ();
	// 	return;
	// }

	// if (pm.ps.pm_type == PM_FREEZE) {
	// 	return;		// no movement at all
	// }

	// if ( pm.ps.pm_type == PM_INTERMISSION || pm.ps.pm_type == PM_SPINTERMISSION) {
	// 	return;		// no movement at all
	// }

	// // set watertype, and waterlevel
	// PM_SetWaterLevel();
	// pml.previous_waterlevel = pmove.waterlevel;

	// Set mins, maxs and viewheight.
	CheckDuck();

	// Set ground entity.
	GroundTrace();

	if (ps.pm_type === PM.DEAD) {
		DeadMove();
	}

	// Kill animation timers.
	DropTimers();

	//FlyMove();
	if (pml.walking) {
		WalkMove();
	} else {
		AirMove();
	}

	GroundTrace();

	// Weapons.
	UpdateWeapon();

	// Torso animations.
	TorsoAnimation();

	// Footstep events / legs animations.
	Footsteps();

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
 * CheckDuck
 */
function CheckDuck() {
	var ps = pm.ps;

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
		// duck
		ps.pm_flags |= PMF.DUCKED;
	} else {
		// stand up if possible
		if (ps.pm_flags & PMF.DUCKED) {
			// Try to stand up.
			pm.maxs[2] = 32;
			var trace = pm.trace(ps.origin, ps.origin, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
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
		// not holding jump
		return false;
	}

	// must wait for jump to be released
	if (ps.pm_flags & PMF.JUMP_HELD) {
		// clear upmove so cmdscale doesn't lower running speed
		pm.cmd.upmove = 0;
		return false;
	}

	pml.groundPlane = false; // jumping away
	pml.walking = false;
	ps.pm_flags |= PMF.JUMP_HELD;

	ps.groundEntityNum = ENTITYNUM_NONE;
	ps.velocity[2] = JUMP_VELOCITY;
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
	var point = [ps.origin[0], ps.origin[1], ps.origin[2] - 0.25];
	var trace = pm.trace(ps.origin, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

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
		// go into jump animation
		if (pm.cmd.forwardmove >= 0) {
			ForceLegsAnim(ANIM.LEGS_JUMP);
			ps.pm_flags &= ~PMF.BACKWARDS_JUMP;
		} else {
			ForceLegsAnim(ANIM.LEGS_JUMPB);
			ps.pm_flags |= PMF.BACKWARDS_JUMP;
		}

		ps.groundEntityNum = ENTITYNUM_NONE;
		pml.groundPlane = false;
		pml.walking = false;

		return;
	}

	if (trace.plane.normal[2] < MIN_WALK_NORMAL) {
		ps.groundEntityNum = ENTITYNUM_NONE;
		pml.groundPlane = true;
		pml.walking = false;

		return;
	}

	// TODO return entitynum in tracework
	ps.groundEntityNum = trace.entityNum;
	pml.groundPlane = true;
	pml.walking = true;
}

/**
 * CorrectAllSolid
 */
function CorrectAllSolid(trace) {
	var ps = pm.ps;
	var point = [0, 0, 0];
	var tr;

	// Jitter around.
	for (var i = -1; i <= 1; i++) {
		for (var j = -1; j <= 1; j++) {
			for (var k = -1; k <= 1; k++) {
				vec3.set(ps.origin, point);
				point[0] += i;
				point[1] += j;
				point[2] += k;
				tr = pm.trace(point, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

				if (!tr.allSolid) {
					// Copy the results back into the original so GroundTrace can carry on.
					tr.clone(trace);

					return true;
				}
			}
		}
	}

	ps.groundEntityNum = ENTITYNUM_NONE;
	pml.groundPlane = false;
	pml.walking = false;

	return false;
}

/**
 * GroundTraceMissed
 */
function GroundTraceMissed() {
	var ps = pm.ps;

	if (ps.groundEntityNum !== ENTITYNUM_NONE) {
		// If they aren't in a jumping animation and the ground is a ways away, force into it.
		// If we didn't do the trace, the player would be backflipping down staircases.
		var point = vec3.set(ps.origin, [0, 0, 0]);
		point[2] -= 64;

		var trace = pm.trace(ps.origin, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
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

	ps.groundEntityNum = ENTITYNUM_NONE;
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
	var wishvel = [0, 0, 0];
	for (var i = 0; i < 3; i++) {
		wishvel[i] = scale * pml.forward[i]*cmd.forwardmove + scale * pml.right[i]*cmd.rightmove;
	}
	wishvel[2] += cmd.upmove;
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, [0, 0, 0]);

	Accelerate(wishdir, wishspeed, pm_flyaccelerate);
	StepSlideMove(false);
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
	var wishvel = [0, 0, 0];
	for (var i = 0 ; i < 2 ; i++) {
		wishvel[i] = pml.forward[i]*cmd.forwardmove + pml.right[i]*cmd.rightmove;
	}
	wishvel[2] = 0;
	var wishspeed = vec3.length(wishvel) * scale;
	var wishdir = vec3.normalize(wishvel, [0, 0, 0]);

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
	var wishvel = [0, 0, 0];
	for (var i = 0 ; i < 3 ; i++ ) {
		wishvel[i] = pml.forward[i]*cmd.forwardmove + pml.right[i]*cmd.rightmove;
	}
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, [0, 0, 0]);
	wishspeed *= scale;

	// Clamp the speed lower if wading or walking on the bottom.
	/*if (pm.waterlevel) {
		var waterScale;

		waterScale = pm.waterlevel / 3.0;
		waterScale = 1.0 - ( 1.0 - pm_swimScale ) * waterScale;
		if ( wishspeed > ps.speed * waterScale ) {
			wishspeed = ps.speed * waterScale;
		}
	}*/

	// When a player gets hit, they temporarily lose
	// full control, which allows them to be moved a bit.
	var accelerate = pm_accelerate;

	if ((pml.groundTrace.surfaceFlags & SURF.SLICK ) || ps.pm_flags & PMF.TIME_KNOCKBACK) {
		accelerate = pm_airaccelerate;
	}

	Accelerate(wishdir, wishspeed, accelerate);

	if ((pml.groundTrace.surfaceFlags & SURF.SLICK ) || ps.pm_flags & PMF.TIME_KNOCKBACK) {
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

	var vec = vec3.set(ps.velocity, [0, 0, 0]);
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
	//if (pm.waterlevel <= 1) {
		if (pml.walking && !(pml.groundTrace.surfaceFlags & SURF.SLICK) ) {
			// if getting knocked back, no friction
			if (!(ps.pm_flags & PMF.TIME_KNOCKBACK)) {
				var control = speed < pm_stopspeed ? pm_stopspeed : speed;
				drop += control * pm_friction * pml.frameTime;
			}
		}
	//}

	// Apply water friction even if just wading.
	/*if (pm.waterlevel) {
		drop += speed*pm_waterfriction*pm.waterlevel*pml.frametime;
	}*/

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

	vec3.add(ps.velocity, vec3.scale(wishdir, accelspeed, [0, 0, 0]));
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

	var change = vec3.scale(normal, backoff, [0, 0, 0]);
	return vec3.subtract(vel, change, [0, 0, 0]);
}

/**
 * SlideMove
 */
function SlideMove(gravity) {
	var ps = pm.ps;
	var endVelocity = [0, 0, 0];
	var time_left = pml.frameTime;
	var planes = [];
	var numbumps = 4;
	var end = [0, 0, 0];

	if (gravity) {
		vec3.set(ps.velocity, endVelocity);
		endVelocity[2] -= ps.gravity * time_left;
		ps.velocity[2] = (ps.velocity[2] + endVelocity[2]) * 0.5;

		if (pml.groundPlane) {
			// slide along the ground plane
			ps.velocity = ClipVelocity(ps.velocity, pml.groundTrace.plane.normal, OVERCLIP);
		}
	}

	// Never turn against the ground plane.
	if (pml.groundPlane) {
		planes.push(vec3.set(pml.groundTrace.plane.normal, [0, 0, 0]));
	}

	// Never turn against original velocity.
	planes.push(vec3.normalize(ps.velocity, [0, 0, 0]));

	for (var bumpcount = 0; bumpcount < numbumps; bumpcount++) {
		// Calculate position we are trying to move to.
		vec3.add(ps.origin, vec3.scale(ps.velocity, time_left, [0, 0, 0]), end);

		// See if we can make it there.
		var trace = pm.trace(ps.origin, end, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

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
		//PM_AddTouchEnt( trace.entityNum );

		time_left -= time_left * trace.fraction;

		if (planes.length >= MAX_CLIP_PLANES) {
			// this shouldn't really happen
			ps.velocity = [0, 0, 0];
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
		planes.push(vec3.set(trace.plane.normal, [0, 0, 0]));

		//
		// Modify velocity so it parallels all of the clip planes.
		//

		// Find a plane that it enters.
		for(var i = 0; i < planes.length; ++i) {
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
				var dir = vec3.cross(planes[i], planes[j], [0, 0, 0]);
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
					ps.velocity = [0, 0, 0];
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

	// Make sure these are stored BEFORE the initial SlideMove.
	var start_o = vec3.set(ps.origin, [0, 0, 0]);
	var start_v = vec3.set(ps.velocity, [0, 0, 0]);

	// We got exactly where we wanted to go first try.
	if (SlideMove(gravity)) {
		return;
	}
	
	// Never step up when you still have up velocity.
	var up = [0, 0, 1];
	var down = vec3.set(start_o, [0, 0, 0]);
	down[2] -= STEPSIZE;

	var trace = pm.trace(start_o, down, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	if (ps.velocity[2] > 0 && (trace.fraction === 1.0 || vec3.dot(trace.plane.normal, up) < 0.7)) {
		return;
	}

	// Test the player position if they were a stepheight higher.
	vec3.set(start_o, up);
	up[2] += STEPSIZE;

	trace = pm.trace(start_o, up, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
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
	trace = pm.trace(ps.origin, down, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
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

		if (i === qm.PITCH) {
			// Don't let the player look up or down more than 90 degrees.
			if (temp > 16000) {
				ps.delta_angles[i] = 16000 - cmd.angles[i];
				temp = 16000;
			} else if (temp < -16000) {
				ps.delta_angles[i] = -16000 - cmd.angles[i];
				temp = -16000;
			}
		}

		ps.viewangles[i] = qm.ShortToAngle(temp);
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
}

/**
 * UpdateWeapon
 */
function UpdateWeapon() {
	var ps = pm.ps;

	// int		addTime;

	// Don't allow attack until all buttons are up
	if (ps.pm_flags & PMF.RESPAWNED) {
		return;
	}

	// // ignore if spectator
	// if ( pm.ps.persistant[PERS.TEAM] == TEAM_SPECTATOR ) {
	// 	return;
	// }

	// Check for dead player.
	if (ps.pm_type === PM.DEAD) {
		ps.weapon = WP.NONE;
		return;
	}

	// // check for item using
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
	if (ps.weaponTime <= 0 || ps.weaponState != WS.FIRING) {
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

	if (ps.weaponState === WS.RAISING ) {
		ps.weaponState = WS.READY;
		if (ps.weapon === WP.GAUNTLET) {
			StartTorsoAnim(ANIM.TORSO_STAND2);
		} else {
			StartTorsoAnim(ANIM.TORSO_STAND);
		}
		return;
	}

	// Check for fire.
	if (!(pm.cmd.buttons & BUTTON.ATTACK)) {
		ps.weaponTime = 0;
		ps.weaponState = WS.READY;
		return;
	}
	
	// Start the animation even if out of ammo.
	// if (ps.weapon === WP.GAUNTLET) {
	// 	// The guantlet only "fires" when it actually hits something.
	// 	if (!pm.gauntletHit) {
	// 		ps.weaponTime = 0;
	// 		ps.weaponState = WS.READY;
	// 		return;
	// 	}
	// 	StartTorsoAnim(ANIM.TORSO_ATTACK2);
	// } else {
		StartTorsoAnim(ANIM.TORSO_ATTACK);
	// }
	
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
		default:
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
	}

	// if (ps.powerups[PW_HASTE]) {
	// 	addTime /= 1.3;
	// }

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
 * Footsteps
 */
function Footsteps() {
	var ps = pm.ps;

	// Calculate speed and cycle to be used for
	// all cyclic walking effects.
	pm.xyspeed = Math.sqrt( ps.velocity[0] * ps.velocity[0] + ps.velocity[1] * ps.velocity[1]);

	if (ps.groundEntityNum === ENTITYNUM_NONE) {
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
		if (!(pm.cmd.buttons & BUTTON.WALKING)) {
			bobmove = 0.4; // faster speeds bob faster
			if (ps.pm_flags & PMF.BACKWARDS_RUN) {
				ContinueLegsAnim(ANIM.LEGS_BACK);
			}
			else {
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
	// 	if (pm.waterlevel === 0) {
	// 		// On ground will only play sounds if running
			if (footstep && !pm.noFootsteps) {
				AddEvent(FootstepForSurface());
			}
	// 	} else if (pm.waterlevel === 1) {
	// 		// splashing
//			AddEvent(EntityEvent.FOOTSPLASH);
	// 	} else if (pm.waterlevel === 2) {
	// 		// wading / swimming at surface
//			AddEvent(EntityEvent.SWIM);
	// 	} else if (pm.waterlevel === 3) {
	// 		// no sound when completely underwater
	// 	}
	}
}

/**
 * FootstepForSurface
 */
function FootstepForSurface () {
	if (pml.groundTrace.surfaceFlags & SURF.NOSTEPS) {
		return 0;
	}
	if (pml.groundTrace.surfaceFlags & SURF.METALSTEPS) {
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