/**
 * WeaponSelectable
 */
function WeaponSelectable(i) {
	if (!cg.snap.ps.ammo[i]) {
		return false;
	}

	if (!(cg.snap.ps.stats[STAT.WEAPONS] & (1 << i))) {
		return false;
	}

	return true;
}

/**
 * CmdNextWeapon
 */
function CmdNextWeapon() {
	if (!cg.snap) {
		return;
	}
	if (cg.snap.ps.pm_flags & PMF.FOLLOW) {
		return;
	}

	var original = cg.weaponSelect;

	for (var i = 0; i < MAX_WEAPONS; i++) {
		cg.weaponSelect++;
		if (cg.weaponSelect === MAX_WEAPONS) {
			cg.weaponSelect = 0;
		}
		if (cg.weaponSelect === WP.GAUNTLET) {
			continue;  // never cycle to gauntlet
		}
		if (WeaponSelectable(cg.weaponSelect)) {
			break;
		}
	}
	if (i === MAX_WEAPONS) {
		cg.weaponSelect = original;
	}
}

/**
 * PrevWeapon
 */
function CmdPrevWeapon() {
	if (!cg.snap) {
		return;
	}
	if (cg.snap.ps.pm_flags & PMF.FOLLOW) {
		return;
	}

	var original = cg.weaponSelect;

	for (var i = 0; i < MAX_WEAPONS; i++) {
		cg.weaponSelect--;
		if (cg.weaponSelect === -1) {
			cg.weaponSelect = MAX_WEAPONS - 1;
		}
		if (cg.weaponSelect === WP.GAUNTLET) {
			continue;  // never cycle to gauntlet
		}
		if (WeaponSelectable(cg.weaponSelect)) {
			break;
		}
	}
	if (i === MAX_WEAPONS) {
		cg.weaponSelect = original;
	}
}

/**
 * CmdWeapon
 */
function CmdWeapon(arg1) {
	if (!cg.snap) {
		return;
	}
	if (cg.snap.ps.pm_flags & PMF.FOLLOW) {
		return;
	}

	var num = parseInt(arg1, 10);
	if (num < 1 || num > MAX_WEAPONS-1) {
		return;
	}

	if (!(cg.snap.ps.stats[STAT.WEAPONS] & (1 << num))) {
		return;  // don't have the weapon
	}

	cg.weaponSelect = num;
}

/**
 * AddPlayerWeapon
 *
 * Used for both the view weapon (ps is valid) and the world modelother character models (ps is NULL)
 * The main player will have this called for BOTH cases, so effects like light and
 * sound should only be done on the world model case.
 */
function AddPlayerWeapon(parent, ps, cent) {
	var weaponNum = cent.currentState.weapon;
	var itemInfo = FindItemInfo(IT.WEAPON, weaponNum);

	if (!itemInfo) {
		return;  // WP.NONE
	}

	// Add the weapon.
	var gun = new RE.RefEntity();
	vec3.set(parent.lightingOrigin, gun.lightingOrigin);
	// gun.shadowPlane = parent.shadowPlane;
	gun.renderfx = parent.renderfx;

	// set custom shading for railgun refire rate
	// if( weaponNum == WP_RAILGUN ) {
	// 	clientInfo_t *ci = &cgs.clientinfo[cent.currentState.clientNum];
	// 	if( cent.pe.railFireTime + 1500 > cg.time ) {
	// 		int scale = 255 * ( cg.time - cent.pe.railFireTime ) / 1500;
	// 		gun.shaderRGBA[0] = ( ci.c1RGBA[0] * scale ) >> 8;
	// 		gun.shaderRGBA[1] = ( ci.c1RGBA[1] * scale ) >> 8;
	// 		gun.shaderRGBA[2] = ( ci.c1RGBA[2] * scale ) >> 8;
	// 		gun.shaderRGBA[3] = 255;
	// 	}
	// 	else {
	// 		Byte4Copy( ci.c1RGBA, gun.shaderRGBA );
	// 	}
	// }

	gun.hModel = itemInfo.models.primary;
	if (!gun.hModel) {
		return;
	}

	if (!ps) {
		// Add weapon ready sound.
		cent.pe.lightningFiring = false;

		if ((cent.currentState.eFlags & EF.FIRING) && itemInfo.sounds.firing) {
			// Lightning gun and gauntlet make a different sound when fire is held down.
			SND.AddLoopingSound(null, cent.currentState.number, QMath.vec3origin, itemInfo.sounds.firing);
			cent.pe.lightningFiring = true;
		} else if (itemInfo.sounds.ready) {
			SND.AddLoopingSound(null, cent.currentState.number, QMath.vec3origin, itemInfo.sounds.ready);
		}
	}

	var lerped = new QS.Orientation();
	RE.LerpTag(lerped, parent.hModel, parent.oldFrame, parent.frame, 1.0 - parent.backlerp, 'tag_weapon');
	vec3.set(parent.origin, gun.origin);
	vec3.add(gun.origin, vec3.scale(parent.axis[0], lerped.origin[0], vec3.create()));

	// Make weapon appear left-handed for 2 and centered for 3
	if (ps && cg_drawGun.get() === 2) {
		vec3.add(gun.origin, vec3.scale(parent.axis[1], -lerped.origin[1], vec3.create()));
	} else if(!ps || cg_drawGun.get() !== 3) {
		vec3.add(gun.origin, vec3.scale(parent.axis[1], lerped.origin[1], vec3.create()));
	}

	vec3.add(gun.origin, vec3.scale(parent.axis[2], lerped.origin[2], vec3.create()));
	QMath.AxisMultiply(lerped.axis, parent.axis, gun.axis);
	gun.backlerp = parent.backlerp;

	AddWeaponWithPowerups(gun, cent.currentState.powerups);

	// Add the spinning barrel
	if (itemInfo.models.barrel) {
		var barrel = new RE.RefEntity();

		vec3.set(parent.lightingOrigin, barrel.lightingOrigin);
		// barrel.shadowPlane = parent.shadowPlane;
		barrel.renderfx = parent.renderfx;

		barrel.hModel = itemInfo.models.barrel;
		var angles = vec3.create();
		angles[QMath.YAW] = 0;
		angles[QMath.PITCH] = 0;
		angles[QMath.ROLL] = MachinegunSpinAngle(cent);
		QMath.AnglesToAxis(angles, barrel.axis);

		PositionRotatedEntityOnTag(barrel, gun, itemInfo.models.primary, 'tag_barrel');
		AddWeaponWithPowerups(barrel, cent.currentState.powerups);
	}

	// Make sure we aren't looking at cg.predictedPlayerEntity for LG.
	var nonPredictedCent = cg.entities[cent.currentState.clientNum];

	// Add the flash.
	if ((weaponNum === WP.LIGHTNING || weaponNum === WP.GAUNTLET || weaponNum === WP.GRAPPLING_HOOK) &&
	    (nonPredictedCent.currentState.eFlags & EF.FIRING)) {
		// Continuous flash.
	} else {
		// Impulse flash.
		if (cg.time - cent.muzzleFlashTime > MUZZLE_FLASH_TIME) {
			return;
		}
	}

	var flash = new RE.RefEntity();

	vec3.set(parent.lightingOrigin, flash.lightingOrigin);
	// flash.shadowPlane = parent.shadowPlane;
	flash.renderfx = parent.renderfx;

	flash.hModel = itemInfo.models.flash;
	if (!flash.hModel) {
		return;
	}

	var angles = vec3.create();
	angles[QMath.YAW] = 0;
	angles[QMath.PITCH] = 0;
	angles[QMath.ROLL] = QMath.crandom() * 10;
	QMath.AnglesToAxis(angles, flash.axis);

	// // Colorize the railgun blast.
	// if ( weaponNum == WP_RAILGUN ) {
	// 	clientInfo_t	*ci;

	// 	ci = &cgs.clientinfo[ cent.currentState.clientNum ];
	// 	flash.shaderRGBA[0] = 255 * ci.color1[0];
	// 	flash.shaderRGBA[1] = 255 * ci.color1[1];
	// 	flash.shaderRGBA[2] = 255 * ci.color1[2];
	// }

	PositionRotatedEntityOnTag(flash, gun, itemInfo.models.primary, 'tag_flash');
	RE.AddRefEntityToScene(flash);

	if (ps || cg.renderingThirdPerson || cent.currentState.number !== cg.predictedPlayerState.clientNum) {
		// Add lightning bolt.
		LightningBolt(nonPredictedCent, flash.origin);

		if (itemInfo.flashDlightColor[0] || itemInfo.flashDlightColor[1] || itemInfo.flashDlightColor[2]) {
			RE.AddLightToScene(flash.origin, 300.0 + Math.random() * 32.0,
				itemInfo.flashDlightColor[0], itemInfo.flashDlightColor[1], itemInfo.flashDlightColor[2]);
		}
	}
}

/**********************************************************
 *
 * View weapon
 *
 **********************************************************/

/**
 * AddViewWeapon
 *
 * Add the weapon, and flash for the player's view
 */
function AddViewWeapon(ps) {
	if (ps.pm_type === PM.DEAD ||
		ps.pm_type === PM.INTERMISSION ||
		ps.pm_type === PM.SPECTATOR) {
		return;
	}

	// No gun if in third person view or a camera is active.
	if (cg.renderingThirdPerson/* || cg.cameraMode*/) {
		return;
	}

	// Allow the gun to be completely removed.
 	if (!cg_drawGun.get()) {
 		var origin = vec3.create();

 		if (cg.predictedPlayerState.eFlags & EF.FIRING) {
 			// special hack for lightning gun...
 			vec3.set(cg.refdef.vieworg, origin);
 			vec3.add(origin, vec3.scale(cg.refdef.viewaxis[2], -8, vec3.create()), origin);
 			LightningBolt(cg.entities[ps.clientNum], origin);
 		}
 		return;
 	}

	// // Don't draw if testing a gun model.
	// if (cg.testGun) {
	// 	return;
	// }

	var cent = cg.predictedPlayerEntity;
	var ci = cgs.clientinfo[cent.currentState.clientNum];
	if (!ci.infoValid) {
		return;
	}

	var itemInfo = FindItemInfo(IT.WEAPON, ps.weapon);
	if (!itemInfo) {
		return;  // WP.NONE
	}

	var hand = new RE.RefEntity();

	// Set up gun position.
	var angles = vec3.create();
	CalculateWeaponPosition(hand.origin, angles);

	hand.origin = vec3.add(hand.origin, vec3.scale(cg.refdef.viewaxis[0],cg_gun_x.get(), vec3.create()));
	hand.origin = vec3.add(hand.origin, vec3.scale(cg.refdef.viewaxis[1],cg_gun_y.get(), vec3.create()));
	hand.origin = vec3.add(hand.origin, vec3.scale(cg.refdef.viewaxis[2],cg_gun_z.get(), vec3.create()));

	// Drop gun lower at higher fov.
	var fovOffset = 0;
	if (cg_fov.integer > 90) {
		fovOffset = -0.2 * (cg_fov.integer - 90);
	}
	vec3.add(hand.origin, vec3.scale(cg.refdef.viewaxis[2], fovOffset, vec3.create()));

	QMath.AnglesToAxis(angles, hand.axis);

	// Map torso animations to weapon animations.
	// if (cg_gun_frame.integer) {
	// 	// development tool
	// 	hand.frame = hand.oldframe = cg_gun_frame.integer;
	// 	hand.backlerp = 0;
	// } else {
		// Get clientinfo for animation map.
		hand.frame = MapTorsoToWeaponFrame(ci, cent.pe.torso.frame);
		hand.oldFrame = MapTorsoToWeaponFrame(ci, cent.pe.torso.oldFrame);
		hand.backlerp = cent.pe.torso.backlerp;
	// }

	hand.hModel = itemInfo.models.hand;
	if (!hand.hModel) {
		return;
	}

	hand.renderfx = RF.DEPTHHACK | RF.FIRST_PERSON | RF.MINLIGHT;

	// Add everything onto the hand.
	AddPlayerWeapon(hand, ps, cg.predictedPlayerEntity);
}

/**
 * CalculateWeaponPosition
 */
function CalculateWeaponPosition(origin, angles) {
	var scale, fracsin;

	vec3.set(cg.refdef.vieworg, origin);
	vec3.set(cg.refdefViewAngles, angles);

	// On odd legs, invert some angles.
	if (cg.bobCycle & 1) {
		scale = -cg.xyspeed;
	} else {
		scale = cg.xyspeed;
	}

	// Gun angles from bobbing.
	angles[QMath.ROLL] += scale * cg.bobFracSin * 0.005;
	angles[QMath.YAW] += scale * cg.bobFracSin * 0.01;
	angles[QMath.PITCH] += cg.xyspeed * cg.bobFracSin * 0.005;

	// Drop the weapon when landing
	var delta = cg.time - cg.landTime;
	if (delta < LAND_DEFLECT_TIME) {
		origin[2] += cg.landChange * 0.25 * delta / LAND_DEFLECT_TIME;
	} else if (delta < LAND_DEFLECT_TIME + LAND_RETURN_TIME) {
		origin[2] += cg.landChange * 0.25 *
			(LAND_DEFLECT_TIME + LAND_RETURN_TIME - delta) / LAND_RETURN_TIME;
	}

	// Idle drift.
	scale = cg.xyspeed + 40;
	fracsin = Math.sin(cg.time * 0.001);
	angles[QMath.ROLL] += scale * fracsin * 0.01;
	angles[QMath.YAW] += scale * fracsin * 0.01;
	angles[QMath.PITCH] += scale * fracsin * 0.01;
}

/**
 * MapTorsoToWeaponFrame
 */
function MapTorsoToWeaponFrame(ci, frame) {
	// Change weapon.
	if (frame >= ci.animations[ANIM.TORSO_DROP].firstFrame &&
		frame < ci.animations[ANIM.TORSO_DROP].firstFrame + 9) {
		return frame - ci.animations[ANIM.TORSO_DROP].firstFrame + 6;
	}

	// Stand attack.
	if (frame >= ci.animations[ANIM.TORSO_ATTACK].firstFrame &&
		frame < ci.animations[ANIM.TORSO_ATTACK].firstFrame + 6) {
		return 1 + frame - ci.animations[ANIM.TORSO_ATTACK].firstFrame;
	}

	// Stand attack 2.
	if (frame >= ci.animations[ANIM.TORSO_ATTACK2].firstFrame &&
		frame < ci.animations[ANIM.TORSO_ATTACK2].firstFrame + 6) {
		return 1 + frame - ci.animations[ANIM.TORSO_ATTACK2].firstFrame;
	}

	return 0;
}

/**
 * MachinegunSpinAngle
 */
var SPIN_SPEED = 0.9;
var COAST_TIME = 1000;

function MachinegunSpinAngle(cent) {
	var delta = cg.time - cent.pe.barrelTime;
	var angle;

	if (cent.pe.barrelSpinning) {
		angle = cent.pe.barrelAngle + delta * SPIN_SPEED;
	} else {
		if (delta > COAST_TIME) {
			delta = COAST_TIME;
		}

		var speed = 0.5 * (SPIN_SPEED + (COAST_TIME - delta) / COAST_TIME);
		angle = cent.pe.barrelAngle + delta * speed;
	}

	if (cent.pe.barrelSpinning === !(cent.currentState.eFlags & EF.FIRING)) {
		cent.pe.barrelTime = cg.time;
		cent.pe.barrelAngle = QMath.AngleNormalize360(angle);
		cent.pe.barrelSpinning = !!(cent.currentState.eFlags & EF.FIRING);
	}

	return angle;
}

/**
 * AddWeaponWithPowerups
 */
function AddWeaponWithPowerups(gun, powerups) {
	// Add powerup effects.
	if (powerups & (1 << PW.INVIS)) {
		gun.customShader = cgs.media.invisShader;
		RE.AddRefEntityToScene(gun);
	} else {
		RE.AddRefEntityToScene(gun);

		if (powerups & (1 << PW.BATTLESUIT)) {
			gun.customShader = cgs.media.battleWeaponShader;
			RE.AddRefEntityToScene(gun);
		}
		if (powerups & (1 << PW.QUAD)) {
			gun.customShader = cgs.media.quadWeaponShader;
			RE.AddRefEntityToScene(gun);
		}
	}
}

/**
 * OutOfAmmoChange
 *
 * The current weapon has just run out of ammo
 */
function OutOfAmmoChange() {
	for (var i = MAX_WEAPONS - 1; i > 0; i--) {
		if (WeaponSelectable(i)) {
			cg.weaponSelect = i;
			break;
		}
	}
}

/**********************************************************
 *
 * Weapon events
 *
 **********************************************************/

/**
 * FireWeapon
 *
 * Caused by an EV.FIRE_WEAPON event.
 */
function FireWeapon(cent) {
	var es = cent.currentState;
	if (es.weapon === WP.NONE) {
		return;
	}
	if (es.weapon >= WP.NUM_WEAPONS) {
		error('FireWeapon: es.weapon >= WP.NUM_WEAPONS');
		return;
	}

	var itemInfo = FindItemInfo(IT.WEAPON, es.weapon);

	// Mark the entity as muzzle flashing, so when it is added it will
	// append the flash to the weapon model.
	cent.muzzleFlashTime = cg.time;

	// Lightning gun only does this this on initial press
	if (es.weapon === WP.LIGHTNING) {
		if (cent.pe.lightningFiring) {
			return;
		}
	}

	if (es.weapon === WP.RAILGUN) {
		cent.pe.railFireTime = cg.time;
	}

	// Play quad sound if needed.
	if (cent.currentState.powerups & (1 << PW.QUAD)) {
		var quadInfo = FindItemInfo(IT.POWERUP, PW.QUAD);
		SND.StartSound(null, cent.currentState.number, /*CHAN_ITEM,*/ quadInfo.sounds.use);
	}

	// Play a sound
	for (var c = 0; c < 4; c++) {
		if (!itemInfo.sounds['flash' + c]) {
			break;
		}
	}
	if (c > 0) {
		c = QMath.irrandom(0, c-1);
		SND.StartSound(null, es.number, itemInfo.sounds['flash' + c]);
	}

	// // Do brass ejection.
	// if (weaponInfo.ejectBrassFunc && cg_brassTime.integer > 0) {
	// 	weaponInfo.ejectBrassFunc(cent);
	// }
}

/**
 * MissileHitWall
 *
 * Caused by an EV_MISSILE_MISS event, or directly by local bullet tracing.
 */
function MissileHitWall(weapon, clientNum, origin, dir, soundType) {
	var mod = null;
	var mark = 0;
	var shader = 0;
	var sfx = 0;
	var radius = 32;
	var light = 0;
	var lightColor = vec3.create();
	var isSprite = false;
	var duration = 600;
	var r = -1;

	var itemInfo = FindItemInfo(IT.WEAPON, weapon);

	switch (weapon) {
		case WP.MACHINEGUN:
			mod = cgs.media.bulletFlashModel;
			shader = itemInfo.shaders.bulletExplosion;
			mark = cgs.media.bulletMarkShader;
			r = QMath.irrandom(0, 2);
			if (r === 0) {
				sfx = itemInfo.sounds.ric0;
			} else if (r === 1) {
				sfx = itemInfo.sounds.ric1;
			} else {
				sfx = itemInfo.sounds.ric2;
			}
			radius = 8;
			break;
		case WP.SHOTGUN:
			mod = cgs.media.bulletFlashModel;
			shader = itemInfo.shaders.bulletExplosion;
			mark = cgs.media.bulletMarkShader;
			sfx = 0;
			radius = 4;
			break;
		case WP.GRENADE_LAUNCHER:
			mod = cgs.media.dishFlashModel;
			shader = itemInfo.shaders.explosion;
			sfx = cgs.media.sfx_rockexp;
			mark = cgs.media.burnMarkShader;
			radius = 64;
			light = 300;
			isSprite = true;
			break;
		case WP.ROCKET_LAUNCHER:
			mod = cgs.media.dishFlashModel;
			shader = itemInfo.shaders.explosion;
			sfx = itemInfo.sounds.explosion;
			mark = cgs.media.burnMarkShader;
			radius = 64;
			light = 300;
			isSprite = true;
			duration = 1000;
			lightColor[0] = 1;
			lightColor[1] = 0.75;
			lightColor[2] = 0.0;
			break;
		case WP.LIGHTNING:
			// No explosion at LG impact, it is added with the beam
			r = QMath.irrandom(0, 2);
			if (r === 0) {
				sfx = itemInfo.sounds.hit0;
			} else if (r === 1) {
				sfx = itemInfo.sounds.hit1;
			} else {
				sfx = itemInfo.sounds.hit2;
			}
			mark = cgs.media.holeMarkShader;
			radius = 12;
			break;
		case WP.RAILGUN:
			mod = cgs.media.ringFlashModel;
			shader = itemInfo.shaders.explosion;
			sfx = itemInfo.sounds.explosion;
			mark = cgs.media.energyMarkShader;
			radius = 24;
			break;
		case WP.PLASMAGUN:
			mod = cgs.media.ringFlashModel;
			shader = itemInfo.shaders.explosion;
			sfx = itemInfo.sounds.explosion;
			mark = cgs.media.energyMarkShader;
			radius = 16;
			break;
		case WP.BFG:
			mod = cgs.media.dishFlashModel;
			shader = itemInfo.shaders.explosion;
			sfx = cgs.media.sfx_rockexp;
			mark = cgs.media.burnMarkShader;
			radius = 32;
			isSprite = true;
			break;
	}

	if (sfx) {
		SND.StartSound(origin, -1/*ENTITYNUM_WORLD*/, sfx);
	}

	//
	// Create the explosion.
	//
	if (mod) {
		var le = MakeExplosion(origin, dir, mod, shader, duration, isSprite);
		le.light = light;
		vec3.set(lightColor, le.lightColor);
		// if ( weapon == WP_RAILGUN ) {
		// 	// colorize with client color
		// 	VectorCopy( cgs.clientinfo[clientNum].color1, le.color );
		// 	le.refEntity.shaderRGBA[0] = le.color[0] * 0xff;
		// 	le.refEntity.shaderRGBA[1] = le.color[1] * 0xff;
		// 	le.refEntity.shaderRGBA[2] = le.color[2] * 0xff;
		// 	le.refEntity.shaderRGBA[3] = 0xff;
		// }
	}

	//
	// Create the impact mark.
	//
	var alphaFade = (mark === cgs.media.energyMarkShader);  // plasma fades alpha, all others fade color
	// if ( weapon == WP_RAILGUN ) {
	// 	float	*color;

	// 	// colorize with client color
	// 	color = cgs.clientinfo[clientNum].color1;
	// 	CG_ImpactMark( mark, origin, dir, random()*360, color[0],color[1], color[2],1, alphaFade, radius, false );
	// } else {
		ImpactMark(mark, origin, dir, Math.random()*360, 1, 1, 1, 1, alphaFade, radius, false);
	// }
}

/**
 * MissileHitPlayer
 */
function MissileHitPlayer(weapon, origin, dir, entityNum) {
	Bleed(origin, entityNum);

	// Some weapons will make an explosion with the blood, while
	// others will just make the blood.
	switch (weapon) {
		case WP.GRENADE_LAUNCHER:
		case WP.ROCKET_LAUNCHER:
		case WP.PLASMAGUN:
		case WP.BFG:
			MissileHitWall(weapon, 0, origin, dir, IMPACTSOUND.FLESH);
			break;
		default:
			break;
	}
}

/**********************************************************
 *
 * Bullets
 *
 **********************************************************/

/**
 * BulletHit
 *
 * Renders bullet effects.
 */
function BulletHit(end, sourceEntityNum, normal, flesh, fleshEntityNum) {
	// // If the shooter is currently valid, calc a source point and possibly
	// // do trail effects.
	// if ( sourceEntityNum >= 0 && cg_tracerChance.value > 0 ) {
	// 	if ( CG_CalcMuzzlePoint( sourceEntityNum, start ) ) {
	// 		sourceContentType = CG_PointContents( start, 0 );
	// 		destContentType = CG_PointContents( end, 0 );

	// 		// do a complete bubble trail if necessary
	// 		if ( ( sourceContentType == destContentType ) && ( sourceContentType & SURF.CONTENTS.WATER ) ) {
	// 			CG_BubbleTrail( start, end, 32 );
	// 		}
	// 		// bubble trail from water into air
	// 		else if ( ( sourceContentType & SURF.CONTENTS.WATER ) ) {
	// 			trap_CM_BoxTrace( &trace, end, start, NULL, NULL, 0, SURF.CONTENTS.WATER );
	// 			CG_BubbleTrail( start, trace.endPos, 32 );
	// 		}
	// 		// bubble trail from air into water
	// 		else if ( ( destContentType & SURF.CONTENTS.WATER ) ) {
	// 			trap_CM_BoxTrace( &trace, start, end, NULL, NULL, 0, SURF.CONTENTS.WATER );
	// 			CG_BubbleTrail( trace.endPos, end, 32 );
	// 		}

	// 		// draw a tracer
	// 		if ( random() < cg_tracerChance.value ) {
	// 			CG_Tracer( start, end );
	// 		}
	// 	}
	// }

	// Impact splash and mark.
	if (flesh) {
		Bleed(end, fleshEntityNum);
	} else {
		MissileHitWall(WP.MACHINEGUN, 0, end, normal, IMPACTSOUND.DEFAULT);
	}
}

/**********************************************************
 *
 * Shotgun Tracing
 *
 **********************************************************/

/**
 * ShotgunPellet
 */
function ShotgunPellet(start, end, skipNum) {
	var sourceContentType, destContentType;

	var trace = new QS.TraceResults();
	Trace(trace, start, end, null, null, skipNum, MASK.SHOT);

// 	sourceContentType = PointContents(start, 0);
// 	destContentType = PointContents(tr.endPos, 0);
//
// 	// FIXME: should probably move this cruft into CG_BubbleTrail
// 	if ( sourceContentType == destContentType ) {
// 		if ( sourceContentType & SURF.CONTENTS.WATER ) {
// 			CG_BubbleTrail( start, tr.endPos, 32 );
// 		}
// 	} else if ( sourceContentType & SURF.CONTENTS.WATER ) {
// 		var trace;
//
// 		CM.BoxTrace( &trace, end, start, NULL, NULL, 0, SURF.CONTENTS.WATER );
// 		CG_BubbleTrail( start, trace.endPos, 32 );
// 	} else if ( destContentType & SURF.CONTENTS.WATER ) {
// 		var trace;
//
// 		CM.BoxTrace( &trace, start, end, NULL, NULL, 0, SURF.CONTENTS.WATER );
// 		CG_BubbleTrail( tr.endPos, trace.endPos, 32 );
// 	}

	if (trace.surfaceFlags & SURF.FLAGS.NOIMPACT) {
		return;
	}

	if (cg.entities[trace.entityNum].currentState.eType == ET.PLAYER) {
		MissileHitPlayer(WP.SHOTGUN, trace.endPos, trace.plane.normal, trace.entityNum);
	} else {
		if (trace.surfaceFlags & SURF.FLAGS.NOIMPACT) {
			// SURF_NOIMPACT will not make a flame puff or a mark
			return;
		}

		if (trace.surfaceFlags & SURF.FLAGS.METALSTEPS) {
			MissileHitWall(WP.SHOTGUN, 0, trace.endPos, trace.plane.normal, IMPACTSOUND.METAL);
		} else {
			MissileHitWall(WP.SHOTGUN, 0, trace.endPos, trace.plane.normal, IMPACTSOUND.DEFAULT);
		}
	}
}

/**
 * ShotgunPattern
 *
 * Perform the same traces the server did to locate the
 * hit splashes
 */
function ShotgunPattern(origin, origin2, seed, otherEntNum) {
	var i;
	var r, u;
	var end     = vec3.create();
	var forward = vec3.create(),
		right   = vec3.create(),
		up      = vec3.create();

	// Derive the right and up vectors from the forward vector, because
	// the client won't have any other information.
	vec3.normalize(origin2, forward);
	QMath.PerpendicularVector(forward, right);
	vec3.cross(forward, right, up);

	// Generate the "random" spread pattern.
	for ( i = 0 ; i < DEFAULT_SHOTGUN_COUNT ; i++ ) {
		r = QMath.crandom() * DEFAULT_SHOTGUN_SPREAD * 16;
		u = QMath.crandom() * DEFAULT_SHOTGUN_SPREAD * 16;
		vec3.add(origin, vec3.scale(forward, 8192 * 16, vec3.create()), end);
		vec3.add(end, vec3.scale(right, r, vec3.create()));
		vec3.add(end, vec3.scale(up, u, vec3.create()));

		ShotgunPellet(origin, end, otherEntNum);
	}
}

/**
 * ShotgunFire
 */
function ShotgunFire(es) {
	var v = vec3.subtract(es.origin2, es.pos.trBase, vec3.create());
	vec3.normalize(v);
	vec3.scale(v, 32);
	vec3.add(v, es.pos.trBase);

	var contents = PointContents(es.pos.trBase, 0);
	if (!(contents & SURF.CONTENTS.WATER)) {
		var up = vec3.createFrom(0, 0, 8);
		SmokePuff(v, up,
			32,
			1, 1, 1, 0.33,
			900,
			cg.time,
			0,
			LEF.PUFF_DONT_SCALE,
			cgs.media.shotgunSmokePuffShader);
	}

	ShotgunPattern(es.pos.trBase, es.origin2, es.eventParm, es.otherEntityNum);
}

/**********************************************************
 *
 * Weapon special fx
 *
 **********************************************************/

/**
 * LightningBolt
 *
 * Origin will be the exact tag point, which is slightly
 * different than the muzzle point used for determining hits.
 * The cent should be the non-predicted cent if it is from the player,
 * so the endpoint will reflect the simulated strike (lagging the predicted
 * angle)
 */
function LightningBolt(cent, origin) {
	var beam = new RE.RefEntity();
	var forward = vec3.create();
	var muzzlePoint = vec3.create();
	var endPoint = vec3.create();

	if (cent.currentState.weapon !== WP.LIGHTNING) {
		return;
	}

	var itemInfo = FindItemInfo(IT.WEAPON, WP.LIGHTNING);

	// CPMA "true" lightning.
	if ((cent.currentState.number === cg.predictedPlayerState.clientNum) && cg_trueLightning.get() !== 0) {
		var angle = vec3.create();

		for (var i = 0; i < 3; i++) {
			var a = cent.lerpAngles[i] - cg.refdefViewAngles[i];
			if (a > 180) {
				a -= 360;
			}
			if (a < -180) {
				a += 360;
			}

			angle[i] = cg.refdefViewAngles[i] + a * (1.0 - cg_trueLightning.get());
			if (angle[i] < 0) {
				angle[i] += 360;
			}
			if (angle[i] > 360) {
				angle[i] -= 360;
			}
		}

		QMath.AnglesToVectors(angle, forward, null, null);
		vec3.set(cent.lerpOrigin, muzzlePoint);
	} else {
		// !CPMA
		QMath.AnglesToVectors(cent.lerpAngles, forward, null, null);
		vec3.set(cent.lerpOrigin, muzzlePoint);
	}

	var anim = cent.currentState.legsAnim & ~ANIM_TOGGLEBIT;
	if (anim === ANIM.LEGS_WALKCR || anim === ANIM.LEGS_IDLECR) {
		muzzlePoint[2] += CROUCH_VIEWHEIGHT;
	} else {
		muzzlePoint[2] += DEFAULT_VIEWHEIGHT;
	}

	vec3.add(muzzlePoint, vec3.scale(forward, 14, vec3.create()), muzzlePoint);

	// Project forward by the lightning range.
	vec3.add(muzzlePoint, vec3.scale(forward, LIGHTNING_RANGE, vec3.create()), endPoint);

	// See if it hit a wall.
	var trace = new QS.TraceResults();
	Trace(trace, muzzlePoint, endPoint, QMath.vec3origin, QMath.vec3origin,
		cent.currentState.number, MASK.SHOT);

	// This is the endpoint.
	vec3.set(trace.endPos, beam.oldOrigin);

	// Use the provided origin, even though it may be slightly
	// different than the muzzle origin.
	vec3.set(origin, beam.origin);

	beam.reType = RT.LIGHTNING;
	beam.customShader = itemInfo.shaders.lightning;
	RE.AddRefEntityToScene(beam);

	// Add the impact flare if it hit something.
	if (trace.fraction < 1.0) {
		var angles = vec3.create();
		var dir = vec3.create();

		vec3.subtract(beam.oldOrigin, beam.origin, dir);
		vec3.normalize(dir);

		beam = new RE.RefEntity();
		beam.hModel = itemInfo.models.explosion;

		vec3.add(trace.endPos, vec3.scale(dir, -16, vec3.create()), beam.origin);

		// Make a random orientation.
		angles[0] = QMath.rrandom(0, 360);
		angles[1] = QMath.rrandom(0, 360);
		angles[2] = QMath.rrandom(0, 360);
		QMath.AnglesToAxis(angles, beam.axis);
		RE.AddRefEntityToScene(beam);
	}
}

function RocketTrail(cent, itemInfo) {
	// if (cg_noProjectileTrail.integer) {
	// 	return;
	// }

	var up = vec3.create();
	var origin = vec3.create();
	var lastPos = vec3.create();
	var step = 50;
	var es = cent.currentState;
	var startTime = cent.trailTime;

	cent.trailTime = cg.time;

	BG.EvaluateTrajectory(es.pos, cg.time, origin);

	// If object (e.g. grenade) is stationary, don't toss up smoke.
	if (es.pos.trType === TR.STATIONARY) {
		return;
	}

	// var contents = CG_PointContents( origin, -1 );
	BG.EvaluateTrajectory(es.pos, cent.trailTime, lastPos);
	// var lastContents = CG_PointContents( lastPos, -1 );

	// if ( contents & ( SURF.CONTENTS.WATER | SURF.CONTENTS.SLIME | SURF.CONTENTS.LAVA ) ) {
	// 	if ( contents & lastContents & SURF.CONTENTS.WATER ) {
	// 		CG_BubbleTrail( lastPos, origin, 8 );
	// 	}
	// 	return;
	// }

	var t = step * Math.floor((startTime + step) / step);
	for (; t <= cent.trailTime; t += step) {
		BG.EvaluateTrajectory(es.pos, t, lastPos);

		var smoke = SmokePuff(lastPos, up,
		          itemInfo.trailRadius,
		          1, 1, 1, 0.33,
		          itemInfo.trailTime,
		          t,
		          0,
		          0,
		          cgs.media.smokePuffShader);

		// Use the optimized local entity add
		smoke.leType = LE.SCALE_FADE;
	}

}

/**
 * GrenadeTrail
 */
function GrenadeTrail (ent, itemInfo) {
	RocketTrail(ent, itemInfo);
}

/**
 * PlasmaTrail
 */
function PlasmaTrail(cent, wi) {
	var le = AllocLocalEntity();
	var refent = le.refent;
	var es = cent.currentState;
	var velocity = vec3.create();
	var xvelocity = vec3.create();
	var origin = vec3.create();
	var offset = vec3.create();
	var xoffset = vec3.create();
	var v = [
	          vec3.create(),
	          vec3.create(),
	          vec3.create()
	        ];
	var waterScale = 1.0;
	var itemInfo = FindItemInfo(IT.WEAPON, WP.PLASMAGUN);

// 	if (cg_noProjectileTrail.integer || cg_oldPlasma.integer) {
// 		return;
// 	}

	BG.EvaluateTrajectory(es.pos, cg.time, origin);

	velocity[0] = 60 - 120 * QMath.crandom();
	velocity[1] = 40 - 80 * QMath.crandom();
	velocity[2] = 100 - 200 * QMath.crandom();

	le.leType = LE.MOVE_SCALE_FADE;
// 	le.leFlags = LEF_TUMBLE;
// 	le.leBounceSoundType = LEBS_NONE;
// 	le.leMarkType = LEMT_NONE;

	le.startTime = cg.time;
	le.endTime = le.startTime + 600;

	le.pos.trType = TR.GRAVITY;
	le.pos.trTime = cg.time;

	QMath.AnglesToAxis(cent.lerpAngles, v);

	offset[0] = 2;
	offset[1] = 2;
	offset[2] = 2;

	xoffset[0] = offset[0] * v[0][0] + offset[1] * v[1][0] + offset[2] * v[2][0];
	xoffset[1] = offset[0] * v[0][1] + offset[1] * v[1][1] + offset[2] * v[2][1];
	xoffset[2] = offset[0] * v[0][2] + offset[1] * v[1][2] + offset[2] * v[2][2];

	vec3.add(origin, xoffset, RE.origin);
	vec3.set(refent.origin, le.pos.trBase);

	if (PointContents(refent.origin, -1) & SURF.CONTENTS.WATER) {
		waterScale = 0.10;
	}

	xvelocity[0] = velocity[0] * v[0][0] + velocity[1] * v[1][0] + velocity[2] * v[2][0];
	xvelocity[1] = velocity[0] * v[0][1] + velocity[1] * v[1][1] + velocity[2] * v[2][1];
	xvelocity[2] = velocity[0] * v[0][2] + velocity[1] * v[1][2] + velocity[2] * v[2][2];
	vec3.scale(xvelocity, waterScale, le.pos.trDelta);

	QMath.AxisCopy(QMath.axisDefault, refent.axis);

	refent.shaderTime = cg.time / 1000;
	refent.reType = RT.SPRITE;
	refent.radius = 0.25;
	refent.customShader = itemInfo.shaders.missile;
	le.bounceFactor = 0.3;

// 	RE.shaderRGBA[0] = wi.flashDlightColor[0] * 63;
// 	RE.shaderRGBA[1] = wi.flashDlightColor[1] * 63;
// 	RE.shaderRGBA[2] = wi.flashDlightColor[2] * 63;
	refent.shaderRGBA[3] = 63;

// 	le.color[0] = wi.flashDlightColor[0] * 0.2;
// 	le.color[1] = wi.flashDlightColor[1] * 0.2;
// 	le.color[2] = wi.flashDlightColor[2] * 0.2;
	le.color[3] = 0.25;

	le.angles.trType = TR.LINEAR;
	le.angles.trTime = cg.time;
	le.angles.trBase[0] = QMath.irrandom(0, 31);
	le.angles.trBase[1] = QMath.irrandom(0, 31);
	le.angles.trBase[2] = QMath.irrandom(0, 31);
	le.angles.trDelta[0] = 1;
	le.angles.trDelta[1] = 0.5;
	le.angles.trDelta[2] = 0;
}

/**
 * RailTrail
 */
var RADIUS = 4;
var ROTATION = 1;
var SPACING = 5;

function RailTrail(ci, start, end) {
	var le = AllocLocalEntity();
	var refent = le.refent;

	var itemInfo = FindItemInfo(IT.WEAPON, WP.RAILGUN);

	start[2] -= 4;

	le.leType = LE.FADE_RGB;
	le.startTime = cg.time;
	le.endTime = cg.time + cg_railTrailTime.get();
	le.lifeRate = 1.0 / (le.endTime - le.startTime);

	refent.shaderTime = cg.time / 1000;
	refent.reType = RT.RAIL_CORE;
	refent.customShader = itemInfo.shaders.core;

	vec3.set(start, refent.origin);
	vec3.set(end, refent.oldOrigin);

	refent.shaderRGBA[0] = 1/*ci.color1[0]*/ * 255;
	refent.shaderRGBA[1] = 0/*ci.color1[1]*/ * 255;
	refent.shaderRGBA[2] = 0/*ci.color1[2]*/ * 255;
	refent.shaderRGBA[3] = 255;

	le.color[0] = 1/*ci.color1[0]*/ * 0.75;
	le.color[1] = 0/*ci.color1[1]*/ * 0.75;
	le.color[2] = 0/*ci.color1[2]*/ * 0.75;
	le.color[3] = 1.0;

	QMath.AxisClear(refent.axis);
}
