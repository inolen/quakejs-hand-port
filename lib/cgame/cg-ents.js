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
	// CalcEntityLerpPositions( &cg_entities[ cg.snap.ps.clientNum ] );

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

	// Add automatic effects.
	EntityEffects(cent);

	switch (cent.currentState.eType) {
		case ET.ITEM:
			AddItem(cent);
			break;

		case ET.MISSILE:
			AddMissile(cent);
			break;

		case ET.PLAYER:
			AddPlayer(cent);
			break;
	}

	/*switch ( cent.currentState.eType ) {
	default:
		CG_Error( "Bad entity type: %i", cent.currentState.eType );
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
// 	trap_R_LerpTag( &lerped, parentModel, parent.oldframe, parent.frame,
// 		1.0 - parent.backlerp, tagName );

// 	// FIXME: allow origin offsets along tag?
// 	VectorCopy( parent.origin, entity.origin );
// 	for ( i = 0 ; i < 3 ; i++ ) {
// 		VectorMA( entity.origin, lerped.origin[i], parent.axis[i], entity.origin );
// 	}

// 	// had to cast away the const to avoid compiler problems...
// 	MatrixMultiply( lerped.axis, ((refEntity_t *)parent).axis, entity.axis );
// 	entity.backlerp = parent.backlerp;
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
	// Make sure the clients use TR.INTERPOLATE.
	if (cent.currentState.number < MAX_CLIENTS) {
		cent.currentState.pos.trType = TR.INTERPOLATE;
		cent.nextState.pos.trType = TR.INTERPOLATE;
	}

	if (cent.interpolate && cent.currentState.pos.trType === TR.INTERPOLATE) {
		InterpolateEntityPosition(cent);
		return;
	}

	// First see if we can interpolate between two snaps for
	// linear extrapolated clients
	if (cent.interpolate &&
		cent.currentState.pos.trType === TR.LINEAR_STOP &&
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
		CG_AdjustPositionForMover( cent.lerpOrigin, cent.currentState.groundEntityNum, 
		cg.snap.serverTime, cg.time, cent.lerpOrigin, cent.qm.LerpAngles, cent.qm.LerpAngles);
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

/**
 * EntityEffects
 */
function EntityEffects(cent) {
	// Update sound origins.
	SetEntitySoundPosition(cent);

	// // Add looping sound.
	// if ( cent->currentState.loopSound ) {
	// 	if (cent->currentState.eType != ET_SPEAKER) {
	// 		trap_S_AddLoopingSound( cent->currentState.number, cent->lerpOrigin, vec3_origin, 
	// 			cgs.gameSounds[ cent->currentState.loopSound ] );
	// 	} else {
	// 		trap_S_AddRealLoopingSound( cent->currentState.number, cent->lerpOrigin, vec3_origin, 
	// 			cgs.gameSounds[ cent->currentState.loopSound ] );
	// 	}
	// }

	// // Constant light glow.
	// if (cent->currentState.constantLight) {
	// 	int		cl;
	// 	float		i, r, g, b;

	// 	cl = cent->currentState.constantLight;
	// 	r = (float) (cl & 0xFF) / 255.0;
	// 	g = (float) ((cl >> 8) & 0xFF) / 255.0;
	// 	b = (float) ((cl >> 16) & 0xFF) / 255.0;
	// 	i = (float) ((cl >> 24) & 0xFF) * 4.0;
	// 	trap_R_AddLightToScene(cent->lerpOrigin, i, r, g, b);
	// }
}

/**
 * SetEntitySoundPosition
 */
function SetEntitySoundPosition(cent) {
	// if (cent.currentState.solid === SOLID.BMODEL) {
	// 	vec3_t	origin;
	// 	float	*v;

	// 	v = cgs.inlineModelMidpoints[ cent->currentState.modelindex ];
	// 	VectorAdd( cent->lerpOrigin, v, origin );
	// 	trap_S_UpdateEntityPosition( cent->currentState.number, origin );
	// } else {
		imp.snd_UpdateEntityPosition(cent.currentState.number, cent.lerpOrigin);
	// }
}

/**
 * AddItem
 */
function AddItem(cent) {
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
}

/**
 * AddMissile
 */
function AddMissile(cent) {	
	var es = cent.currentState;
	if (es.weapon >= WP.NUM_WEAPONS) {
		es.weapon = 0;
	}
	var weaponInfo = cg.weaponInfo[es.weapon];

	// Calculate the axis.
	vec3.set(es.angles, cent.lerpAngles);

	// Add trails.
	// if (weaponInfo.missileTrailFunc) {
	// 	weaponInfo.missileTrailFunc( cent, weapon );
	// }

	// Add dynamic light
	// if (weaponInfo.missileDlight) {
	// 	trap_R_AddLightToScene(cent.lerpOrigin, weaponInfo.missileDlight, 
	// 		weaponInfo.missileDlightColor[0], weaponInfo.missileDlightColor[1], weaponInfo.missileDlightColor[2] );
	// }

	// // Add missile sound.
	// if (weaponInfo.missileSound) {
	// 	var velocity = [0, 0, 0];

	// 	bg.EvaluateTrajectoryDelta(cent.currentState.pos, cg.time, velocity);

	// 	trap_S_AddLoopingSound( cent.currentState.number, cent.lerpOrigin, velocity, weaponInfo.missileSound );
	// }

	// Create the render entity.
	var refent = new re.RefEntity();
	vec3.set(cent.lerpOrigin, refent.origin);
	vec3.set(cent.lerpOrigin, refent.oldOrigin);

	// if (cent.currentState.weapon == WP_PLASMAGUN) {
	// 	ent.reType = RT_SPRITE;
	// 	ent.radius = 16;
	// 	ent.rotation = 0;
	// 	ent.customShader = cgs.media.plasmaBallShader;
	// 	trap_R_AddRefEntityToScene( &ent );
	// 	return;
	// }

	// Flicker between two skins.
	refent.skinNum = cg.clientFrame & 1;
	refent.hModel = weaponInfo.missileModel;
	refent.renderfx = weaponInfo.missileRenderfx | RF.NOSHADOW;

	// Convert direction of travel into axis.
	vec3.normalize(es.pos.trDelta, refent.axis[0]);
	if (vec3.length(es.pos.trDelta) === 0) {
		refent.axis[0][2] = 1;
	}
	// FIXME Until we make it spin.
	qm.PerpendicularVector(refent.axis[0], refent.axis[1]);
	vec3.cross(refent.axis[0], refent.axis[1], refent.axis[2]);

	// Spin as it moves.
	// if (espos.trType != TR.STATIONARY) {
	// 	RotateAroundDirection(ent.axis, cg.time / 4);
	// } else {
	// 	RotateAroundDirection(ent.axis, es.time);
	// }

	// Add to refresh list, possibly with quad glow.
	AddRefEntityWithPowerups(refent, es/*, TEAM_FREE*/);
}