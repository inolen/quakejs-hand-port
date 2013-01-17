/**
 * AddPacketEntities
 */
function AddPacketEntities() {
	// Set cg.frameInterpolation.
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

	// Lerp the non-predicted value for lightning gun origins.
	CalcEntityLerpPositions(cg.entities[cg.snap.ps.clientNum]);

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
		case ET.PORTAL:
			AddPortal(cent);
			break;

		case ET.ITEM:
			AddItem(cent);
			break;

		case ET.MISSILE:
			AddMissile(cent);
			break;

		case ET.MOVER:
			AddMover(cent);
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
// 	trap_R_LerpTag( &lerped, parentModel, parent.oldFrame, parent.frame,
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
	var lerped = new QShared.Orientation();
	re.LerpTag(lerped, parentModel, parent.oldFrame, parent.frame, 1.0 - parent.backlerp, tagName);

	// FIXME: allow origin offsets along tag?
	var t = vec3.create();

	vec3.set(parent.origin, refent.origin);
	for (var i = 0; i < 3; i++) {
		vec3.add(refent.origin, vec3.scale(parent.axis[i], lerped.origin[i], t));
	}

	// had to cast away the const to avoid compiler problems...
	var tempAxis = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];

	QMath.AxisMultiply(refent.axis, lerped.axis, tempAxis);
	QMath.AxisMultiply(tempAxis, parent.axis, refent.axis);
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
		cg.snap.serverTime, cg.time, cent.lerpOrigin, cent.QMath.LerpAngles, cent.QMath.LerpAngles);
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
	var current = vec3.create();
	var next = vec3.create();

	bg.EvaluateTrajectory(cent.currentState.pos, cg.snap.serverTime, current);
	bg.EvaluateTrajectory(cent.nextState.pos, cg.nextSnap.serverTime, next);

	cent.lerpOrigin[0] = current[0] + f * (next[0] - current[0]);
	cent.lerpOrigin[1] = current[1] + f * (next[1] - current[1]);
	cent.lerpOrigin[2] = current[2] + f * (next[2] - current[2]);

	bg.EvaluateTrajectory(cent.currentState.apos, cg.snap.serverTime, current);
	bg.EvaluateTrajectory(cent.nextState.apos, cg.nextSnap.serverTime, next);

	cent.lerpAngles[0] = QMath.LerpAngle(current[0], next[0], f);
	cent.lerpAngles[1] = QMath.LerpAngle(current[1], next[1], f);
	cent.lerpAngles[2] = QMath.LerpAngle(current[2], next[2], f);
}

/**
 * EntityEffects
 */
function EntityEffects(cent) {
	// Update sound origins.
	SetEntitySoundPosition(cent);

	// // Add looping sound.
	// if ( cent.currentState.loopSound ) {
	// 	if (cent.currentState.eType != ET_SPEAKER) {
	// 		trap_S_AddLoopingSound( cent.currentState.number, cent.lerpOrigin, vec3origin,
	// 			cgs.gameSounds[ cent.currentState.loopSound ] );
	// 	} else {
	// 		trap_S_AddRealLoopingSound( cent.currentState.number, cent.lerpOrigin, vec3origin,
	// 			cgs.gameSounds[ cent.currentState.loopSound ] );
	// 	}
	// }

	// // Constant light glow.
	// if (cent.currentState.constantLight) {
	// 	var cl = cent.currentState.constantLight;
	// 	var r = (cl & 0xFF) / 255.0;
	// 	var g = ((cl >> 8) & 0xFF) / 255.0;
	// 	var b = ((cl >> 16) & 0xFF) / 255.0;
	// 	var i = ((cl >> 24) & 0xFF) * 4.0;
	// 	re.AddLightToScene(cent.lerpOrigin, i, r, g, b);
	// }
}

/**
 * SetEntitySoundPosition
 */
function SetEntitySoundPosition(cent) {
	// if (cent.currentState.solid === SOLID.BMODEL) {
	// 	vec3_t	origin;
	// 	float	*v;

	// 	v = cgs.inlineModelMidpoints[ cent.currentState.modelIndex ];
	// 	VectorAdd( cent.lerpOrigin, v, origin );
	// 	trap_S_UpdateEntityPosition( cent.currentState.number, origin );
	// } else {
		snd.UpdateEntityPosition(cent.currentState.number, cent.lerpOrigin);
	// }
}

/**
 * AddPortal
 */
function AddPortal(cent) {
	var es = cent.currentState;

	// Create the render entity
	var refent = new re.RefEntity();
	vec3.set(cent.lerpOrigin, refent.origin);
	vec3.set(es.origin2, refent.oldOrigin);
	QMath.ByteToDir(es.eventParm, refent.axis[0]);
	QMath.PerpendicularVector(refent.axis[0], refent.axis[1]);

	// Negating this tends to get the directions like they want
	// we really should have a camera roll value
	vec3.subtract(QMath.vec3origin, refent.axis[1], refent.axis[1]);

	vec3.cross(refent.axis[0], refent.axis[1], refent.axis[2]);
	refent.reType = RT.PORTALSURFACE;
	refent.oldFrame = es.powerups;
	refent.frame = es.frame;  // rotation speed
	refent.skinNum = es.clientNum / 256.0 * 360;  // roll offset

	// Add to refresh list.
	re.AddRefEntityToScene(refent);
}

/**
 * AddItem
 */
function AddItem(cent) {
	var es = cent.currentState;
	var item = bg.ItemList[es.modelIndex];
	var itemInfo = cg.itemInfo[es.modelIndex];

	// If set to invisible, skip.
	if (!es.modelIndex || (es.eFlags & EF.NODRAW)) {
		return;
	}

	// TODO Pool these?
	var refent = new re.RefEntity();
	refent.reType = RT.MODEL;

	// Items bob up and down continuously.
	var scale = 0.005 + cent.currentState.number * 0.00001;
	cent.lerpOrigin[2] += 4 + Math.cos((cg.time + 1000) *  scale) * 4;

	// Autorotate at one of two speeds.
	if (item.giType === IT.HEALTH) {
		vec3.set(cg.autoAnglesFast, cent.lerpAngles);
	} else {
		vec3.set(cg.autoAngles, cent.lerpAngles);
	}
	QMath.AnglesToAxis(cent.lerpAngles, refent.axis);

	// The weapons have their origin where they attatch to player
	// models, so we need to offset them or they will rotate
	// eccentricly.
	if (item.giType === IT.WEAPON) {
		cent.lerpOrigin[0] -=
			itemInfo.weaponMidpoint[0] * refent.axis[0][0] +
			itemInfo.weaponMidpoint[1] * refent.axis[1][0] +
			itemInfo.weaponMidpoint[2] * refent.axis[2][0];
		cent.lerpOrigin[1] -=
			itemInfo.weaponMidpoint[0] * refent.axis[0][1] +
			itemInfo.weaponMidpoint[1] * refent.axis[1][1] +
			itemInfo.weaponMidpoint[2] * refent.axis[2][1];
		cent.lerpOrigin[2] -=
			itemInfo.weaponMidpoint[0] * refent.axis[0][2] +
			itemInfo.weaponMidpoint[1] * refent.axis[1][2] +
			itemInfo.weaponMidpoint[2] * refent.axis[2][2];

		cent.lerpOrigin[2] += 8;  // an extra height boost
	}

	// if (item.giType === IT.WEAPON && item.giTag === WP.RAILGUN) {
	// 	clientInfo_t *ci = &cgs.clientinfo[cg.snap.ps.clientNum];
	// 	Byte4Copy( ci.c1RGBA, ent.shaderRGBA );
	// }

	refent.hModel = itemInfo.models.primary;

	vec3.set(cent.lerpOrigin, refent.origin);
	vec3.set(cent.lerpOrigin, refent.oldOrigin);

	refent.nonNormalizedAxes = false;

	// If just respawned, slowly scale up.
	var msec = cg.time - cent.miscTime;
	var frac = 1.0;
	if (msec >= 0 && msec < ITEM_SCALEUP_TIME) {
		frac = msec / ITEM_SCALEUP_TIME;
		vec3.scale(refent.axis[0], frac);
		vec3.scale(refent.axis[1], frac);
		vec3.scale(refent.axis[2], frac);
		refent.nonNormalizedAxes = true;
	}

	// Items without glow textures need to keep a minimum light value
	// so they are always visible.
	if ((item.giType === IT.WEAPON) ||
		 (item.giType === IT.ARMOR)) {
		refent.renderfx |= RF.MINLIGHT;
	}

	// increase the size of the weapons when they are presented as items
	if (item.giType === IT.WEAPON) {
		vec3.scale(refent.axis[0], 1.5);
		vec3.scale(refent.axis[1], 1.5);
		vec3.scale(refent.axis[2], 1.5);
		refent.nonNormalizedAxes = true;
	}

	// Add to refresh list.
	re.AddRefEntityToScene(refent);

	// Add accompanying rings / spheres for powerups.
	if (item.giType === IT.HEALTH || item.giType === IT.POWERUP) {
		if (itemInfo.models.secondary) {
			var spinAngles = vec3.create();

			if (item.giType === IT.POWERUP) {
				refent.origin[2] += 12;
				spinAngles[1] = (cg.time % 1024) * 360 / -1024;
			}

			QMath.AnglesToAxis(spinAngles, refent.axis);
			refent.hModel = itemInfo.models.secondary;

			// Scale up if respawning.
			if (frac !== 1.0) {
				vec3.scale(refent.axis[0], frac);
				vec3.scale(refent.axis[1], frac);
				vec3.scale(refent.axis[2], frac);
				refent.nonNormalizedAxes = true;
			}

			re.AddRefEntityToScene(refent);
		}
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
	var itemInfo = FindItemInfo(IT.WEAPON, es.weapon);

	// Calculate the axis.
	vec3.set(es.angles, cent.lerpAngles);

	// Add dlight / trails.
	var trailFunc;

	switch (es.weapon) {
		case WP.GRENADE_LAUNCHER:
			trailFunc = GrenadeTrail;
			break;

		case WP.ROCKET_LAUNCHER:
			trailFunc = RocketTrail;
			break;

		case WP.PLASMAGUN:
			trailFunc = PlasmaTrail;
			break;
	}

	if (trailFunc) {
		trailFunc(cent, itemInfo);
	}

	// Add dynamic light.
	if (itemInfo.missileDlightIntensity) {
		re.AddLightToScene(cent.lerpOrigin, itemInfo.missileDlightIntensity,
			itemInfo.missileDlightColor[0], itemInfo.missileDlightColor[1], itemInfo.missileDlightColor[2]);
	}

	// // Add missile sound.
	if (itemInfo.missileSound) {
	// 	var velocity = vec3.create();
		
	// 	bg.EvaluateTrajectoryDelta(cent.currentState.pos, cg.time, velocity);
		
		snd.AddLoopingSound(cent.currentState.number, cent.lerpOrigin, /*velocity*/ undefined, weaponInfo.missileSound);
	}

	// Create the render entity.
	var refent = new re.RefEntity();
	vec3.set(cent.lerpOrigin, refent.origin);
	vec3.set(cent.lerpOrigin, refent.oldOrigin);

	if (cent.currentState.weapon === WP.PLASMAGUN) {
		refent.reType = RT.SPRITE;
		refent.radius = 16;
		refent.rotation = 0;
		refent.customShader = cgs.media.plasmaBallShader;
		re.AddRefEntityToScene(refent);
		return;
	}

	// Flicker between two skins.
	refent.skinNum = cg.clientFrame & 1;
	refent.hModel = itemInfo.models.missile;
	refent.renderfx = RF.NOSHADOW;

	// Convert direction of travel into axis.
	vec3.normalize(es.pos.trDelta, refent.axis[0]);
	if (vec3.length(es.pos.trDelta) === 0) {
		refent.axis[0][2] = 1;
	}

	// Spin as it moves.
	if (es.pos.trType !== TR.STATIONARY) {
		QMath.RotateAroundDirection(refent.axis, cg.time / 4);
	} else {
		QMath.RotateAroundDirection(refent.axis, es.time);
	}

	// Add to refresh list, possibly with quad glow.
	AddRefEntityWithPowerups(refent, es/*, TEAM_FREE*/);
}

function AddMover(cent) {
	var es = cent.currentState;

	// Create the render entity.
	var refent = new re.RefEntity();
	refent.reType = RT.MODEL;
	vec3.set(cent.lerpOrigin, refent.origin);
	vec3.set(cent.lerpOrigin, refent.oldOrigin);
	QMath.AnglesToAxis(cent.lerpAngles, refent.axis);

	refent.renderfx = RF.NOSHADOW;

	// Flicker between two skins (FIXME?).
	refent.skinNum = (cg.time >> 6 ) & 1;

	// Get the model, either as a bmodel or a modelIndex.
	if (es.solid === SOLID_BMODEL) {
		refent.hModel = cgs.inlineDrawModels[es.modelIndex];
	}
	// } else {
	// 	refent.hModel = cgs.gameModels[es.modelIndex];
	// }

	// Add to refresh list.
	re.AddRefEntityToScene(refent);

	// Add the secondary model.
	// if (es.modelIndex2) {
	// 	refent.skinNum = 0;
	// 	refent.hModel = cgs.gameModels[es.modelIndex2];
	// 	re.AddRefEntityToScene(refent);
	// }
}
