var q3movement_stopspeed = 100.0;
var q3movement_duckScale = 0.25;
var q3movement_jumpvelocity = 50;

var q3movement_accelerate = 10.0;
var q3movement_airaccelerate = 1.0;
var q3movement_flyaccelerate = 8.0;

var q3movement_friction = 6.0;
var q3movement_flightfriction = 3.0;

var q3movement_playerRadius = 10.0;

// TODO Move these into a PmoveLocals structure?
var forward = [0, 0, 0], right = [0, 0, 0], up = [0, 0, 0];
var groundTrace;
var groundPlane;
var walking;
var msec;

/**
 * StartTorsoAnim
 */
function StartTorsoAnim(pm, anim) {
	var ps = pm.ps;

	if (ps.pm_type >= PmoveType.DEAD) {
		return;
	}

	ps.torsoAnim = ((ps.torsoAnim & ANIM_TOGGLEBIT) ^ ANIM_TOGGLEBIT ) | anim;
}

/**
 * StartLegsAnim
 */
function StartLegsAnim(pm, anim) {
	var ps = pm.ps;

	if (ps.pm_type >= PmoveType.DEAD) {
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
function ContinueLegsAnim(pm, anim) {
	var ps = pm.ps;

	if ((ps.legsAnim & ~ANIM_TOGGLEBIT) === anim) {
		return;
	}

	if (ps.legsTimer > 0) {
		return;  // a high priority animation is running
	}

	StartLegsAnim(pm, anim);
}

/**
 * ContinueTorsoAnim
 */
function ContinueTorsoAnim(pm, anim) {
	var ps = pm.ps;

	if ((ps.torsoAnim & ~ANIM_TOGGLEBIT) === anim) {
		return;
	}

	if (ps.torsoTimer > 0) {
		return;  // a high priority animation is running
	}

	StartTorsoAnim(pm, anim);
}

/**
 * ForceLegsAnim
 */
function ForceLegsAnim(pm, anim) {
	var ps = pm.ps;
	
	ps.legsTimer = 0;
	StartLegsAnim(pm, anim);
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
 * Friction
 */
function Friction(pm, flying) {
	var ps = pm.ps;

	var vec = vec3.create(ps.velocity);
	if (walking) {
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
		if (walking && !(groundTrace.surfaceFlags & SurfaceFlags.SLICK) ) {
			// if getting knocked back, no friction
			if (!(ps.pm_flags & PmoveFlags.TIME_KNOCKBACK)) {
				var control = speed < q3movement_stopspeed ? q3movement_stopspeed : speed;
				drop += control * q3movement_friction * pm.frameTime;
			}
		}
	//}

	// Apply water friction even if just wading.
	/*if (pm.waterlevel) {
		drop += speed*pm_waterfriction*pm.waterlevel*pml.frametime;
	}*/

	if (flying) {
		drop += speed * q3movement_flightfriction * pm.frameTime;
	}

	var newspeed = speed - drop;
	if (newspeed < 0) {
		newspeed = 0;
	}
	newspeed /= speed;

	vec3.scale(ps.velocity, newspeed);
}

/**
 * ClipVelocity
 */
function ClipVelocity(vel, normal, overbounce) {
	var backoff = vec3.dot(vel, normal);

	if ( backoff < 0 ) {
		backoff *= overbounce;
	} else {
		backoff /= overbounce;
	}

	var change = vec3.scale(normal, backoff, [0,0,0]);
	return vec3.subtract(vel, change, [0, 0, 0]);
}

/**
 * Accelerate
 */
function Accelerate(pm, wishdir, wishspeed, accel) {
	var ps = pm.ps;
	var currentspeed = vec3.dot(ps.velocity, wishdir);
	var addspeed = wishspeed - currentspeed;

	if (addspeed <= 0) {
		return;
	}

	var accelspeed = accel * pm.frameTime * wishspeed;

	if (accelspeed > addspeed) {
		accelspeed = addspeed;
	}

	vec3.add(ps.velocity, vec3.scale(wishdir, accelspeed, [0,0,0]));
}

/**
 * CheckDuck
 */
function CheckDuck(pm) {
	pm.mins[0] = -15;
	pm.mins[1] = -15;
	pm.mins[2] = -24;

	pm.maxs[0] = 15;
	pm.maxs[1] = 15;
	pm.maxs[2] = 32;

	pm.ps.viewheight = DEFAULT_VIEWHEIGHT;
}

/**
 * CheckJump
 */
function CheckJump(pm) {
	var ps = pm.ps;

	if (pm.cmd.upmove < 10) {
		// not holding jump
		return false;
	}

	// must wait for jump to be released
	if (ps.pm_flags & PmoveFlags.JUMP_HELD) {
		// clear upmove so cmdscale doesn't lower running speed
		pm.cmd.upmove = 0;
		return false;
	}

	groundPlane = false; // jumping away
	walking = false;
	ps.pm_flags |= PmoveFlags.JUMP_HELD;

	ps.groundEntityNum = ENTITYNUM_NONE;
	ps.velocity[2] = JUMP_VELOCITY;
	// PM_AddEvent( EV_JUMP );

	if (pm.cmd.forwardmove >= 0) {
		ForceLegsAnim(pm, Animations.LEGS_JUMP);
		ps.pm_flags &= ~PmoveFlags.BACKWARDS_JUMP;
	} else {
		ForceLegsAnim(pm, Animations.LEGS_JUMPB);
		ps.pm_flags |= PmoveFlags.BACKWARDS_JUMP;
	}

	return true;
}

/**
 * GroundTrace
 */
function GroundTrace(pm) {
	var ps = pm.ps;
	var point = [ps.origin[0], ps.origin[1], ps.origin[2] - 0.25];
	var trace = pm.trace(ps.origin, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

	groundTrace = trace;

	// Do something corrective if the trace starts in a solid.
	if (trace.allSolid) {
		// This will nudge us around and, if successful, copy its
		// new successful trace results into ours.
		if (!CorrectAllSolid(pm, trace)) {
			return;
		}
	}

	// If the trace didn't hit anything, we are in free fall.
	if (trace.fraction === 1.0) {
		GroundTraceMissed(pm);
		return;
	}

	// Check if getting thrown off the ground.
	if (ps.velocity[2] > 0 && vec3.dot(ps.velocity, trace.plane.normal) > 10 ) {
		// go into jump animation
		if (pm.cmd.forwardmove >= 0) {
			ForceLegsAnim(pm, Animations.LEGS_JUMP);
			ps.pm_flags &= ~PmoveFlags.BACKWARDS_JUMP;
		} else {
			ForceLegsAnim(pm, Animations.LEGS_JUMPB);
			ps.pm_flags |= PmoveFlags.BACKWARDS_JUMP;
		}

		ps.groundEntityNum = ENTITYNUM_NONE;
		groundPlane = false;
		walking = false;

		return;
	}

	if (trace.plane.normal[2] < MIN_WALK_NORMAL) {
		ps.groundEntityNum = ENTITYNUM_NONE;
		groundPlane = true;
		walking = false;

		return;
	}

	// TODO return entitynum in tracework
	ps.groundEntityNum = trace.entityNum;
	groundPlane = true;
	walking = true;
}

/**
 * CorrectAllSolid
 */
function CorrectAllSolid(pm, trace) {
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
	groundPlane = false;
	walking = false;

	return false;
}

/**
 * GroundTraceMissed
 */
function GroundTraceMissed(pm) {
	var ps = pm.ps;

	if (ps.groundEntityNum !== ENTITYNUM_NONE) {
		// If they aren't in a jumping animation and the ground is a ways away, force into it.
		// If we didn't do the trace, the player would be backflipping down staircases.
		var point = vec3.create(ps.origin);
		point[2] -= 64;

		var trace = pm.trace(ps.origin, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
		if (trace.fraction === 1.0) {
			if (pm.cmd.forwardmove >= 0) {
				ForceLegsAnim(pm, Animations.LEGS_JUMP);
				ps.pm_flags &= ~PmoveFlags.BACKWARDS_JUMP;
			} else {
				ForceLegsAnim(pm, Animations.LEGS_JUMPB);
				ps.pm_flags |= PmoveFlags.BACKWARDS_JUMP;
			}
		}
	}

	pm.ps.groundEntityNum = ENTITYNUM_NONE;
	groundPlane = false;
	walking = false;
}

/**
 * SlideMove
 */
function SlideMove(pm, gravity) {
	var ps = pm.ps;
	var endVelocity = [0,0,0];
	var time_left = pm.frameTime;
	var planes = [];
	var numbumps = 4;
	var end = [0, 0, 0];

	if (gravity) {
		vec3.set(ps.velocity, endVelocity);
		endVelocity[2] -= ps.gravity * time_left;
		ps.velocity[2] = (ps.velocity[2] + endVelocity[2]) * 0.5;

		if (groundPlane) {
			// slide along the ground plane
			ps.velocity = ClipVelocity(ps.velocity, groundTrace.plane.normal, OVERCLIP);
		}
	}

	// Never turn against the ground plane.
	if (groundPlane) {
		planes.push(vec3.set(groundTrace.plane.normal, [0,0,0]));
	}

	// Never turn against original velocity.
	planes.push(vec3.normalize(ps.velocity, [0,0,0]));

	for (var bumpcount = 0; bumpcount < numbumps; bumpcount++) {
		// calculate position we are trying to move to
		vec3.add(ps.origin, vec3.scale(ps.velocity, time_left, [0,0,0]), end);

		// see if we can make it there
		var trace = pm.trace(ps.origin, end, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

		if (trace.allSolid) {
			// entity is completely trapped in another solid
			ps.velocity[2] = 0; // don't build up falling damage, but allow sideways acceleration
			return false;
		}

		if (trace.fraction > 0) {
			// actually covered some distance
			vec3.set(trace.endPos, ps.origin);
		}

		if (trace.fraction === 1) {
			 break; // moved the entire distance
		}

		// save entity for contact
		//PM_AddTouchEnt( trace.entityNum );

		time_left -= time_left * trace.fraction;

		if (planes.length >= MAX_CLIP_PLANES) {
			// this shouldn't really happen
			ps.velocity = [0, 0, 0];
			return false;
		}

		//
		// if this is the same plane we hit before, nudge velocity
		// out along it, which fixes some epsilon issues with
		// non-axial planes
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
		planes.push(vec3.set(trace.plane.normal, [0,0,0]));

		//
		// modify velocity so it parallels all of the clip planes
		//

		// find a plane that it enters
		for(var i = 0; i < planes.length; ++i) {
			var into = vec3.dot(ps.velocity, planes[i]);
			if (into >= 0.1) {
				continue; // move doesn't interact with the plane
			}

			// slide along the plane
			var clipVelocity = ClipVelocity(ps.velocity, planes[i], OVERCLIP);
			var endClipVelocity = ClipVelocity(endVelocity, planes[i], OVERCLIP);

			// see if there is a second plane that the new move enters
			for (var j = 0; j < planes.length; j++) {
				if (j == i) {
					continue;
				}
				if (vec3.dot(clipVelocity, planes[j]) >= 0.1 ) {
					continue; // move doesn't interact with the plane
				}

				// try clipping the move to the plane
				clipVelocity = ClipVelocity(clipVelocity, planes[j], OVERCLIP);
				endClipVelocity = ClipVelocity(endClipVelocity, planes[j], OVERCLIP);

				// see if it goes back into the first clip plane
				if (vec3.dot(clipVelocity, planes[i]) >= 0) {
					continue;
				}

				// slide the original velocity along the crease
				var dir = vec3.cross(planes[i], planes[j], [0,0,0]);
				vec3.normalize(dir);
				var d = vec3.dot(dir, ps.velocity);
				vec3.scale(dir, d, clipVelocity);

				vec3.cross(planes[i], planes[j], dir);
				vec3.normalize(dir);
				d = vec3.dot(dir, endVelocity);
				vec3.scale(dir, d, endClipVelocity);

				// see if there is a third plane the the new move enters
				for (var k = 0; k < planes.length; k++) {
					if ( k == i || k == j ) {
						continue;
					}
					if (vec3.dot(clipVelocity, planes[k]) >= 0.1) {
						continue; // move doesn't interact with the plane
					}

					// stop dead at a tripple plane interaction
					ps.velocity = [0, 0, 0];
					return false;
				}
			}

			// if we have fixed all interactions, try another move
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
function StepSlideMove(pm, gravity) {
	var ps = pm.ps;

	// Make sure these are stored BEFORE the initial SlideMove.
	var start_o = vec3.create(ps.origin);
	var start_v = vec3.create(ps.velocity);

	// we got exactly where we wanted to go first try
	if (SlideMove(pm, gravity)) {
		return;
	}
	
	var down = vec3.create(start_o);
	down[2] -= STEPSIZE;
	var trace = pm.trace(start_o, down, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	var up = [0, 0, 1];

	// never step up when you still have up velocity
	if (ps.velocity[2] > 0 && (trace.fraction === 1.0 || vec3.dot(trace.plane.normal, up) < 0.7)) {
		return;
	}

	vec3.set(start_o, up);
	up[2] += STEPSIZE;

	// test the player position if they were a stepheight higher
	trace = pm.trace(start_o, up, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	if (trace.allSolid) {
		return; // can't step up
	}

	var stepSize = trace.endPos[2] - start_o[2];
	// try slidemove from this position
	vec3.set(trace.endPos, ps.origin);
	vec3.set(start_v, ps.velocity);
	SlideMove(pm, gravity);

	// push down the final amount
	vec3.set(ps.origin, down);
	down[2] -= stepSize;
	trace = pm.trace(ps.origin, down, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	if (!trace.allSolid) {
		vec3.set(trace.endPos, ps.origin);
	}
	if (trace.fraction < 1.0) {
		ps.velocity = ClipVelocity(ps.velocity, trace.plane.normal, OVERCLIP);
	}

	/*// use the step move
	float	delta;

	delta = ps.origin[2] - start_o[2];
	if ( delta > 2 ) {
		if ( delta < 7 ) {
			PM_AddEvent( EV_STEP_4 );
		} else if ( delta < 11 ) {
			PM_AddEvent( EV_STEP_8 );
		} else if ( delta < 15 ) {
			PM_AddEvent( EV_STEP_12 );
		} else {
			PM_AddEvent( EV_STEP_16 );
		}
	}*/
}

/**
 * FlyMove
 */
function FlyMove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	// normal slowdown
	Friction(pm, true);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = [0, 0, 0];
	for (var i = 0; i < 3; i++) {
		wishvel[i] = scale * forward[i]*cmd.forwardmove + scale * right[i]*cmd.rightmove;
	}
	wishvel[2] += cmd.upmove;
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, [0, 0, 0]);

	Accelerate(pm, wishdir, wishspeed, q3movement_flyaccelerate);
	StepSlideMove(pm, false);
}

/**
 * AirMove
 */
function AirMove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	Friction(pm);

	// Set the movementDir so clients can rotate the legs for strafing.
	SetMovementDir(pm);

	// project moves down to flat plane
	forward[2] = 0;
	right[2] = 0;
	vec3.normalize(forward);
	vec3.normalize(right);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = [0, 0, 0];
	for (var i = 0 ; i < 2 ; i++) {
		wishvel[i] = forward[i]*cmd.forwardmove + right[i]*cmd.rightmove;
	}
	wishvel[2] = 0;
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, [0, 0, 0]);
	wishspeed *= scale;

	// Not on ground, so little effect on velocity.
	Accelerate(pm, wishdir, wishspeed, q3movement_airaccelerate);

	// We may have a ground plane that is very steep, even though
	// we don't have a groundentity. Slide along the steep plane.
	if (groundPlane) {
		ClipVelocity(ps.velocity, groundTrace.plane.normal, ps.velocity, OVERCLIP);
	}

	StepSlideMove(pm, true);
}

/**
 * WalkMove
 */
function WalkMove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	if (CheckJump(pm)) {
		AirMove(pm);
		return;
	}

	Friction(pm);

	// Set the movementDir so clients can rotate the legs for strafing.
	SetMovementDir(pm);

	// Project moves down to flat plane.
	forward[2] = 0;
	right[2] = 0;

	// Project the forward and right directions onto the ground plane.
	forward = ClipVelocity(forward, groundTrace.plane.normal, OVERCLIP);
	right = ClipVelocity(right, groundTrace.plane.normal, OVERCLIP);	
	vec3.normalize(forward);
	vec3.normalize(right);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = [0, 0, 0];
	for (var i = 0 ; i < 3 ; i++ ) {
		wishvel[i] = forward[i]*cmd.forwardmove + right[i]*cmd.rightmove;
	}
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, [0, 0, 0]);
	wishspeed *= scale;

	// Clamp the speed lower if wading or walking on the bottom.
	/*if (pm.waterlevel) {
		float	waterScale;

		waterScale = pm.waterlevel / 3.0;
		waterScale = 1.0 - ( 1.0 - pm_swimScale ) * waterScale;
		if ( wishspeed > ps.speed * waterScale ) {
			wishspeed = ps.speed * waterScale;
		}
	}*/

	// When a player gets hit, they temporarily lose
	// full control, which allows them to be moved a bit.
	var accelerate = q3movement_accelerate;

	if ((groundTrace.surfaceFlags & SurfaceFlags.SLICK ) || ps.pm_flags & PmoveFlags.TIME_KNOCKBACK) {
		accelerate = q3movement_airaccelerate;
	}

	Accelerate(pm, wishdir, wishspeed, accelerate);

	if ((groundTrace.surfaceFlags & SurfaceFlags.SLICK ) || ps.pm_flags & PmoveFlags.TIME_KNOCKBACK) {
		ps.velocity[2] -= ps.gravity * pm.frameTime;
	}

	var vel = vec3.length(ps.velocity);

	// slide along the ground plane
	ps.velocity = ClipVelocity(ps.velocity, groundTrace.plane.normal, OVERCLIP);

	// don't decrease velocity when going up or down a slope
	vec3.normalize(ps.velocity);
	vec3.scale(ps.velocity, vel);

	// don't do anything if standing still
	if (!ps.velocity[0] && !ps.velocity[1]) {
		return;
	}

	StepSlideMove(pm, false);
}

/**
 * UpdateViewAngles
 */
function UpdateViewAngles(ps, cmd) {
	for (var i = 0; i < 3; i++) {
		// Circularly clamp uint16 to in16.
		var temp = (cmd.angles[i] + ps.delta_angles[i]) & 0xFFFF;
		if (temp > 0x7FFF) {
			temp = temp - 0xFFFF;
		}

		if (i === PITCH) {
			// Don't let the player look up or down more than 90 degrees.
			if (temp > 16000) {
				ps.delta_angles[i] = 16000 - cmd.angles[i];
				temp = 16000;
			} else if (temp < -16000) {
				ps.delta_angles[i] = -16000 - cmd.angles[i];
				temp = -16000;
			}
		}

		ps.viewangles[i] = ShortToAngle(temp);
	}
}

/**
 * DropTimers
 */
function DropTimers(pm) {
	var ps = pm.ps;

	// Drop misc timing counter.
	if (ps.pm_time) {
		if (msec >= ps.pm_time) {
			ps.pm_flags &= ~PmoveFlags.ALL_TIMES;
			ps.pm_time = 0;
		} else {
			ps.pm_time -= msec;
		}
	}
}

/**
 * TorsoAnimation
 */
function TorsoAnimation(pm) {
	// if (ps.weaponstate === WEAPON_READY) {
	// 	if (ps.weapon == WP_GAUNTLET) {
	// 		ContinueTorsoAnim(pm, Animations.TORSO_STAND2);
	// 	} else {
			ContinueTorsoAnim(pm, Animations.TORSO_STAND);
	// 	}
	// 	return;
	// }
}

/**
 * Footsteps
 */
function Footsteps(pm) {
	var ps = pm.ps;

	// Calculate speed and cycle to be used for
	// all cyclic walking effects.
	pm.xyspeed = Math.sqrt( ps.velocity[0] * ps.velocity[0] + ps.velocity[1] * ps.velocity[1]);

	if (ps.groundEntityNum === ENTITYNUM_NONE) {
		// if (ps.powerups[PW_INVULNERABILITY]) {
		// 	ContinueLegsAnim(pm, Animations.LEGS_IDLECR);
		// }
		// Airborne leaves position in cycle intact, but doesn't advance.
		if (pm.waterlevel > 1) {
			ContinueLegsAnim(pm, Animations.LEGS_SWIM);
		}
		return;
	}

	// If not trying to move.
	if (!pm.cmd.forwardmove && !pm.cmd.rightmove) {
		if (pm.xyspeed < 5) {
			ps.bobCycle = 0;  // start at beginning of cycle again
			if (ps.pm_flags & PmoveFlags.DUCKED) {
				ContinueLegsAnim(pm, Animations.LEGS_IDLECR);
			} else {
				ContinueLegsAnim(pm, Animations.LEGS_IDLE);
			}
		}
		return;
	}
	
	var footstep = false;
	var bobmove = 0.0;

	if (ps.pm_flags & PmoveFlags.DUCKED) {
		bobmove = 0.5;  // ducked characters bob much faster
		if (ps.pm_flags & PmoveFlags.BACKWARDS_RUN) {
			ContinueLegsAnim(pm, Animations.LEGS_BACKCR);
		} else {
			ContinueLegsAnim(pm, Animations.LEGS_WALKCR);
		}
		// Ducked characters never play footsteps.
	} else {
		if ( !(pm.cmd.buttons & Buttons.WALKING)) {
			bobmove = 0.4; // faster speeds bob faster
			if (ps.pm_flags & PmoveFlags.BACKWARDS_RUN) {
				ContinueLegsAnim(pm, Animations.LEGS_BACK);
			}
			else {
				ContinueLegsAnim(pm, Animations.LEGS_RUN);
			}
			footstep = true;
		} else {
			bobmove = 0.3;  // walking bobs slow
			if (ps.pm_flags & PmoveFlags.BACKWARDS_RUN) {
				ContinueLegsAnim(pm, Animations.LEGS_BACKWALK);
			} else {
				ContinueLegsAnim(pm, Animations.LEGS_WALK);
			}
		}
	}

	// // Check for footstep / splash sounds.
	// var old = ps.bobCycle;
	// ps.bobCycle = parseInt(old + bobmove * pml.msec) & 255;

	// // If we just crossed a cycle boundary, play an apropriate footstep event.
	// if (((old + 64) ^ (ps.bobCycle + 64)) & 128) {
	// 	if (pm.waterlevel === 0) {
	// 		// On ground will only play sounds if running
	// 		if (footstep && !pm.noFootsteps) {
	// 			PM_AddEvent( PM_FootstepForSurface() );
	// 		}
	// 	} else if (pm.waterlevel === 1) {
	// 		// splashing
	// 		PM_AddEvent( EV_FOOTSPLASH );
	// 	} else if (pm.waterlevel === 2) {
	// 		// wading / swimming at surface
	// 		PM_AddEvent( EV_SWIM );
	// 	} else if (pm.waterlevel === 3) {
	// 		// no sound when completely underwater
	// 	}
	// }
}


/**
 * SetMovementDir
 * 
 * Determine the rotation of the legs relative
 * to the facing dir
 */
function SetMovementDir(pm) {
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
 * PmoveSingle
 */
function PmoveSingle(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	// Determine the time.
	ps.commandTime = cmd.serverTime;
	pm.frameTime = msec * 0.001;

	// Update our view angles.
	UpdateViewAngles(ps, cmd);
	AnglesToVectors(ps.viewangles, forward, right, up);

	// Make sure walking button is clear if they are running, to avoid
	// proxy no-footsteps cheats.
	if (Math.abs(cmd.forwardmove) > 64 || Math.abs(cmd.rightmove) > 64) {
		cmd.buttons &= ~Buttons.WALKING;
	}

	if (pm.cmd.upmove < 10) {
		// Not holding jump.
		ps.pm_flags &= ~PmoveFlags.JUMP_HELD;
	}

	// Decide if backpedaling animations should be used
	if (cmd.forwardmove < 0) {
		ps.pm_flags |= PmoveFlags.BACKWARDS_RUN;
	} else if (pm.cmd.forwardmove > 0 || (cmd.forwardmove === 0 && cmd.rightmove)) {
		ps.pm_flags &= ~PmoveFlags.BACKWARDS_RUN;
	}

	CheckDuck(pm);
	GroundTrace(pm);
	DropTimers(pm);

	//FlyMove(pm);
	if (walking) {
		WalkMove(pm);
	} else {
		AirMove(pm);
	}

	GroundTrace(pm);


	// Torso animations.
	TorsoAnimation(pm);

	// Footstep events / legs animations.
	Footsteps(pm);
}

/**
 * Pmove
 */
function Pmove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	// TODO WHY DOES THIS HAPPEN
	if (cmd.serverTime < ps.commandTime) {
		//com.error(Err.DROP, 'Pmove: cmd.serverTime < ps.commandTime', cmd.serverTime, ps.commandTime);
		return;  // should not happen
	}

	if (cmd.serverTime > ps.commandTime + 1000) {
		ps.commandTime = cmd.serverTime - 1000;
	}

	ps.pmove_framecount = (ps.pmove_framecount+1) & ((1<<PS_PMOVEFRAMECOUNTBITS)-1);

	// Chop the move up if it is too long, to prevent framerate
	// dependent behavior.
	while (ps.commandTime != cmd.serverTime) {
		msec = cmd.serverTime - ps.commandTime;

		if (msec < 1) {
			msec = 1;
		} else if (msec > 66) {
			msec = 66;
		}

		PmoveSingle(pm);

		if (pm.ps.pm_flags & PmoveFlags.JUMP_HELD) {
			pm.cmd.upmove = 20;
		}
	}
}