/**
 * CalcViewValues
 */
function CalcViewValues() {
	var ps = cg.predictedPlayerState;

	cg.refdef.x = 0;
	cg.refdef.y = 0;
	// TODO FIX THIS
	// viewport is only resolving because it matches the dom ID and Chrome/FF auto make globals per-id
	cg.refdef.width = viewport.width;
	cg.refdef.height = viewport.height;

	cg.bobCycle = (ps.bobCycle & 128 ) >> 7;
	cg.bobFracSin = Math.abs(Math.sin((ps.bobCycle & 127) / 127 * Math.PI));
	cg.xyspeed = Math.sqrt(ps.velocity[0] * ps.velocity[0] + ps.velocity[1] * ps.velocity[1] );

	vec3.set(ps.origin, cg.refdef.vieworg);
	vec3.set(ps.viewangles, cg.refdefViewAngles);

	// Add error decay.
	// if (cg_errorDecay() > 0) {
	// 	var t = cg.time - cg.predictedErrorTime;
	// 	var f = (cg_errorDecay() - t) / cg_errorDecay();
	// 	if (f > 0 && f < 1) {
	// 		VectorMA( cg.refdef.vieworg, f, cg.predictedError, cg.refdef.vieworg );
	// 	} else {
	// 		cg.predictedErrorTime = 0;
	// 	}
	// }

	if (cg.renderingThirdPerson) {
		OffsetThirdPersonView();
	} else {
		OffsetFirstPersonView();
	}

	QMath.AnglesToAxis(cg.refdefViewAngles, cg.refdef.viewaxis);

	CalcFov();
}

/**
 * OffsetFirstPersonView
 */
function OffsetFirstPersonView() {
	// Add view height.
	cg.refdef.vieworg[2] += cg.predictedPlayerState.viewheight;
}

/**
 * OffsetThirdPersonView
 */
var FOCUS_DISTANCE = 512;
var thirdPersonCameraMins = [-4, -4, -4];
var thirdPersonCameraMaxs = [4, 4, 4];
function OffsetThirdPersonView() {
	var forward = [0, 0, 0];
	var right = [0, 0, 0];
	var up = [0, 0, 0];
	var focusPoint = [0, 0, 0];
	var focusAngles = vec3.set(cg.refdefViewAngles, [0, 0, 0]);

	// If dead, look at killer.
	if ( cg.predictedPlayerState.pm_type === PM.DEAD) {
		focusAngles[QMath.YAW] = cg.predictedPlayerState.stats[STAT.DEAD_YAW];
		cg.refdefViewAngles[QMath.YAW] = cg.predictedPlayerState.stats[STAT.DEAD_YAW];
	}

	if (focusAngles[QMath.PITCH] > 45) {
		focusAngles[QMath.PITCH] = 45;  // don't go too far overhead
	}

	QMath.AnglesToVectors(focusAngles, forward, null, null);

	cg.refdef.vieworg[2] += cg.predictedPlayerState.viewheight;
	vec3.add(cg.refdef.vieworg, vec3.scale(forward, FOCUS_DISTANCE, [0, 0, 0]), focusPoint);

	var view = vec3.set(cg.refdef.vieworg, [0, 0, 0]);
	view[2] += 8;

	cg.refdefViewAngles[QMath.PITCH] *= 0.5;
	QMath.AnglesToVectors(cg.refdefViewAngles, forward, right, up);

	var forwardScale = Math.cos( cg_thirdPersonAngle() / 180 * Math.PI);
	var sideScale = Math.sin(cg_thirdPersonAngle() / 180 * Math.PI);

	vec3.add(view, vec3.scale(forward, -cg_thirdPersonRange() * forwardScale, [0, 0, 0]));
	vec3.add(view, vec3.scale(right, -cg_thirdPersonRange() * sideScale, [0, 0, 0]));

	// Trace a ray from the origin to the viewpoint to make sure the view isn't
	// in a solid block. Use an 8 by 8 block to prevent the view from near clipping anything.
	var trace = Trace(cg.refdef.vieworg, view, thirdPersonCameraMins, thirdPersonCameraMaxs, cg.predictedPlayerState.clientNum, MASK.SOLID);

	if (trace.fraction !== 1.0) {
		vec3.set(trace.endPos, view);
		view[2] += (1.0 - trace.fraction) * 32;

		// Try another trace to this position, because a tunnel may have the ceiling
		// close enogh that this is poking out.
		trace = Trace(cg.refdef.vieworg, view, thirdPersonCameraMins, thirdPersonCameraMaxs, cg.predictedPlayerState.clientNum, MASK.SOLID);
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
	cg.refdefViewAngles[QMath.YAW] -= cg_thirdPersonAngle();
}
/**
 * CalcFov
 */
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
			fovX = cg_fov();
			if (fovX < 1) {
				fovX = 1;
			} else if (fovX > 160) {
				fovX = 160;
			}
		// }

		// Account for zooms.
		var zoomFov = cg_zoomFov();
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

	// // Warp if underwater.
	// contents = CG_PointContents( cg.refdef.vieworg, -1 );
	// if ( contents & ( CONTENTS.WATER | CONTENTS.SLIME | CONTENTS.LAVA ) ){
	// 	phase = cg.time / 1000.0 * WAVE_FREQUENCY * M_PI * 2;
	// 	v = WAVE_AMPLITUDE * sin( phase );
	// 	fov_x += v;
	// 	fov_y -= v;
	// 	inwater = qtrue;
	// }
	// else {
	// 	inwater = qfalse;
	// }

	// Set it.
	cg.refdef.fovX = fovX;
	cg.refdef.fovY = fovY;

	if (!cg.zoomed) {
		cg.zoomSensitivity = 1;
	} else {
		cg.zoomSensitivity = cg.refdef.fovY / 75.0;
	}
}