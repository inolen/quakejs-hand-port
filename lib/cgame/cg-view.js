/**
 * CalcViewValues
 */
function CalcViewValues() {
	var ps = cg.predictedPlayerState;

	cg.refdef.x = 0;
	cg.refdef.y = 0;
	cg.refdef.width = SYS.GetViewportWidth();
	cg.refdef.height = SYS.GetViewportHeight();

	cg.bobCycle = (ps.bobCycle & 128 ) >> 7;
	cg.bobFracSin = Math.abs(Math.sin((ps.bobCycle & 127) / 127 * Math.PI));
	cg.xyspeed = Math.sqrt(ps.velocity[0] * ps.velocity[0] + ps.velocity[1] * ps.velocity[1] );

	vec3.set(ps.origin, cg.refdef.vieworg);
	vec3.set(ps.viewangles, cg.refdefViewAngles);

	// Add error decay.
	if (cg_errorDecay.get() > 0) {
		var t = cg.time - cg.predictedErrorTime;
		var f = (cg_errorDecay.get() - t) / cg_errorDecay.get();
		if (f > 0 && f < 1) {
			var decay = vec3.scale(cg.predictedError, f, vec3.create());
			vec3.add(cg.refdef.vieworg, decay);
		} else {
			cg.predictedErrorTime = 0;
		}
	}

	if (cg.renderingThirdPerson) {
		OffsetThirdPersonView();
	} else {
		OffsetFirstPersonView();
	}

	QMath.AnglesToAxis(cg.refdefViewAngles, cg.refdef.viewaxis);

	// If we're teleporting, let the renderer know.
	cg.refdef.rdflags = 0;
	if (cg.hyperspace) {
		cg.refdef.rdflags |= RDF.NOWORLDMODEL | RDF.HYPERSPACE;
	}

	CalcFov();
}

/**
 * OffsetFirstPersonView
 */
function OffsetFirstPersonView() {
	if (cg.snap.ps.pm_type === PM.INTERMISSION) {
		return;
	}

	var origin = cg.refdef.vieworg;
	var angles = cg.refdefViewAngles;
	var delta;
	var speed;

	// // Add angles based on damage kick.
	// if (cg.damageTime) {
	// 	var ratio = cg.time - cg.damageTime;
	// 	if (ratio < DAMAGE_DEFLECT_TIME) {
	// 		ratio /= DAMAGE_DEFLECT_TIME;
	// 		angles[PITCH] += ratio * cg.v_dmg_pitch;
	// 		angles[ROLL] += ratio * cg.v_dmg_roll;
	// 	} else {
	// 		ratio = 1.0 - (ratio - DAMAGE_DEFLECT_TIME) / DAMAGE_RETURN_TIME;
	// 		if ( ratio > 0 ) {
	// 			angles[PITCH] += ratio * cg.v_dmg_pitch;
	// 			angles[ROLL] += ratio * cg.v_dmg_roll;
	// 		}
	// 	}
	// }

	// Add angles based on velocity.
	delta = vec3.dot(cg.predictedPlayerState.velocity, cg.refdef.viewaxis[0]);
	angles[QMath.PITCH] += delta * cg_runpitch.get();

	delta = vec3.dot(cg.predictedPlayerState.velocity, cg.refdef.viewaxis[1]);
	angles[QMath.ROLL] -= delta * cg_runroll.get();

	// Add angles based on bob.

	// Make sure the bob is visible even at low speeds.
	speed = cg.xyspeed > 200 ? cg.xyspeed : 200;

	delta = cg.bobFracSin * cg_bobpitch.get() * speed;
	if (cg.predictedPlayerState.pm_flags & PMF.DUCKED) {
		delta *= 3;  // crouching
	}

	angles[QMath.PITCH] += delta;
	delta = cg.bobFracSin * cg_bobroll.get() * speed;
	if (cg.predictedPlayerState.pm_flags & PMF.DUCKED) {
		delta *= 3;  // crouching accentuates roll
	}
	if (cg.bobCycle & 1) {
		delta = -delta;
	}
	angles[QMath.ROLL] += delta;

	// Add view height.
	origin[2] += cg.predictedPlayerState.viewheight;

	// Smooth out duck height changes.
	var timeDelta = cg.time - cg.duckTime;
	if (timeDelta < DUCK_TIME) {
		cg.refdef.vieworg[2] -= cg.duckChange * (DUCK_TIME - timeDelta) / DUCK_TIME;
	}

	// Add bob height.
	var bob = cg.bobFracSin * cg.xyspeed * cg_bobup.get();
	if (bob > 6) {
		bob = 6;
	}

	origin[2] += bob;

	// Add fall height.
	delta = cg.time - cg.landTime;
	if (delta < LAND_DEFLECT_TIME) {
		var f = delta / LAND_DEFLECT_TIME;
		cg.refdef.vieworg[2] += cg.landChange * f;
	} else if (delta < LAND_DEFLECT_TIME + LAND_RETURN_TIME) {
		delta -= LAND_DEFLECT_TIME;
		var f = 1.0 - (delta / LAND_RETURN_TIME);
		cg.refdef.vieworg[2] += cg.landChange * f;
	}

	StepOffset();
}

/**
 * StepOffset
 *
 * Smooth out stair climbing.
 */
function StepOffset() {
	var timeDelta = cg.time - cg.stepTime;
	if (timeDelta < STEP_TIME) {
		cg.refdef.vieworg[2] -= cg.stepChange * (STEP_TIME - timeDelta) / STEP_TIME;
	}
}

/**
 * OffsetThirdPersonView
 */
var FOCUS_DISTANCE = 512;
var thirdPersonCameraMins = vec3.createFrom(-4, -4, -4);
var thirdPersonCameraMaxs = vec3.createFrom(4, 4, 4);
function OffsetThirdPersonView() {
	var forward = vec3.create();
	var right = vec3.create();
	var up = vec3.create();
	var focusPoint = vec3.create();
	var focusAngles = vec3.create(cg.refdefViewAngles);

	// If dead, look at killer.
	if (cg.predictedPlayerState.pm_type === PM.DEAD) {
		focusAngles[QMath.YAW] = cg.predictedPlayerState.stats[STAT.DEAD_YAW];
		cg.refdefViewAngles[QMath.YAW] = cg.predictedPlayerState.stats[STAT.DEAD_YAW];
	}

	if (focusAngles[QMath.PITCH] > 45) {
		focusAngles[QMath.PITCH] = 45;  // don't go too far overhead
	}

	QMath.AnglesToVectors(focusAngles, forward, null, null);

	cg.refdef.vieworg[2] += cg.predictedPlayerState.viewheight;
	vec3.add(cg.refdef.vieworg, vec3.scale(forward, FOCUS_DISTANCE, vec3.create()), focusPoint);

	var view = vec3.create(cg.refdef.vieworg);
	view[2] += 8;

	cg.refdefViewAngles[QMath.PITCH] *= 0.5;
	QMath.AnglesToVectors(cg.refdefViewAngles, forward, right, up);

	var forwardScale = Math.cos( cg_thirdPersonAngle.get() / 180 * Math.PI);
	var sideScale = Math.sin(cg_thirdPersonAngle.get() / 180 * Math.PI);

	vec3.add(view, vec3.scale(forward, -cg_thirdPersonRange.get() * forwardScale, vec3.create()));
	vec3.add(view, vec3.scale(right, -cg_thirdPersonRange.get() * sideScale, vec3.create()));

	// Trace a ray from the origin to the viewpoint to make sure the view isn't
	// in a solid block. Use an 8 by 8 block to prevent the view from near clipping anything.
	var trace = new QS.TraceResults();
	Trace(trace, cg.refdef.vieworg, view, thirdPersonCameraMins, thirdPersonCameraMaxs,
		cg.predictedPlayerState.clientNum, MASK.SOLID);

	if (trace.fraction !== 1.0) {
		vec3.set(trace.endPos, view);
		view[2] += (1.0 - trace.fraction) * 32;

		// Try another trace to this position, because a tunnel may have the ceiling
		// close enogh that this is poking out.
		Trace(trace, cg.refdef.vieworg, view, thirdPersonCameraMins, thirdPersonCameraMaxs,
			cg.predictedPlayerState.clientNum, MASK.SOLID);
		vec3.set(trace.endPos, view);
	}

	vec3.set(view, cg.refdef.vieworg);

	// Select pitch to look at focus point from viewer.
	vec3.subtract(focusPoint, cg.refdef.vieworg);
	var focusDist = Math.sqrt(focusPoint[0] * focusPoint[0] + focusPoint[1] * focusPoint[1]);
	if (focusDist < 1) {
		focusDist = 1;  // should never happen
	}
	cg.refdefViewAngles[QMath.PITCH] = -180 / Math.PI * Math.atan2(focusPoint[2], focusDist);
	cg.refdefViewAngles[QMath.YAW] -= cg_thirdPersonAngle.get();
}
/**
 * CalcFov
 *
 * Fixed fov at intermissions, otherwise account for fov variable and zooms.
 */
var WAVE_AMPLITUDE = 1;
var WAVE_FREQUENCY = 0.4;

function CalcFov() {
	var fovX, fovY;

	if (cg.predictedPlayerState.pm_type === PM.INTERMISSION) {
		// If in intermission, use a fixed value.
		fovX = 90;
	} else {
		// User selectable.
		// if ( cgs.dmflags & DF_FIXED_FOV ) {
		// 	// dmflag to prevent wide fov for all clients
		// 	fov_x = 90;
		// } else {
			fovX = cg_fov.get();
			if (fovX < 1) {
				fovX = 1;
			} else if (fovX > 160) {
				fovX = 160;
			}
		// }

		// Account for zooms.
		var zoomFov = cg_zoomFov.get();
		if (zoomFov < 1) {
			zoomFov = 1;
		} else if (zoomFov > 160) {
			zoomFov = 160;
		}

		var f;
		if (cg.zoomed) {
			f = (cg.time - cg.zoomTime) / ZOOM_TIME;
			if (f > 1.0) {
				fovX = zoomFov;
			} else {
				fovX = fovX + f * (zoomFov - fovX);
			}
		} else {
			f = (cg.time - cg.zoomTime) / ZOOM_TIME;
			if (f <= 1.0) {
				fovX = zoomFov + f * (fovX - zoomFov);
			}
		}
	}

	var x = cg.refdef.width / Math.tan(fovX / 360 * Math.PI);
	fovY = Math.atan2(cg.refdef.height, x) * 360 / Math.PI;

	// Warp if underwater.
	var contents = PointContents(cg.refdef.vieworg, -1);
	if (contents & ( CONTENTS.WATER | CONTENTS.SLIME | CONTENTS.LAVA)){
		var phase = cg.time / 1000.0 * WAVE_FREQUENCY * Math.PI * 2;
		var v = WAVE_AMPLITUDE * Math.sin(phase);
		fovX += v;
		fovY -= v;
		// inwater = true;
	} else {
		// inwater = false;
	}

	// Set it.
	cg.refdef.fovX = fovX;
	cg.refdef.fovY = fovY;

	if (!cg.zoomed) {
		cg.zoomSensitivity = 1;
	} else {
		cg.zoomSensitivity = cg.refdef.fovY / 75.0;
	}
}