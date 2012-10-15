function AddPacketEntities() {
	// set cg.frameInterpolation
	if (cg.nextSnap) {
		var delta = (cg.nextSnap.serverTime - cg.snap.serverTime);
		if (delta === 0) {
			cg.frameInterpolation = 0;
		} else {
			cg.frameInterpolation = (cg.time - cg.snap.serverTime ) / delta;
		}
	} else {
		cg.frameInterpolation = 0;	// actually, it should never be used, because 
									// no entities should be marked as interpolating
	}

	/*// generate and add the entity from the playerstate
	var ps = cg.predictedPlayerState;
	BG_PlayerStateToEntityState( ps, &cg.predictedPlayerEntity.currentState, qfalse );
	CG_AddCEntity( &cg.predictedPlayerEntity );

	// lerp the non-predicted value for lightning gun origins
	CG_CalcEntityLerpPositions( &cg_entities[ cg.snap->ps.clientNum ] );*/

	// add each entity sent over by the server
	for (var i = 0; i < cg.snap.numEntities; i++) {
		var cent = cg.entities[cg.snap.entities[i].number];
		AddCEntity(cent);
	}
}

function AddCEntity(cent) {
	// Event-only entities will have been dealt with already.
	if (cent.currentState.eType >= EntityType.EVENTS) {
		return;
	}
	
	// Calculate the current origin.
	CalcEntityLerpPositions(cent);

	//if (cent.currentState.eType === EntityType.ITEM) {
	if (cent.currentState.number !== cg.predictedPlayerState.clientNum) {
		var refent = new RefEntity();

		refent.reType = RefEntityType.BBOX;
		vec3.set(cent.lerpOrigin, refent.origin);
		vec3.set([-ITEM_RADIUS, -ITEM_RADIUS, -ITEM_RADIUS], refent.mins);
		vec3.set([ITEM_RADIUS, ITEM_RADIUS, ITEM_RADIUS], refent.maxs);

		cl.AddRefEntityToScene(refent);
	}
	//}

	// add automatic effects
	//CG_EntityEffects( cent );

	/*switch ( cent->currentState.eType ) {
	default:
		CG_Error( "Bad entity type: %i", cent->currentState.eType );
		break;
	case EntityType.INVISIBLE:
	case EntityType.PUSH_TRIGGER:
	case EntityType.TELEPORT_TRIGGER:
		break;
	case EntityType.GENERAL:
		CG_General( cent );
		break;
	case EntityType.PLAYER:
		CG_Player( cent );
		break;
	case EntityType.ITEM:
		CG_Item( cent );
		break;
	case EntityType.MISSILE:
		CG_Missile( cent );
		break;
	case EntityType.MOVER:
		CG_Mover( cent );
		break;
	case EntityType.BEAM:
		CG_Beam( cent );
		break;
	case EntityType.PORTAL:
		CG_Portal( cent );
		break;
	case EntityType.SPEAKER:
		CG_Speaker( cent );
		break;
	case EntityType.GRAPPLE:
		CG_Grapple( cent );
		break;
	case EntityType.TEAM:
		CG_TeamBase( cent );
		break;
	}*/
}

function CalcEntityLerpPositions(cent) {
	// Make sure the clients use TrajectoryType.INTERPOLATE.
	if (cent.currentState.number < MAX_CLIENTS) {
		cent.currentState.pos.trType = TrajectoryType.INTERPOLATE;
		cent.nextState.pos.trType = TrajectoryType.INTERPOLATE;
	}

	if (cent.interpolate && cent.currentState.pos.trType === TrajectoryType.INTERPOLATE) {
		InterpolateEntityPosition(cent);
		return;
	}

	// First see if we can interpolate between two snaps for
	// linear extrapolated clients
	if (cent.interpolate &&
		cent.currentState.pos.trType === TrajectoryType.LINEAR_STOP &&
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
		cg.snap->serverTime, cg.time, cent->lerpOrigin, cent->lerpAngles, cent->lerpAngles);
	}*/
}

function InterpolateEntityPosition(cent) {
	// It would be an internal error to find an entity that interpolates without
	// a snapshot ahead of the current one
	if (!cg.nextSnap) {
		throw new Error('InterpoateEntityPosition: !cg.nextSnap');
	}

	var f = cg.frameInterpolation;

	// This will linearize a sine or parabolic curve, but it is important
	// to not extrapolate player positions if more recent data is available
	var current = vec3.create();
	var next = vec3.create();

	bg.EvaluateTrajectory(cent.currentState.pos, cg.snap.serverTime, current);
	bg.EvaluateTrajectory(cent.nextState.pos, cg.nextSnap.serverTime, next);

	cent.lerpOrigin[0] = current[0] + f * (next[0] - current[0]);
	cent.lerpOrigin[1] = current[1] + f * (next[1] - current[1]);
	cent.lerpOrigin[2] = current[2] + f * (next[2] - current[2]);

	bg.EvaluateTrajectory(cent.currentState.apos, cg.snap.serverTime, current);
	bg.EvaluateTrajectory(cent.nextState.apos, cg.nextSnap.serverTime, next);

	cent.lerpAngles[0] = LerpAngle(current[0], next[0], f);
	cent.lerpAngles[1] = LerpAngle(current[1], next[1], f);
	cent.lerpAngles[2] = LerpAngle(current[2], next[2], f);

}
