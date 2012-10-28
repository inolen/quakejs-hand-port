/**
 * CalcViewValues
 */
function CalcViewValues() {
	var ps = cg.predictedPlayerState;

	cg.refdef.x = 0;
	cg.refdef.y = 0;
	cg.refdef.width = viewport.width;
	cg.refdef.height = viewport.height;
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

	if (cg_thirdPerson()) {
		OffsetThirdPersonView();
	} else {
		OffsetFirstPersonView();
	}

	AnglesToAxis(cg.refdefViewAngles, cg.refdef.viewaxis);

	CalcFov();
}

/**
 * OffsetFirstPersonView
 */
function OffsetFirstPersonView() {
	// add view height
	cg.refdef.vieworg[2] += DEFAULT_VIEWHEIGHT;//ps.viewheight;
}

/**
 * OffsetThirdPersonView
 */
var FOCUS_DISTANCE = 512;
// var mins = [-4, -4, -4];
// var maxs = [4, 4, 4];
function OffsetThirdPersonView() {
	var forward = [0, 0, 0];
	var right = [0, 0, 0];
	var up = [0, 0, 0];
	var focusPoint = [0, 0, 0];
	var focusAngles = vec3.create(cg.refdefViewAngles);

	// if dead, look at killer
	/*if ( cg.predictedPlayerState.stats[STAT_HEALTH] <= 0 ) {
		focusAngles[YAW] = cg.predictedPlayerState.stats[STAT_DEAD_YAW];
		cg.refdefViewAngles[YAW] = cg.predictedPlayerState.stats[STAT_DEAD_YAW];
	}*/

	if (focusAngles[PITCH] > 45) {
		focusAngles[PITCH] = 45;  // don't go too far overhead
	}

	AnglesToVectors(focusAngles, forward, null, null);

	cg.refdef.vieworg[2] += cg.predictedPlayerState.viewheight;
	vec3.add(cg.refdef.vieworg, vec3.scale(forward, FOCUS_DISTANCE, [0, 0, 0]), focusPoint);

	var view = vec3.create(cg.refdef.vieworg);
	view[2] += 8;

	cg.refdefViewAngles[PITCH] *= 0.5;
	AnglesToVectors(cg.refdefViewAngles, forward, right, up);

	var forwardScale = Math.cos( cg_thirdPersonAngle() / 180 * Math.PI);
	var sideScale = Math.sin(cg_thirdPersonAngle() / 180 * Math.PI);

	vec3.add(view, vec3.scale(forward, -cg_thirdPersonRange() * forwardScale, [0, 0, 0]));
	vec3.add(view, vec3.scale(right, -cg_thirdPersonRange() * sideScale, [0, 0, 0]));

	// trace a ray from the origin to the viewpoint to make sure the view isn't
	// in a solid block.  Use an 8 by 8 block to prevent the view from near clipping anything

	// if (!cg_cameraMode.integer) {
	// 	CG_Trace( &trace, cg.refdef.vieworg, mins, maxs, view, cg.predictedPlayerState.clientNum, MASK_SOLID );

	// 	if ( trace.fraction != 1.0 ) {
	// 		VectorCopy( trace.endpos, view );
	// 		view[2] += (1.0 - trace.fraction) * 32;
	// 		// try another trace to this position, because a tunnel may have the ceiling
	// 		// close enogh that this is poking out

	// 		CG_Trace( &trace, cg.refdef.vieworg, mins, maxs, view, cg.predictedPlayerState.clientNum, MASK_SOLID );
	// 		VectorCopy( trace.endpos, view );
	// 	}
	// }

	vec3.set(view, cg.refdef.vieworg);

	// Select pitch to look at focus point from viewer.
	vec3.subtract(focusPoint, cg.refdef.vieworg);
	var focusDist = Math.sqrt(focusPoint[0] * focusPoint[0] + focusPoint[1] * focusPoint[1]);
	if (focusDist < 1) {
		focusDist = 1;  // should never happen
	}
	cg.refdefViewAngles[PITCH] = -180 / Math.PI * Math.atan2(focusPoint[2], focusDist);
	cg.refdefViewAngles[YAW] -= cg_thirdPersonAngle();
}
/**
 * CalcFov
 */
function CalcFov() {
	var fovX = 90;
	var x = cg.refdef.width / Math.tan(fovX / 360 * Math.PI);
	var fovY = Math.atan2(cg.refdef.height, x) * 360 / Math.PI;

	cg.refdef.fovX = fovX;
	cg.refdef.fovY = fovY;
}