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
		AddCEntity( cent );
	}
}

function AddCEntity(cent) {
	// Event-only entities will have been dealt with already.
	if (cent.currentState.eType >= EntityType.EVENTS) {
		return;
	}
	
	if (cent.currentState.eType === EntityType.ITEM) {
		var refent = new RefEntity();

		refent.reType = RefEntityType.BBOX;
		vec3.set(cent.currentState.origin, refent.origin);
		vec3.set([-ITEM_RADIUS, -ITEM_RADIUS, -ITEM_RADIUS], refent.mins);
		vec3.set([ITEM_RADIUS, ITEM_RADIUS, ITEM_RADIUS], refent.maxs);

		cl.AddRefEntityToScene(refent);
	}

	// Calculate the current origin.
	//CG_CalcEntityLerpPositions(cent);

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