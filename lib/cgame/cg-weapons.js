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

	cg.weaponSelectTime = cg.time;
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

	// cg.weaponSelectTime = cg.time;
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

	// cg.weaponSelectTime = cg.time;

	if (!(cg.snap.ps.stats[STAT.WEAPONS] & (1 << num))) {
		return;  // don't have the weapon
	}

	cg.weaponSelect = num;
}

/**
 * RegisterWeapon
 */
function RegisterWeapon(gitem) {
	var path;
	var weaponNum = gitem.giTag;
	if (weaponNum === 0) {
		return;
	}
	
	var weaponInfo = cg.weaponInfo[weaponNum];
	if (weaponInfo) {
		return;
	}
	
	weaponInfo = cg.weaponInfo[weaponNum] = new WeaponInfo();
	
	weaponInfo.weaponModel = re.RegisterModel(gitem.models[0]);
	
	// // calc midpoint for rotation
	// trap_R_ModelBounds( weaponInfo.weaponModel, mins, maxs );
	// for ( i = 0 ; i < 3 ; i++ ) {
	// 	weaponInfo.weaponMidpoint[i] = mins[i] + 0.5 * ( maxs[i] - mins[i] );
	// }
	
	weaponInfo.weaponIcon = ui.RegisterImage(gitem.icon);
	weaponInfo.ammoIcon = ui.RegisterImage(gitem.icon);
	
	// for ( ammo = bg_itemlist + 1 ; ammo.classname ; ammo++ ) {
	// 	if ( ammo.giType == IT_AMMO && ammo.giTag == weaponNum ) {
	// 		break;
	// 	}
	// }
	// if ( ammo.classname && ammo.world_model[0] ) {
	// 	weaponInfo.ammoModel = trap_R_RegisterModel( ammo.world_model[0] );
	// }
	
	var path = gitem.models[0].replace('.md3', '_flash.md3');
	weaponInfo.flashModel = re.RegisterModel(path);
	
	// TODO Move to GameItemDesc and search for it from that array?
	if (weaponNum === WP.GAUNTLET || weaponNum === WP.MACHINEGUN || weaponNum === WP.BFG) {
		path = gitem.models[0].replace('.md3', '_barrel.md3');
		weaponInfo.barrelModel = re.RegisterModel(path);
	}
	
	path = gitem.models[0].replace('.md3', '_hand.md3');
	weaponInfo.handsModel = re.RegisterModel(path);
	
	// if ( !weaponInfo.handsModel ) {
	// 	weaponInfo.handsModel = trap_R_RegisterModel( "models/weapons2/shotgun/shotgun_hand.md3" );
	// }
	
	switch (weaponNum) {
		case WP.GAUNTLET:
	//		MAKERGB( weaponInfo.flashDlightColor, 0.6f, 0.6f, 1.0f );
			weaponInfo.firingSound = snd.RegisterSound('sound/weapons/melee/fstrun');
			weaponInfo.flashSound[0] = snd.RegisterSound('sound/weapons/melee/fstatck');
			break;
		
		case WP.MACHINEGUN:
			// MAKERGB( weaponInfo.flashDlightColor, 1, 1, 0 );
			weaponInfo.flashSound[0] = snd.RegisterSound('sound/weapons/machinegun/machgf1b');
			weaponInfo.flashSound[1] = snd.RegisterSound('sound/weapons/machinegun/machgf2b');
			weaponInfo.flashSound[2] = snd.RegisterSound('sound/weapons/machinegun/machgf3b');
			weaponInfo.flashSound[3] = snd.RegisterSound('sound/weapons/machinegun/machgf4b');
			cgs.media.sfx_ric1 = snd.RegisterSound('sound/weapons/machinegun/ric1');
			cgs.media.sfx_ric2 = snd.RegisterSound('sound/weapons/machinegun/ric2');
			cgs.media.sfx_ric3 = snd.RegisterSound('sound/weapons/machinegun/ric3');
			// weaponInfo.ejectBrassFunc = CG_MachineGunEjectBrass;
			cgs.media.bulletExplosionShader = re.RegisterShader('bulletExplosion');
			break;
		
		case WP.LIGHTNING:
	//		MAKERGB( weaponInfo.flashDlightColor, 0.6f, 0.6f, 1.0f );
			weaponInfo.readySound = snd.RegisterSound('sound/weapons/melee/fsthum');
			weaponInfo.firingSound = snd.RegisterSound('sound/weapons/lightning/lg_hum');
			weaponInfo.flashSound[0] = snd.RegisterSound('sound/weapons/lightning/lg_fire');
			cgs.media.lightningShader = re.RegisterShader('lightningBoltNew');
			cgs.media.lightningExplosionModel = re.RegisterModel('models/weaphits/crackle.md3');
			cgs.media.sfx_lghit1 = snd.RegisterSound('sound/weapons/lightning/lg_hit');
			cgs.media.sfx_lghit2 = snd.RegisterSound('sound/weapons/lightning/lg_hit2');
			cgs.media.sfx_lghit3 = snd.RegisterSound('sound/weapons/lightning/lg_hit3');
			break;
		
		case WP.GRAPPLING_HOOK:
	// 		MAKERGB( weaponInfo.flashDlightColor, 0.6f, 0.6f, 1.0f );
			weaponInfo.missileModel = re.RegisterModel('models/ammo/rocket/rocket.md3');
	// 		weaponInfo.missileTrailFunc = CG_GrappleTrail;
	// 		weaponInfo.missileDlight = 200;
	// 		MAKERGB( weaponInfo.missileDlightColor, 1, 0.75f, 0 );
			weaponInfo.readySound = snd.RegisterSound('sound/weapons/melee/fsthum');
			weaponInfo.firingSound = snd.RegisterSound('sound/weapons/melee/fstrun');
			cgs.media.lightningShader = re.RegisterShader('lightningBoltNew');
			break;
		
		case WP.SHOTGUN:
	// 		MAKERGB( weaponInfo.flashDlightColor, 1, 1, 0 );
			weaponInfo.flashSound[0] = snd.RegisterSound('sound/weapons/shotgun/sshotf1b');
	// 		weaponInfo.ejectBrassFunc = CG_ShotgunEjectBrass;
			break;
		
		case WP.ROCKET_LAUNCHER:
			weaponInfo.missileModel = re.RegisterModel('models/ammo/rocket/rocket.md3');
			weaponInfo.missileSound = snd.RegisterSound('sound/weapons/rocket/rockfly');
			weaponInfo.missileTrailFunc = RocketTrail;
	// 		weaponInfo.missileDlight = 200;
			weaponInfo.trailTime = 2000;
			weaponInfo.trailRadius = 64;
	// 		MAKERGB( weaponInfo.missileDlightColor, 1, 0.75f, 0 );
	// 		MAKERGB( weaponInfo.flashDlightColor, 1, 0.75f, 0 );
			weaponInfo.flashSound[0] = snd.RegisterSound('sound/weapons/rocket/rocklf1a');
			cgs.media.rocketExplosionShader = re.RegisterShader('rocketExplosion');
			cgs.media.rocketExplosionSfx = snd.RegisterSound('sound/weapons/rocket/rocklx1a');
			break;
		
		case WP.GRENADE_LAUNCHER:
			weaponInfo.missileModel = re.RegisterModel('models/ammo/grenade1.md3');
			weaponInfo.missileTrailFunc = GrenadeTrail;
			weaponInfo.trailTime = 700;
			weaponInfo.trailRadius = 32;
	// 		MAKERGB( weaponInfo.flashDlightColor, 1, 0.70f, 0 );
			weaponInfo.flashSound[0] = snd.RegisterSound('sound/weapons/grenade/grenlf1a');
			cgs.media.hgrenb1aSound = snd.RegisterSound('sound/weapons/grenade/hgrenb1a');
			cgs.media.hgrenb2aSound = snd.RegisterSound('sound/weapons/grenade/hgrenb2a');
			cgs.media.grenadeExplosionShader = re.RegisterShader('grenadeExplosion');
			break;
		
		case WP.PLASMAGUN:
//			weaponInfo.missileModel = cgs.media.invulnerabilityPowerupModel;
			weaponInfo.missileTrailFunc = PlasmaTrail;
			weaponInfo.missileSound = snd.RegisterSound('sound/weapons/plasma/lasfly');
	// 		MAKERGB( weaponInfo.flashDlightColor, 0.6f, 0.6f, 1.0f );
			weaponInfo.flashSound[0] = snd.RegisterSound('sound/weapons/plasma/hyprbf1a');
			cgs.media.plasmaExplosionShader = re.RegisterShader('plasmaExplosion');
			cgs.media.railRingsShader = re.RegisterShader('railDisc');
			cgs.media.plasmaExpSfx = snd.RegisterSound('sound/weapons/plasma/plasmx1a');
			break;

		case WP.RAILGUN:
			weaponInfo.readySound = snd.RegisterSound('sound/weapons/railgun/rg_hum');
	// 		MAKERGB( weaponInfo.flashDlightColor, 1, 0.5f, 0 );
			weaponInfo.flashSound[0] = snd.RegisterSound('sound/weapons/railgun/railgf1a');
			cgs.media.railExplosionShader = re.RegisterShader('railExplosion');
			cgs.media.railRingsShader = re.RegisterShader('railDisc');
			cgs.media.railCoreShader = re.RegisterShader('railCore');
			break;
		
		case WP.BFG:
			weaponInfo.readySound = snd.RegisterSound('sound/weapons/bfg/bfg_hum');
	// 		MAKERGB( weaponInfo.flashDlightColor, 1, 0.7f, 1 );
			weaponInfo.flashSound[0] = snd.RegisterSound('sound/weapons/bfg/bfg_fire');
			cgs.media.bfgExplosionShader = re.RegisterShader('bfgExplosion');
			weaponInfo.missileModel = re.RegisterModel('models/weaphits/bfg.md3');
			weaponInfo.missileSound = snd.RegisterSound('sound/weapons/rocket/rockfly');
			break;

		 default:
			// MAKERGB( weaponInfo.flashDlightColor, 1, 1, 1 );
			// weaponInfo.flashSound[0] = trap_S_RegisterSound( "sound/weapons/rocket/rocklf1a", false );
			break;
	}
}

/**
 * AddPlayerWeapon
 *
 * Used for both the view weapon (ps is valid) and the world modelother character models (ps is NULL)
 * The main player will have this called for BOTH cases, so effects like light and
 * sound should only be done on the world model case.
 */
function AddPlayerWeapon(parent, ps, cent/*, team*/) {
	var weaponNum = cent.currentState.weapon;
	var weapon = cg.weaponInfo[weaponNum];

	// TODO remove this once we call RegisterWeapon
	if (!weapon) {
		return;
	}

	// add the weapon
	var gun = new re.RefEntity();
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

	gun.hModel = weapon.weaponModel;
	if (!gun.hModel) {
		return;
	}

	if (!ps) {
		// Add weapon ready sound.
		cent.pe.lightningFiring = false;
		if ((cent.currentState.eFlags & EF.FIRING) && weapon.firingSound) {
			// Lightning gun and gauntlet make a different sound when fire is held down.
//			AddLoopingSound( cent.currentState.number, cent.lerpOrigin, vec3_origin, weapon.firingSound );
			cent.pe.lightningFiring = true;
		} else if (weapon.readySound) {
//			AddLoopingSound( cent.currentState.number, cent.lerpOrigin, vec3_origin, weapon.readySound );
		}
	}
	var lerped = new sh.Orientation();
	re.LerpTag(lerped, parent.hModel, parent.oldFrame, parent.frame, 1.0 - parent.backlerp, 'tag_weapon');
	vec3.set(parent.origin, gun.origin);
	vec3.add(gun.origin, vec3.scale(parent.axis[0], lerped.origin[0], [0, 0, 0]));

	// // Make weapon appear left-handed for 2 and centered for 3
	// if(ps && cg_drawGun.integer == 2)
	// 	VectorMA(gun.origin, -lerped.origin[1], parent.axis[1], gun.origin);
	// else if(!ps || cg_drawGun.integer != 3)
		vec3.add(gun.origin, vec3.scale(parent.axis[1], lerped.origin[1], [0, 0, 0]));

	vec3.add(gun.origin, vec3.scale(parent.axis[2], lerped.origin[2], [0, 0, 0]));
	QMath.AxisMultiply(lerped.axis, parent.axis, gun.axis);
	gun.backlerp = parent.backlerp;

	AddWeaponWithPowerups(gun, cent.currentState.powerups);

	// Add the spinning barrel
	if (weapon.barrelModel) {
		var barrel = new re.RefEntity();

		vec3.set(parent.lightingOrigin, barrel.lightingOrigin);
		// barrel.shadowPlane = parent.shadowPlane;
		barrel.renderfx = parent.renderfx;

		barrel.hModel = weapon.barrelModel;
		var angles = [0, 0, 0];
		angles[QMath.YAW] = 0;
		angles[QMath.PITCH] = 0;
		angles[QMath.ROLL] = MachinegunSpinAngle(cent);
		QMath.AnglesToAxis(angles, barrel.axis);

		PositionRotatedEntityOnTag(barrel, gun, weapon.weaponModel, 'tag_barrel');
		AddWeaponWithPowerups(barrel, cent.currentState.powerups);
	}

	// Make sure we aren't looking at cg.predictedPlayerEntity for LG.
	var nonPredictedCent = cg.entities[cent.currentState.clientNum];
		
	// Add the flash.
	if ((weaponNum === WP.LIGHTNING || weaponNum === WP.GAUNTLET || weaponNum === WP.GRAPPLING_HOOK) &&
	    (nonPredictedCent.currentState.eFlags & EF.FIRING)) 
	{
		// continuous flash
	} else {
		// impulse flash
		if (cg.time - cent.muzzleFlashTime > MUZZLE_FLASH_TIME) {
			return;
		}
	}
	
	var flash = new re.RefEntity();
	
	vec3.set(parent.lightingOrigin, flash.lightingOrigin);
	// flash.shadowPlane = parent.shadowPlane;
	flash.renderfx = parent.renderfx;

	flash.hModel = weapon.flashModel;
	if (!flash.hModel) {
		return;
	}
	
	var angles = [0, 0, 0];
	angles[QMath.YAW] = 0;
	angles[QMath.PITCH] = 0;
	angles[QMath.ROLL] = QMath.crandom() * 10;
	QMath.AnglesToAxis(angles, flash.axis);
	
	// // colorize the railgun blast
	// if ( weaponNum == WP_RAILGUN ) {
	// 	clientInfo_t	*ci;
	
	// 	ci = &cgs.clientinfo[ cent.currentState.clientNum ];
	// 	flash.shaderRGBA[0] = 255 * ci.color1[0];
	// 	flash.shaderRGBA[1] = 255 * ci.color1[1];
	// 	flash.shaderRGBA[2] = 255 * ci.color1[2];
	// }
	
	PositionRotatedEntityOnTag(flash, gun, weapon.weaponModel, 'tag_flash');
	re.AddRefEntityToScene(flash);
	
	if (ps || cg.renderingThirdPerson || cent.currentState.number !== cg.predictedPlayerState.clientNum) {
		// Add lightning bolt.
		LightningBolt(nonPredictedCent, flash.origin);
		
	// 	if ( weapon.flashDlightColor[0] || weapon.flashDlightColor[1] || weapon.flashDlightColor[2] ) {
	// 		trap_R_AddLightToScene( flash.origin, 300 + (rand()&31), weapon.flashDlightColor[0],
	// 			weapon.flashDlightColor[1], weapon.flashDlightColor[2] );
	// 	}
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
	if (ps.persistant[PERS.TEAM] === TEAM.SPECTATOR) {
		return;
	}
	
	if (ps.pm_type === PM.INTERMISSION) {
		return;
	}
	
	// No gun if in third person view or a camera is active.
	if (cg.renderingThirdPerson/* || cg.cameraMode*/) {
		return;
	}
	
	// Allow the gun to be completely removed.
// 	if (!cg_drawGun()) {
// 		var origin = [0, 0, 0];
// 		
// 		if (cg.predictedPlayerState.eFlags & EF.FIRING) {
// 			// special hack for lightning gun...
// 			vec3.set(cg.refdef.vieworg, origin);
// 			vec3.add(origin, vec3.scale(cg.refdef.viewaxis[2], -8, [0, 0, 0]), origin);
// 			LightningBolt(cg.entities[ps.clientNum], origin);
// 		}
// 		return;
// 	}

	// // Don't draw if testing a gun model.
	// if (cg.testGun) {
	// 	return;
	// }

	var cent = cg.predictedPlayerEntity;
	var ci = cgs.clientinfo[cent.currentState.clientNum];
	if (!ci.infoValid) {
		return;
	}

	var hand = new re.RefEntity();
	var weaponInfo = cg.weaponInfo[ps.weapon];

	// Set up gun position.
	var angles = [0, 0, 0];
	CalculateWeaponPosition(hand.origin, angles);

	// Drop gun lower at higher fov.
	var fovOffset = 0;
	if (cg_fov.integer > 90) {
		fovOffset = -0.2 * (cg_fov.integer - 90);
	}
	vec3.add(hand.origin, vec3.scale(cg.refdef.viewaxis[2], fovOffset, [0, 0, 0]));

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

	hand.hModel = weaponInfo.handsModel;
	hand.renderfx = RF.DEPTHHACK | RF.FIRST_PERSON | RF.MINLIGHT;

	// Add everything onto the hand.
	AddPlayerWeapon(hand, ps, cg.predictedPlayerEntity/*, ps.persistant[PERS.TEAM]*/);
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
	// delta = cg.time - cg.landTime;
	// if ( delta < LAND_DEFLECT_TIME ) {
	// 	origin[2] += cg.landChange*0.25 * delta / LAND_DEFLECT_TIME;
	// } else if ( delta < LAND_DEFLECT_TIME + LAND_RETURN_TIME ) {
	// 	origin[2] += cg.landChange*0.25 * 
	// 		(LAND_DEFLECT_TIME + LAND_RETURN_TIME - delta) / LAND_RETURN_TIME;
	// }

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

	if (cent.pe.barrelSpinning == !(cent.currentState.eFlags & EF.FIRING)) {
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
		re.AddRefEntityToScene(gun);
	} else {
		re.AddRefEntityToScene(gun);

		if (powerups & (1 << PW.BATTLESUIT)) {
			gun.customShader = cgs.media.battleWeaponShader;
			re.AddRefEntityToScene(gun);
		}
		if (powerups & (1 << PW.QUAD)) {
			gun.customShader = cgs.media.quadWeaponShader;
			re.AddRefEntityToScene(gun);
		}
	}
}

/**
 * OutOfAmmoChange
 *
 * The current weapon has just run out of ammo
 */
function OutOfAmmoChange() {	
	cg.weaponSelectTime = cg.time;
	
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
 * Caused by an EV_FIRE_WEAPON event.
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
	
	var weaponInfo = cg.weaponInfo[es.weapon];
	
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
	// if (cent.currentState.powerups & (1 << PW_QUAD)) {
	// 	trap_S_StartSound (NULL, cent.currentState.number, CHAN_ITEM, cgs.media.quadSound );
	// }
	
	// Play a sound
	for (var c = 0; c < 4; c++) {
		if (!weaponInfo.flashSound[c]) {
			break;
		}
	}
	if (c > 0) {
		c = Math.floor(Math.random() * c);
		if (weaponInfo.flashSound[c]) {
			snd.StartSound(null, es.number, weaponInfo.flashSound[c]);
		}
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
	var lightColor = [0, 0, 0];
	var isSprite = false;
	var duration = 600;
	var r = -1;
	
	switch (weapon) {
		// default:
		case WP.LIGHTNING:
			// No explosion at LG impact, it is added with the beam
			r = Math.floor(Math.random() * 3);
			if (r === 0) {
				sfx = cgs.media.sfx_lghit2;
			} else if ( r === 1 ) {
				sfx = cgs.media.sfx_lghit1;
			} else {
				sfx = cgs.media.sfx_lghit3;
			}
			mark = cgs.media.holeMarkShader;
			radius = 12;
			break;
		case WP.GRENADE_LAUNCHER:
			mod = cgs.media.dishFlashModel;
			shader = cgs.media.grenadeExplosionShader;
			sfx = cgs.media.sfx_rockexp;
			mark = cgs.media.burnMarkShader;
			radius = 64;
			light = 300;
			isSprite = true;
			break;
		case WP.ROCKET_LAUNCHER:
			mod = cgs.media.dishFlashModel;
			shader = cgs.media.rocketExplosionShader;
			sfx = cgs.media.rocketExplosionSfx;
			mark = cgs.media.burnMarkShader;
			radius = 64;
			light = 300;
			isSprite = true;
			duration = 1000;
			// lightColor[0] = 1;
			// lightColor[1] = 0.75;
			// lightColor[2] = 0.0;
			break;
		case WP.RAILGUN:
			mod = cgs.media.ringFlashModel;
			shader = cgs.media.railExplosionShader;
			sfx = cgs.media.plasmaExpSfx;
			mark = cgs.media.energyMarkShader;
			radius = 24;
			break;
		case WP.PLASMAGUN:
			mod = cgs.media.ringFlashModel;
			shader = cgs.media.plasmaExplosionShader;
			sfx = cgs.media.sfx_plasmaexp;
			mark = cgs.media.energyMarkShader;
			radius = 16;
			break;
		case WP.BFG:
			mod = cgs.media.dishFlashModel;
			shader = cgs.media.bfgExplosionShader;
			sfx = cgs.media.sfx_rockexp;
			mark = cgs.media.burnMarkShader;
			radius = 32;
			isSprite = true;
			break;
		case WP.SHOTGUN:
			mod = cgs.media.bulletFlashModel;
			shader = cgs.media.bulletExplosionShader;
			mark = cgs.media.bulletMarkShader;
			sfx = 0;
			radius = 4;
			break;
		case WP.MACHINEGUN:
			mod = cgs.media.bulletFlashModel;
			shader = cgs.media.bulletExplosionShader;
			mark = cgs.media.bulletMarkShader;
			r = Math.floor(Math.random() * 3);
			if (r === 0) {
				sfx = cgs.media.sfx_ric1;
			} else if (r === 1) {
				sfx = cgs.media.sfx_ric2;
			} else {
				sfx = cgs.media.sfx_ric3;
			}
			radius = 8;
			break;
	}

	if (sfx) {
		snd.StartSound(origin, -1/*ENTITYNUM_WORLD*/, sfx);
	}

	//
	// Create the explosion.
	//
	if (mod) {
		var le = MakeExplosion(origin, dir, mod, shader, duration, isSprite);
		// le.light = light;
		// vec3.set(lightColor, le.lightColor);
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
	// 		if ( ( sourceContentType == destContentType ) && ( sourceContentType & CONTENTS.WATER ) ) {
	// 			CG_BubbleTrail( start, end, 32 );
	// 		}
	// 		// bubble trail from water into air
	// 		else if ( ( sourceContentType & CONTENTS.WATER ) ) {
	// 			trap_CM_BoxTrace( &trace, end, start, NULL, NULL, 0, CONTENTS.WATER );
	// 			CG_BubbleTrail( start, trace.endPos, 32 );
	// 		}
	// 		// bubble trail from air into water
	// 		else if ( ( destContentType & CONTENTS.WATER ) ) {
	// 			trap_CM_BoxTrace( &trace, start, end, NULL, NULL, 0, CONTENTS.WATER );
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
	var tr;
	var sourceContentType, destContentType;
	
	
	tr = Trace(start, end, null, null, skipNum, MASK.SHOT);
	
// 	sourceContentType = PointContents(start, 0);
// 	destContentType = PointContents(tr.endPos, 0);
// 	
// 	// FIXME: should probably move this cruft into CG_BubbleTrail
// 	if ( sourceContentType == destContentType ) {
// 		if ( sourceContentType & CONTENTS.WATER ) {
// 			CG_BubbleTrail( start, tr.endPos, 32 );
// 		}
// 	} else if ( sourceContentType & CONTENTS.WATER ) {
// 		var trace;
// 		
// 		cm.BoxTrace( &trace, end, start, NULL, NULL, 0, CONTENTS.WATER );
// 		CG_BubbleTrail( start, trace.endPos, 32 );
// 	} else if ( destContentType & CONTENTS.WATER ) {
// 		var trace;
// 		
// 		cm.BoxTrace( &trace, start, end, NULL, NULL, 0, CONTENTS.WATER );
// 		CG_BubbleTrail( tr.endPos, trace.endPos, 32 );
// 	}
	
	if (tr.surfaceFlags & SURF.NOIMPACT) {
		return;
	}
	
	if (cg.entities[tr.entityNum].currentState.eType == ET.PLAYER) {
		MissileHitPlayer(WP.SHOTGUN, tr.endPos, tr.plane.normal, tr.entityNum);
	} else {
		if (tr.surfaceFlags & SURF.NOIMPACT) {
			// SURF_NOIMPACT will not make a flame puff or a mark
			return;
		}
		
		if (tr.surfaceFlags & SURF.METALSTEPS) {
			MissileHitWall(WP.SHOTGUN, 0, tr.endPos, tr.plane.normal, IMPACTSOUND.METAL);
		} else {
			MissileHitWall(WP.SHOTGUN, 0, tr.endPos, tr.plane.normal, IMPACTSOUND.DEFAULT);
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
	var end     = [0, 0, 0];
	var forward = [0, 0, 0],
		right   = [0, 0, 0],
		up      = [0, 0, 0];
	
	// derive the right and up vectors from the forward vector, because
	// the client won't have any other information
	vec3.normalize(origin2, forward);
	QMath.PerpendicularVector(forward, right);
	vec3.cross(forward, right, up);
	
	// generate the "random" spread pattern
	for ( i = 0 ; i < DEFAULT_SHOTGUN_COUNT ; i++ ) {
		r = QMath.crandom() * DEFAULT_SHOTGUN_SPREAD * 16;
		u = QMath.crandom() * DEFAULT_SHOTGUN_SPREAD * 16;
		vec3.add(origin, vec3.scale(forward, 8192 * 16, [0, 0, 0]), end);
		vec3.add(end, vec3.scale(right, r, [0, 0, 0]));
		vec3.add(end, vec3.scale(up, u, [0, 0, 0]));
		
		ShotgunPellet(origin, end, otherEntNum);
	}
}

/**
 * ShotgunFire
 */
function ShotgunFire(es) {	
	var v = vec3.subtract(es.origin2, es.pos.trBase, [0, 0, 0]);
	vec3.normalize(v);
	vec3.scale(v, 32);
	vec3.add(v, es.pos.trBase);
	
// 	var contents = CG_PointContents( es.pos.trBase, 0 );
// 	if ( !( contents & CONTENTS.WATER ) ) {
		var up = [0, 0, 8];
		SmokePuff(v, up, 
			32, 
			1, 1, 1, 0.33, 
			900, 
			cg.time, 
			0, 
			LEF.PUFF_DONT_SCALE,
			cgs.media.shotgunSmokePuffShader);
// 	}
	
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
	var beam = new re.RefEntity();
	var forward = [0, 0, 0];
	var muzzlePoint = [0, 0, 0];
	var endPoint = [0, 0, 0];

	if (cent.currentState.weapon !== WP.LIGHTNING) {
		return;
	}
	
	// CPMA  "true" lightning.
	if ((cent.currentState.number === cg.predictedPlayerState.clientNum) && cg_trueLightning() !== 0) {
		var angle = [0, 0, 0];
		
		for (var i = 0; i < 3; i++) {
			var a = cent.lerpAngles[i] - cg.refdefViewAngles[i];
			if (a > 180) {
				a -= 360;
			}
			if (a < -180) {
				a += 360;
			}
			
			angle[i] = cg.refdefViewAngles[i] + a * (1.0 - cg_trueLightning());
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
	if ( anim == ANIM.LEGS_WALKCR || anim == ANIM.LEGS_IDLECR ) {
		muzzlePoint[2] += CROUCH_VIEWHEIGHT;
	} else {
		muzzlePoint[2] += DEFAULT_VIEWHEIGHT;
	}
	
	vec3.add(muzzlePoint, vec3.scale(forward, 14, [0, 0, 0]), muzzlePoint);
	
	// Project forward by the lightning range.
	vec3.add(muzzlePoint, vec3.scale(forward, LIGHTNING_RANGE, [0, 0, 0]), endPoint);
	
	// See if it hit a wall.
	var trace = Trace(muzzlePoint, endPoint, QMath.vec3_origin, QMath.vec3_origin, cent.currentState.number, MASK.SHOT);
	
	// This is the endpoint.
	vec3.set(trace.endPos, beam.oldOrigin);
	
	// Use the provided origin, even though it may be slightly
	// different than the muzzle origin.
	vec3.set(origin, beam.origin);
	
	beam.reType = RT.LIGHTNING;
	beam.customShader = cgs.media.lightningShader;
	re.AddRefEntityToScene(beam);
	
	// Add the impact flare if it hit something.
	if (trace.fraction < 1.0) {
		var angles = [0, 0, 0];
		var dir = [0, 0, 0];
		
		vec3.subtract(beam.oldOrigin, beam.origin, dir);
		vec3.normalize(dir);
		
		beam = new re.RefEntity();
		beam.hModel = cgs.media.lightningExplosionModel;
		
		vec3.add(trace.endPos, vec3.scale(dir, -16, [0, 0, 0]), beam.origin);
		
		// Make a random orientation.
		angles[0] = Math.floor(Math.random() * 360);
		angles[1] = Math.floor(Math.random() * 360);
		angles[2] = Math.floor(Math.random() * 360);
		QMath.AnglesToAxis(angles, beam.axis);
		re.AddRefEntityToScene(beam);
	}
}

function RocketTrail(cent, weaponInfo) {
	// if (cg_noProjectileTrail.integer) {
	// 	return;
	// }

	var up = [0, 0, 0];
	var origin = [0, 0, 0];
	var lastPos = [0, 0, 0];
	var step = 50;
	var es = cent.currentState;
	var startTime = cent.trailTime;

	cent.trailTime = cg.time;

	bg.EvaluateTrajectory(es.pos, cg.time, origin);
	//var contents = CG_PointContents( origin, -1 );

	// If object (e.g. grenade) is stationary, don't toss up smoke.
	if (es.pos.trType === TR.STATIONARY) {
		return;
	}

	bg.EvaluateTrajectory(es.pos, cent.trailTime, lastPos);
	//var lastContents = CG_PointContents( lastPos, -1 );

	// if ( contents & ( CONTENTS.WATER | CONTENTS.SLIME | CONTENTS.LAVA ) ) {
	// 	if ( contents & lastContents & CONTENTS.WATER ) {
	// 		CG_BubbleTrail( lastPos, origin, 8 );
	// 	}
	// 	return;
	// }

	var t = step * Math.floor((startTime + step) / step);
	for (; t <= cent.trailTime; t += step) {
		bg.EvaluateTrajectory(es.pos, t, lastPos);

		var smoke = SmokePuff(lastPos, up, 
		          weaponInfo.trailRadius, 
		          1, 1, 1, 0.33,
		          weaponInfo.trailTime, 
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
function GrenadeTrail (ent, wi) {
	RocketTrail(ent, wi);
}

/**
 * PlasmaTrail
 */
function PlasmaTrail(cent, wi ) {
	var le = AllocLocalEntity();
	var refent = le.refent;
	var es = cent.currentState;
	var velocity = [0, 0, 0];
	var xvelocity = [0, 0, 0];
	var origin = [0, 0, 0];
	var offset = [0, 0, 0];
	var xoffset = [0, 0, 0];
	var v = [
	          [0, 0, 0],
	          [0, 0, 0],
	          [0, 0, 0]
	        ];
	
	var waterScale = 1.0;
	
// 	if ( cg_noProjectileTrail.integer || cg_oldPlasma.integer ) {
// 		return;
// 	}
	
	bg.EvaluateTrajectory(es.pos, cg.time, origin);
	
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
	
	vec3.add(origin, xoffset, re.origin);
	vec3.set(refent.origin, le.pos.trBase);
	
// // 	if ( CG_PointContents( re->origin, -1 ) & CONTENTS.WATER ) {
// // 		waterScale = 0.10;
// // 	}
	
	xvelocity[0] = velocity[0] * v[0][0] + velocity[1] * v[1][0] + velocity[2] * v[2][0];
	xvelocity[1] = velocity[0] * v[0][1] + velocity[1] * v[1][1] + velocity[2] * v[2][1];
	xvelocity[2] = velocity[0] * v[0][2] + velocity[1] * v[1][2] + velocity[2] * v[2][2];
	vec3.scale(xvelocity, waterScale, le.pos.trDelta);
	
// 	AxisCopy( axisDefault, re.axis );
	refent.axis = [
	                [1, 0, 0],
	                [0, 1, 0],
	                [0, 0, 1]
	              ];
	
	refent.shaderTime = cg.time / 1000;
	refent.reType = RT.SPRITE;
	refent.radius = 0.25;
	refent.customShader = cgs.media.railRingsShader;
	le.bounceFactor = 0.3;
	
// 	re.shaderRGBA[0] = wi.flashDlightColor[0] * 63;
// 	re.shaderRGBA[1] = wi.flashDlightColor[1] * 63;
// 	re.shaderRGBA[2] = wi.flashDlightColor[2] * 63;
	refent.shaderRGBA[3] = 63;
	
// 	le.color[0] = wi.flashDlightColor[0] * 0.2;
// 	le.color[1] = wi.flashDlightColor[1] * 0.2;
// 	le.color[2] = wi.flashDlightColor[2] * 0.2;
	le.color[3] = 0.25;
	
	le.angles.trType = TR.LINEAR;
	le.angles.trTime = cg.time;
	le.angles.trBase[0] = Math.floor(Math.random() % 32);
	le.angles.trBase[1] = Math.floor(Math.random() % 32);
	le.angles.trBase[2] = Math.floor(Math.random() % 32);
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

	start[2] -= 4;

	le.leType = LE.FADE_RGB;
	le.startTime = cg.time;
	le.endTime = cg.time + cg_railTrailTime();
	le.lifeRate = 1.0 / (le.endTime - le.startTime);

	refent.shaderTime = cg.time / 1000;
	refent.reType = RT.RAIL_CORE;
	refent.customShader = cgs.media.railCoreShader;

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
