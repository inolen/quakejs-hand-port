/**
 * AddPacketEntities
 */
function AddPacketEntities() {
	// set cg.frameInterpolation
	if (cg.nextSnap) {
		var delta = (cg.nextSnap.serverTime - cg.snap.serverTime);
		if (delta === 0) {
			cg.frameInterpolation = 0;
		} else {
			cg.frameInterpolation = (cg.time - cg.snap.serverTime) / delta;
		}
	} else {
		cg.frameInterpolation = 0;  // actually, it should never be used, because 
	                                // no entities should be marked as interpolating
	}

	// The auto-rotating items will all have the same axis.
	cg.autoAngles[0] = 0;
	cg.autoAngles[1] = ( cg.time & 2047 ) * 360 / 2048.0;
	cg.autoAngles[2] = 0;

	cg.autoAnglesFast[0] = 0;
	cg.autoAnglesFast[1] = ( cg.time & 1023 ) * 360 / 1024.0;
	cg.autoAnglesFast[2] = 0;

	// Generate and add the entity from the playerstate.
	var ps = cg.predictedPlayerState;
	bg.PlayerStateToEntityState(ps, cg.predictedPlayerEntity.currentState);
	AddCEntity(cg.predictedPlayerEntity);

	// // Lerp the non-predicted value for lightning gun origins.
	// CalcEntityLerpPositions( &cg_entities[ cg.snap->ps.clientNum ] );

	// add each entity sent over by the server
	for (var i = 0; i < cg.snap.numEntities; i++) {
		var cent = cg.entities[cg.snap.entities[i].number];
		AddCEntity(cent);
	}
}

/**
 * AddCEntity
 */
function AddCEntity(cent) {
	// Event-only entities will have been dealt with already.
	if (cent.currentState.eType >= ET.EVENTS) {
		return;
	}
	
	// Calculate the current origin.
	CalcEntityLerpPositions(cent);

	switch (cent.currentState.eType) {
		case ET.ITEM:
			// TODO Pool these?
			var refent = new re.RefEntity();
			var item = bg.ItemList[cent.currentState.modelIndex];
			var itemInfo = cg.itemInfo[cent.currentState.modelIndex];

			// Autorotate at one of two speeds.
			if (item.giType === IT.HEALTH) {
				vec3.set(cg.autoAnglesFast, cent.lerpAngles);
			} else {
				vec3.set(cg.autoAngles, cent.lerpAngles);
			}

			for (var i = 0; i < itemInfo.modelHandles.length; i++) {
				refent.reType = RT.MODEL;
				vec3.set(cent.lerpOrigin, refent.origin);
				qm.AnglesToAxis(cent.lerpAngles, refent.axis);
				refent.hModel = itemInfo.modelHandles[i];
				
				imp.re_AddRefEntityToScene(refent);
			}
			break;

		case ET.PLAYER:
			AddPlayer(cent);
			break;
	}

	// add automatic effects
	//CG_EntityEffects( cent );

	/*switch ( cent->currentState.eType ) {
	default:
		CG_Error( "Bad entity type: %i", cent->currentState.eType );
		break;
	case ET.INVISIBLE:
	case ET.PUSH_TRIGGER:
	case ET.TELEPORT_TRIGGER:
		break;
	case ET.GENERAL:
		CG_General( cent );
		break;
	case ET.PLAYER:
		CG_Player( cent );
		break;
	case ET.ITEM:
		CG_Item( cent );
		break;
	case ET.MISSILE:
		CG_Missile( cent );
		break;
	case ET.MOVER:
		CG_Mover( cent );
		break;
	case ET.BEAM:
		CG_Beam( cent );
		break;
	case ET.PORTAL:
		CG_Portal( cent );
		break;
	case ET.SPEAKER:
		CG_Speaker( cent );
		break;
	case ET.GRAPPLE:
		CG_Grapple( cent );
		break;
	case ET.TEAM:
		CG_TeamBase( cent );
		break;
	}*/
}

/**
 * PositionEntityOnTag
 *
 * Modifies the entities position and axis by the given
 * tag location.
 */
// function PositionEntityOnTag(refent, parent, parentModel, tagName) {
// 	int				i;
// 	orientation_t	lerped;
	
// 	// Lerp the tag.
// 	trap_R_LerpTag( &lerped, parentModel, parent->oldframe, parent->frame,
// 		1.0 - parent->backlerp, tagName );

// 	// FIXME: allow origin offsets along tag?
// 	VectorCopy( parent->origin, entity->origin );
// 	for ( i = 0 ; i < 3 ; i++ ) {
// 		VectorMA( entity->origin, lerped.origin[i], parent->axis[i], entity->origin );
// 	}

// 	// had to cast away the const to avoid compiler problems...
// 	MatrixMultiply( lerped.axis, ((refEntity_t *)parent)->axis, entity->axis );
// 	entity->backlerp = parent->backlerp;
// }

/**
 * PositionRotatedEntityOnTag
 * 
 * Modifies the entities position and axis by the given
 * tag location.
 */
function PositionRotatedEntityOnTag(refent, parent, parentModel, tagName) {
	// Lerp the tag.
	var lerped = new sh.Orientation();
	imp.re_LerpTag(lerped, parentModel, parent.oldFrame, parent.frame, 1.0 - parent.backlerp, tagName);

	// FIXME: allow origin offsets along tag?
	var t = [0, 0, 0];

	vec3.set(parent.origin, refent.origin);
	for (var i = 0; i < 3; i++) {
		vec3.add(refent.origin, vec3.scale(parent.axis[i], lerped.origin[i], t));
	}

	// had to cast away the const to avoid compiler problems...
	var tempAxis = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];

	qm.AxisMultiply(refent.axis, lerped.axis, tempAxis);
	qm.AxisMultiply(tempAxis, parent.axis, refent.axis);
}

/**
 * CalcEntityLerpPositions
 */
function CalcEntityLerpPositions(cent) {
	// Make sure the clients use sh.TrajectoryType.INTERPOLATE.
	if (cent.currentState.number < MAX_CLIENTS) {
		cent.currentState.pos.trType = sh.TrajectoryType.INTERPOLATE;
		cent.nextState.pos.trType = sh.TrajectoryType.INTERPOLATE;
	}

	if (cent.interpolate && cent.currentState.pos.trType === sh.TrajectoryType.INTERPOLATE) {
		InterpolateEntityPosition(cent);
		return;
	}

	// First see if we can interpolate between two snaps for
	// linear extrapolated clients
	if (cent.interpolate &&
		cent.currentState.pos.trType === sh.TrajectoryType.LINEAR_STOP &&
		cent.currentState.number < MAX_CLIENTS) {
		InterpolateEntityPosition(cent);
		return;
	}

	// Just use the current frame and evaluate as best we can
	bg.EvaluateTrajectory(cent.currentState.pos, cg.time, cent.lerpOrigin);
	bg.EvaluateTrajectory(cent.currentState.apos, cg.time, cent.lerpAngles);

	// adjust for riding a mover if it wasn't rolled into the predicted
	// player state
	/*if ( cent != &cg.predictedPlayerEntity ) {
		CG_AdjustPositionForMover( cent->lerpOrigin, cent->currentState.groundEntityNum, 
		cg.snap->serverTime, cg.time, cent->lerpOrigin, cent->qm.LerpAngles, cent->qm.LerpAngles);
	}*/
}

/**
 * InterpolateEntityPosition
 */
function InterpolateEntityPosition(cent) {
	// It would be an internal error to find an entity that interpolates without
	// a snapshot ahead of the current one
	if (!cg.nextSnap) {
		error('InterpoateEntityPosition: !cg.nextSnap');
	}

	var f = cg.frameInterpolation;

	// This will linearize a sine or parabolic curve, but it is important
	// to not extrapolate player positions if more recent data is available
	var current = [0, 0, 0];
	var next = [0, 0, 0];

	bg.EvaluateTrajectory(cent.currentState.pos, cg.snap.serverTime, current);
	bg.EvaluateTrajectory(cent.nextState.pos, cg.nextSnap.serverTime, next);

	cent.lerpOrigin[0] = current[0] + f * (next[0] - current[0]);
	cent.lerpOrigin[1] = current[1] + f * (next[1] - current[1]);
	cent.lerpOrigin[2] = current[2] + f * (next[2] - current[2]);

	bg.EvaluateTrajectory(cent.currentState.apos, cg.snap.serverTime, current);
	bg.EvaluateTrajectory(cent.nextState.apos, cg.nextSnap.serverTime, next);

	cent.lerpAngles[0] = qm.LerpAngle(current[0], next[0], f);
	cent.lerpAngles[1] = qm.LerpAngle(current[1], next[1], f);
	cent.lerpAngles[2] = qm.LerpAngle(current[2], next[2], f);
}
