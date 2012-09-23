/*
 * Q3GMove.js - Handles player movement through a bsp structure
 */

/*
 * Copyright (c) 2009 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

// Much of this file is a simplified/dumbed-down version of the Q3 player movement code
// found in bg_pmove.c and bg_slidemove.c

// Some movement constants ripped from the Q3 Source code
var q3movement_stopspeed = 100.0;
var q3movement_duckScale = 0.25;
var q3movement_jumpvelocity = 50;

var q3movement_accelerate = 10.0;
var q3movement_airaccelerate = 0.1;
var q3movement_flyaccelerate = 8.0;

var q3movement_friction = 6.0;
var q3movement_flightfriction = 3.0;

var q3movement_frameTime = 0.30;
var q3movement_overclip = 0.501;
var q3movement_stepsize = 18;

var q3movement_gravity = 20.0;

var q3movement_playerRadius = 10.0;
var q3movement_scale = 50;

/*
	this.onGround = false;

	this.groundTrace = null;
*/

/*
============
PM_CmdScale

Returns the scale factor to apply to cmd movements
This allows the clients to use axial -127 to 127 values for all directions
without getting a sqrt(2) distortion in speed.
============
*/
function CmdScale(cmd, speed) {
	var max, total, scale;

	max = Math.abs(cmd.forwardmove);
	if (Math.abs(cmd.rightmove) > max) {
		max = Math.abs(cmd.rightmove);
	}
	if (Math.abs(cmd.upmove) > max) {
		max = Math.abs(cmd.upmove);
	}
	if (!max) {
		return 0;
	}

	total = Math.sqrt(cmd.forwardmove * cmd.forwardmove
		+ cmd.rightmove * cmd.rightmove + cmd.upmove * cmd.upmove);
	scale = speed * max / ( 127.0 * total );

	return scale;
}

function Friction(pm) {
	//if(!this.onGround) { return; }
	var ps = pm.ps;
	var speed = vec3.length(ps.velocity);

	if (speed < 1) {
		return;
	}

	var drop = 0;
	var control = speed < q3movement_stopspeed ? q3movement_stopspeed : speed;
	drop += control * q3movement_friction * pm.frameTime;

	var newspeed = speed - drop;
	if (newspeed < 0) {
		newspeed = 0;
	}
	newspeed /= speed;

	vec3.scale(ps.velocity, newspeed);
}

/*function GroundTrace() {
	var checkPoint = [this.position[0], this.position[1], this.position[2] - q3movement_playerRadius - 0.25];

	this.groundTrace = Q3Trace.trace(bsp, this.position, checkPoint, q3movement_playerRadius);

	if(this.groundTrace.fraction == 1.0) { // falling
		this.onGround = false;
		return;
	}

	if ( this.velocity[2] > 0 && vec3.dot( this.velocity, this.groundTrace.plane.normal ) > 10 ) { // jumping
		this.onGround = false;
		return;
	}

	if(this.groundTrace.plane.normal[2] < 0.7) { // steep slope
		this.onGround = false;
		return;
	}

	this.onGround = true;
}*/

function ClipVelocity(velIn, normal) {
	var backoff = vec3.dot(velIn, normal);

	if ( backoff < 0 ) {
		backoff *= q3movement_overclip;
	} else {
		backoff /= q3movement_overclip;
	}

	var change = vec3.scale(normal, backoff, [0,0,0]);
	return vec3.subtract(velIn, change, change);
}

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

function SlideMove(pm, gravity) {
	var bumpcount;
	var numbumps = 4;
	var planes = [];
	var endVelocity = [0,0,0];

	/*if ( gravity ) {
		vec3.set(pm.ps.velocity, endVelocity );
		endVelocity[2] -= q3movement_gravity * q3movement_frameTime;
		pm.ps.velocity[2] = ( pm.ps.velocity[2] + endVelocity[2] ) * 0.5;

		if ( this.groundTrace && this.groundTrace.plane ) {
			// slide along the ground plane
			pm.ps.velocity = ClipVelocity(pm.ps.velocity, this.groundTrace.plane.normal);
		}
	}*/

	// never turn against the ground plane
	/*if ( this.groundTrace && this.groundTrace.plane ) {
		planes.push(vec3.set(this.groundTrace.plane.normal, [0,0,0]));
	}*/

	// never turn against original velocity
	//planes.push(vec3.normalize(pm.ps.velocity, [0,0,0]));

	var time_left = pm.frameTime;
	var end = [0,0,0];
	//for(bumpcount=0; bumpcount < numbumps; ++bumpcount) {

		// calculate position we are trying to move to
		vec3.add(pm.ps.origin, vec3.scale(pm.ps.velocity, time_left, [0,0,0]), end);

		vec3.set(end, pm.ps.origin);

		/*// see if we can make it there
		var trace = Q3Trace.trace(this.position, end, q3movement_playerRadius);

		if (trace.allSolid) {
			// entity is completely trapped in another solid
			this.velocity[2] = 0;   // don't build up falling damage, but allow sideways acceleration
			return true;
		}

		if (trace.fraction > 0) {
			// actually covered some distance
			vec3.set(trace.endPos, pm.ps.origin);
		}

		if (trace.fraction == 1) {
			 break;     // moved the entire distance
		}

		time_left -= time_left * trace.fraction;

		planes.push(vec3.set(trace.plane.normal, [0,0,0]));

		//
		// modify velocity so it parallels all of the clip planes
		//

		// find a plane that it enters
		for(var i = 0; i < planes.length; ++i) {
			var into = vec3.dot(pm.ps.velocity, planes[i]);
			if ( into >= 0.1 ) { continue; } // move doesn't interact with the plane

			// slide along the plane
			var clipVelocity = ClipVelocity(pm.ps.velocity, planes[i]);
			var endClipVelocity = ClipVelocity(endVelocity, planes[i]);

			// see if there is a second plane that the new move enters
			for (var j = 0; j < planes.length; j++) {
				if ( j == i ) { continue; }
				if ( vec3.dot( clipVelocity, planes[j] ) >= 0.1 ) { continue; } // move doesn't interact with the plane

				// try clipping the move to the plane
				clipVelocity = ClipVelocity( clipVelocity, planes[j] );
				endClipVelocity = ClipVelocity( endClipVelocity, planes[j] );

				// see if it goes back into the first clip plane
				if ( vec3.dot( clipVelocity, planes[i] ) >= 0 ) { continue; }

				// slide the original velocity along the crease
				var dir = [0,0,0];
				vec3.cross(planes[i], planes[j], dir);
				vec3.normalize(dir);
				var d = vec3.dot(dir, pm.ps.velocity);
				vec3.scale(dir, d, clipVelocity);

				vec3.cross(planes[i], planes[j], dir);
				vec3.normalize(dir);
				d = vec3.dot(dir, endVelocity);
				vec3.scale(dir, d, endClipVelocity);

				// see if there is a third plane the the new move enters
				for(var k = 0; k < planes.length; ++k) {
					if ( k == i || k == j ) { continue; }
					if ( vec3.dot( clipVelocity, planes[k] ) >= 0.1 ) { continue; } // move doesn't interact with the plane

					// stop dead at a tripple plane interaction
					pm.ps.velocity = [0,0,0];
					return true;
				}
			}

			// if we have fixed all interactions, try another move
			vec3.set( clipVelocity, pm.ps.velocity );
			vec3.set( endClipVelocity, endVelocity );
			break;
		}*/
	//}

	/*if ( gravity ) {
		vec3.set( endVelocity, pm.ps.velocity );
	}*/

	return ( bumpcount !== 0 );
}

function StepSlideMove(pm, gravity) {
	var start_o = vec3.set(pm.ps.origin, [0,0,0]);
	var start_v = vec3.set(pm.ps.velocity, [0,0,0]);

	if (SlideMove(pm, gravity) === 0) { return; } // we got exactly where we wanted to go first try

	/*var down = vec3.set(start_o, [0,0,0]);
	down[2] -= q3movement_stepsize;
	var trace = Q3Trace.trace(start_o, down, q3movement_playerRadius);

	var up = [0,0,1];

	// never step up when you still have up velocity
	if ( pm.ps.velocity[2] > 0 && (trace.fraction == 1.0 || vec3.dot(trace.plane.normal, up) < 0.7)) { return; }

	var down_o = vec3.set(pm.ps.origin, [0,0,0]);
	var down_v = vec3.set(pm.ps.velocity, [0,0,0]);

	vec3.set(start_o, up);
	up[2] += q3movement_stepsize;

	// test the player position if they were a stepheight higher
	trace = Q3Trace.trace(start_o, up, q3movement_playerRadius);
	if ( trace.allSolid ) { return; } // can't step up

	var stepSize = trace.endPos[2] - start_o[2];
	// try slidemove from this position
	vec3.set(trace.endPos, pm.ps.origin);
	vec3.set(start_v, pm.ps.velocity);

	SlideMove(pm, gravity);

	// push down the final amount
	vec3.set(pm.ps.origin, down);
	down[2] -= stepSize;
	trace = Q3Trace.trace(pm.ps.origin, down, q3movement_playerRadius);
	if ( !trace.allSolid ) {
		vec3.set(trace.endPos, pm.ps.origin);
	}
	if ( trace.fraction < 1.0 ) {
		pm.ps.velocity = ClipVelocity(pm.ps.velocity, trace.plane.normal);
	}*/
}

function FlyMove(pm, forward, right, up) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	// normal slowdown
	Friction(pm);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = [0, 0, 0];
	for (i=0 ; i < 3; i++) {
		wishvel[i] = scale * forward[i]*cmd.forwardmove + scale * right[i]*cmd.rightmove;
	}
	wishvel[2] += cmd.upmove;
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel);

	Accelerate(pm, wishdir, wishspeed, q3movement_flyaccelerate);
	StepSlideMove(pm, false);
}

/*function AirMove(dir) {
	var speed = vec3.length(dir) * q3movement_scale;

	this.Accelerate(dir, speed, q3movement_airaccelerate);

	this.StepSlideMove(true);
}

function WalkMove(dir) {
	this.ApplyFriction();

	var speed = vec3.length(dir) * q3movement_scale;

	this.Accelerate(dir, speed, q3movement_accelerate);

	this.velocity = this.ClipVelocity(this.velocity, this.groundTrace.plane.normal);

	if(!this.velocity[0] && !this.velocity[1]) { return; }

	this.StepSlideMove(false);
}*/

/*Q3GMove.prototype.jump = function() {
	if(!this.onGround) { return false; }

	this.onGround = false;
	this.velocity[2] = q3movement_jumpvelocity;

	//Make sure that the player isn't stuck in the ground
	var groundDist = vec3.dot( this.position, this.groundTrace.plane.normal ) - this.groundTrace.plane.distance - q3movement_playerRadius;
	vec3.add(this.position, vec3.scale(this.groundTrace.plane.normal, groundDist + 5, [0, 0, 0]));

	return true;
};*/

function UpdateViewAngles(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	for (var i = 0; i < 3; i++) {
		var temp = cmd.angles[i];// + ps->delta_angles[i];

		// TODO: Remove this from client code, enable here.s
		/*if (i == PITCH) {
			// don't let the player look up or down more than 90 degrees
			if ( temp > 16000 ) {
				//ps->delta_angles[i] = 16000 - cmd->angles[i];
				temp = 16000;
			} else if ( temp < -16000 ) {
				//ps->delta_angles[i] = -16000 - cmd->angles[i];
				temp = -16000;
			}
		}*/

		ps.viewangles[i] = temp;
	}
}

function PmoveSingle(pm, msec) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	// determine the time
	if (msec < 1) {
		msec = 1;
	} else if (msec > 200) {
		msec = 200;
	}
	ps.commandTime = cmd.serverTime;
	pm.frameTime = msec * 0.001;

	UpdateViewAngles(pm);

	var forward = [0, 0, 0], right = [0, 0, 0], up = [0, 0, 0];
	vec3.anglesToVectors(pm.ps.viewangles, forward, right, up);

	FlyMove(pm, forward, right, up);

	//PM_GroundTrace();

	/*vec3.normalize(dir);

	if (this.onGround) {
		this.WalkMove(dir);
	} else {
		this.AirMove(dir);
	}

	return this.position;*/
}

function Pmove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;
	var finalTime = cmd.serverTime;

	if (finalTime < ps.commandTime) {
		return;	// should not happen
	}

	if (finalTime > ps.commandTime + 1000) {
		ps.commandTime = finalTime - 1000;
	}

	// chop the move up if it is too long, to prevent framerate
	// dependent behavior
	while (ps.commandTime != finalTime) {
		var msec = finalTime - ps.commandTime;

		if (msec > 66) {
			msec = 66;
		}

		cmd.serverTime = ps.commandTime + msec;

		PmoveSingle(pm, msec);

		/*if ( pmove->ps->pm_flags & PMF_JUMP_HELD ) {
			pmove->cmd.upmove = 20;
		}*/
	}
}