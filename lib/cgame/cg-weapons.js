/**
 * WeaponSelectable
 */
function WeaponSelectable(i) {
	// if (!cg.snap.ps.ammo[i]) {
	// 	return false;
	// }

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

	//cg.weaponSelectTime = cg.time;
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
	var weaponNum = gitem.giTag;
	if (weaponNum === 0) {
		return;
	}

	var weaponInfo = cg.weaponInfo[weaponNum];
	if (weaponInfo) {
		return;
	}

	weaponInfo = cg.weaponInfo[weaponNum] = new WeaponInfo();

	weaponInfo.weaponModel = imp.re_RegisterModel(gitem.models[0]);

	// // calc midpoint for rotation
	// trap_R_ModelBounds( weaponInfo.weaponModel, mins, maxs );
	// for ( i = 0 ; i < 3 ; i++ ) {
	// 	weaponInfo.weaponMidpoint[i] = mins[i] + 0.5 * ( maxs[i] - mins[i] );
	// }

	weaponInfo.weaponIcon = imp.ui_RegisterImage(gitem.icon);
	weaponInfo.ammoIcon = imp.ui_RegisterImage(gitem.icon);

	// for ( ammo = bg_itemlist + 1 ; ammo.classname ; ammo++ ) {
	// 	if ( ammo.giType == IT_AMMO && ammo.giTag == weaponNum ) {
	// 		break;
	// 	}
	// }
	// if ( ammo.classname && ammo.world_model[0] ) {
	// 	weaponInfo.ammoModel = trap_R_RegisterModel( ammo.world_model[0] );
	// }

	// strcpy( path, item.world_model[0] );
	// COM_StripExtension(path, path, sizeof(path));
	// strcat( path, "_flash.md3" );
	// weaponInfo.flashModel = trap_R_RegisterModel( path );

	var path = gitem.models[0].replace('.md3', '_barrel.md3');
	weaponInfo.barrelModel = imp.re_RegisterModel(path);

	// strcpy( path, item.world_model[0] );
	// COM_StripExtension(path, path, sizeof(path));
	// strcat( path, "_hand.md3" );
	// weaponInfo.handsModel = trap_R_RegisterModel( path );

	// if ( !weaponInfo.handsModel ) {
	// 	weaponInfo.handsModel = trap_R_RegisterModel( "models/weapons2/shotgun/shotgun_hand.md3" );
	// }

	switch (weaponNum) {
		case WP.GAUNTLET:
	//		MAKERGB( weaponInfo.flashDlightColor, 0.6f, 0.6f, 1.0f );
	//		weaponInfo.firingSound = trap_S_RegisterSound( "sound/weapons/melee/fstrun", qfalse );
			weaponInfo.flashSound[0] = imp.snd_RegisterSound('sound/weapons/melee/fstatck');
			break;

		case WP.MACHINEGUN:
			// MAKERGB( weaponInfo.flashDlightColor, 1, 1, 0 );
			weaponInfo.flashSound[0] = imp.snd_RegisterSound('sound/weapons/machinegun/machgf1b');
			weaponInfo.flashSound[1] = imp.snd_RegisterSound('sound/weapons/machinegun/machgf2b');
			weaponInfo.flashSound[2] = imp.snd_RegisterSound('sound/weapons/machinegun/machgf3b');
			weaponInfo.flashSound[3] = imp.snd_RegisterSound('sound/weapons/machinegun/machgf4b');
			// weaponInfo.ejectBrassFunc = CG_MachineGunEjectBrass;
			cgs.media['bulletExplosionShader'] = imp.re_RegisterShader('bulletExplosion');
			break;

		case WP.LIGHTNING:
	//		MAKERGB( weaponInfo.flashDlightColor, 0.6f, 0.6f, 1.0f );
			weaponInfo.readySound = imp.snd_RegisterSound('sound/weapons/melee/fsthum');
			weaponInfo.firingSound = imp.snd_RegisterSound('sound/weapons/lightning/lg_hum');
			weaponInfo.flashSound[0] = imp.snd_RegisterSound('sound/weapons/lightning/lg_fire');
	//		cgs.media.lightningShader = trap_R_RegisterShader( "lightningBoltNew");
	//		cgs.media.lightningExplosionModel = trap_R_RegisterModel( "models/weaphits/crackle.md3" );
	//		cgs.media.sfx_lghit1 = trap_S_RegisterSound( "sound/weapons/lightning/lg_hit", qfalse );
	//		cgs.media.sfx_lghit2 = trap_S_RegisterSound( "sound/weapons/lightning/lg_hit2", qfalse );
	//		cgs.media.sfx_lghit3 = trap_S_RegisterSound( "sound/weapons/lightning/lg_hit3", qfalse );
			break;

	//	case WP.GRAPPLING_HOOK:
	//		MAKERGB( weaponInfo.flashDlightColor, 0.6f, 0.6f, 1.0f );
	//		weaponInfo.missileModel = trap_R_RegisterModel( "models/ammo/rocket/rocket.md3" );
	//		weaponInfo.missileTrailFunc = CG_GrappleTrail;
	//		weaponInfo.missileDlight = 200;
	//		MAKERGB( weaponInfo.missileDlightColor, 1, 0.75f, 0 );
	//		weaponInfo.readySound = trap_S_RegisterSound( "sound/weapons/melee/fsthum", qfalse );
	//		weaponInfo.firingSound = trap_S_RegisterSound( "sound/weapons/melee/fstrun", qfalse );
	//		cgs.media.lightningShader = trap_R_RegisterShader( "lightningBoltNew");
	//		break;

		case WP.SHOTGUN:
	// 		MAKERGB( weaponInfo.flashDlightColor, 1, 1, 0 );
			weaponInfo.flashSound[0] = imp.snd_RegisterSound('sound/weapons/shotgun/sshotf1b');
	// 		weaponInfo.ejectBrassFunc = CG_ShotgunEjectBrass;
			break;

		case WP.ROCKET_LAUNCHER:
	// 		weaponInfo.missileModel = trap_R_RegisterModel( "models/ammo/rocket/rocket.md3" );
	// 		weaponInfo.missileSound = trap_S_RegisterSound( "sound/weapons/rocket/rockfly", qfalse );
	// 		weaponInfo.missileTrailFunc = CG_RocketTrail;
	// 		weaponInfo.missileDlight = 200;
	// 		weaponInfo.wiTrailTime = 2000;
	// 		weaponInfo.trailRadius = 64;
	// 		MAKERGB( weaponInfo.missileDlightColor, 1, 0.75f, 0 );
	// 		MAKERGB( weaponInfo.flashDlightColor, 1, 0.75f, 0 );
			weaponInfo.flashSound[0] = imp.snd_RegisterSound('sound/weapons/rocket/rocklf1a');
	// 		cgs.media.rocketExplosionShader = trap_R_RegisterShader( "rocketExplosion" );
			break;

		case WP.GRENADE_LAUNCHER:
	// 		weaponInfo.missileModel = trap_R_RegisterModel( "models/ammo/grenade1.md3" );
	// 		weaponInfo.missileTrailFunc = CG_GrenadeTrail;
	// 		weaponInfo.wiTrailTime = 700;
	// 		weaponInfo.trailRadius = 32;
	// 		MAKERGB( weaponInfo.flashDlightColor, 1, 0.70f, 0 );
			weaponInfo.flashSound[0] = imp.snd_RegisterSound('sound/weapons/grenade/grenlf1a');
	// 		cgs.media.grenadeExplosionShader = trap_R_RegisterShader( "grenadeExplosion" );
			break;

		case WP.PLASMAGUN:
	//		weaponInfo.missileModel = cgs.media.invulnerabilityPowerupModel;
	// 		weaponInfo.missileTrailFunc = CG_PlasmaTrail;
	// 		weaponInfo.missileSound = trap_S_RegisterSound( "sound/weapons/plasma/lasfly", qfalse );
	// 		MAKERGB( weaponInfo.flashDlightColor, 0.6f, 0.6f, 1.0f );
			weaponInfo.flashSound[0] = imp.snd_RegisterSound('sound/weapons/plasma/hyprbf1a');
	// 		cgs.media.plasmaExplosionShader = trap_R_RegisterShader( "plasmaExplosion" );
	// 		cgs.media.railRingsShader = trap_R_RegisterShader( "railDisc" );
			break;

		case WP.RAILGUN:
			weaponInfo.readySound = imp.snd_RegisterSound('sound/weapons/railgun/rg_hum');
	// 		MAKERGB( weaponInfo.flashDlightColor, 1, 0.5f, 0 );
			weaponInfo.flashSound[0] = imp.snd_RegisterSound('sound/weapons/railgun/railgf1a');
	// 		cgs.media.railExplosionShader = trap_R_RegisterShader( "railExplosion" );
	// 		cgs.media.railRingsShader = trap_R_RegisterShader( "railDisc" );
	// 		cgs.media.railCoreShader = trap_R_RegisterShader( "railCore" );
	// 		break;

		case WP.BFG:
			weaponInfo.readySound = imp.snd_RegisterSound('sound/weapons/bfg/bfg_hum');
	// 		MAKERGB( weaponInfo.flashDlightColor, 1, 0.7f, 1 );
			weaponInfo.flashSound[0] = imp.snd_RegisterSound('sound/weapons/bfg/bfg_fire');
	// 		cgs.media.bfgExplosionShader = trap_R_RegisterShader( "bfgExplosion" );
	// 		weaponInfo.missileModel = trap_R_RegisterModel( "models/weaphits/bfg.md3" );
	// 		weaponInfo.missileSound = trap_S_RegisterSound( "sound/weapons/rocket/rockfly", qfalse );
			break;

		 default:
			// MAKERGB( weaponInfo.flashDlightColor, 1, 1, 1 );
			// weaponInfo.flashSound[0] = trap_S_RegisterSound( "sound/weapons/rocket/rocklf1a", qfalse );
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

	// if ( !ps ) {
	// 	// add weapon ready sound
	// 	cent.pe.lightningFiring = qfalse;
	// 	if ( ( cent.currentState.eFlags & EF_FIRING ) && weapon.firingSound ) {
	// 		// lightning gun and guantlet make a different sound when fire is held down
	// 		trap_S_AddLoopingSound( cent.currentState.number, cent.lerpOrigin, vec3_origin, weapon.firingSound );
	// 		cent.pe.lightningFiring = qtrue;
	// 	} else if ( weapon.readySound ) {
	// 		trap_S_AddLoopingSound( cent.currentState.number, cent.lerpOrigin, vec3_origin, weapon.readySound );
	// 	}
	// }
	var lerped = new sh.Orientation();
	imp.re_LerpTag(lerped, parent.hModel, parent.oldFrame, parent.frame, 1.0 - parent.backlerp, 'tag_weapon');
	vec3.set(parent.origin, gun.origin);
	vec3.add(gun.origin, vec3.scale(parent.axis[0], lerped.origin[0], [0, 0, 0]));

	// // Make weapon appear left-handed for 2 and centered for 3
	// if(ps && cg_drawGun.integer == 2)
	// 	VectorMA(gun.origin, -lerped.origin[1], parent.axis[1], gun.origin);
	// else if(!ps || cg_drawGun.integer != 3)
		vec3.add(gun.origin, vec3.scale(parent.axis[1], lerped.origin[1], [0, 0, 0]));

	vec3.add(gun.origin, vec3.scale(parent.axis[2], lerped.origin[2], [0, 0, 0]));
	qm.AxisMultiply(lerped.axis, parent.axis, gun.axis);
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
		angles[qm.YAW] = 0;
		angles[qm.PITCH] = 0;
		angles[qm.ROLL] = MachinegunSpinAngle(cent);
		qm.AnglesToAxis(angles, barrel.axis);

		PositionRotatedEntityOnTag(barrel, gun, weapon.weaponModel, 'tag_barrel');
		AddWeaponWithPowerups(barrel, cent.currentState.powerups);
	}

	// // make sure we aren't looking at cg.predictedPlayerEntity for LG
	// nonPredictedCent = &cg_entities[cent.currentState.clientNum];

	// // add the flash
	// if ( ( weaponNum == WP_LIGHTNING || weaponNum == WP_GAUNTLET || weaponNum == WP_GRAPPLING_HOOK )
	// 	&& ( nonPredictedCent.currentState.eFlags & EF_FIRING ) ) 
	// {
	// 	// continuous flash
	// } else {
	// 	// impulse flash
	// 	if ( cg.time - cent.muzzleFlashTime > MUZZLE_FLASH_TIME ) {
	// 		return;
	// 	}
	// }

	// memset( &flash, 0, sizeof( flash ) );
	// VectorCopy( parent.lightingOrigin, flash.lightingOrigin );
	// flash.shadowPlane = parent.shadowPlane;
	// flash.renderfx = parent.renderfx;

	// flash.hModel = weapon.flashModel;
	// if (!flash.hModel) {
	// 	return;
	// }
	// angles[qm.YAW] = 0;
	// angles[qm.PITCH] = 0;
	// angles[qm.ROLL] = crandom() * 10;
	// qm.AnglesToAxis( angles, flash.axis );

	// // colorize the railgun blast
	// if ( weaponNum == WP_RAILGUN ) {
	// 	clientInfo_t	*ci;

	// 	ci = &cgs.clientinfo[ cent.currentState.clientNum ];
	// 	flash.shaderRGBA[0] = 255 * ci.color1[0];
	// 	flash.shaderRGBA[1] = 255 * ci.color1[1];
	// 	flash.shaderRGBA[2] = 255 * ci.color1[2];
	// }

	// CG_PositionRotatedEntityOnTag( &flash, &gun, weapon.weaponModel, "tag_flash");
	// trap_R_AddRefEntityToScene( &flash );

	// if ( ps || cg.renderingThirdPerson ||
	// 	cent.currentState.number != cg.predictedPlayerState.clientNum ) {
	// 	// add lightning bolt
	// 	CG_LightningBolt( nonPredictedCent, flash.origin );

	// 	if ( weapon.flashDlightColor[0] || weapon.flashDlightColor[1] || weapon.flashDlightColor[2] ) {
	// 		trap_R_AddLightToScene( flash.origin, 300 + (rand()&31), weapon.flashDlightColor[0],
	// 			weapon.flashDlightColor[1], weapon.flashDlightColor[2] );
	// 	}
	// }
}

/**
 * AddViewWeapon
 * 
 * Add the weapon, and flash for the player's view
 */
// function AddViewWeapon(ps) {
// 	refEntity_t	hand;
// 	centity_t	*cent;
// 	clientInfo_t	*ci;
// 	float		fovOffset;
// 	vec3_t		angles;
// 	weaponInfo_t	*weapon;

// 	if ( ps.persistant[PERS_TEAM] == TEAM_SPECTATOR ) {
// 		return;
// 	}

// 	if ( ps.pm_type == PM_INTERMISSION ) {
// 		return;
// 	}

// 	// no gun if in third person view or a camera is active
// 	//if ( cg.renderingThirdPerson || cg.cameraMode) {
// 	if ( cg.renderingThirdPerson ) {
// 		return;
// 	}


// 	// allow the gun to be completely removed
// 	if ( !cg_drawGun.integer ) {
// 		vec3_t		origin;

// 		if ( cg.predictedPlayerState.eFlags & EF_FIRING ) {
// 			// special hack for lightning gun...
// 			VectorCopy( cg.refdef.vieworg, origin );
// 			VectorMA( origin, -8, cg.refdef.viewaxis[2], origin );
// 			CG_LightningBolt( &cg_entities[ps.clientNum], origin );
// 		}
// 		return;
// 	}

// 	// don't draw if testing a gun model
// 	if ( cg.testGun ) {
// 		return;
// 	}

// 	// drop gun lower at higher fov
// 	if ( cg_fov.integer > 90 ) {
// 		fovOffset = -0.2 * ( cg_fov.integer - 90 );
// 	} else {
// 		fovOffset = 0;
// 	}

// 	cent = &cg.predictedPlayerEntity;	// &cg_entities[cg.snap.ps.clientNum];
// 	CG_RegisterWeapon( ps.weapon );
// 	weapon = &cg_weapons[ ps.weapon ];

// 	memset (&hand, 0, sizeof(hand));

// 	// set up gun position
// 	CG_CalculateWeaponPosition( hand.origin, angles );

// 	VectorMA( hand.origin, cg_gun_x.value, cg.refdef.viewaxis[0], hand.origin );
// 	VectorMA( hand.origin, cg_gun_y.value, cg.refdef.viewaxis[1], hand.origin );
// 	VectorMA( hand.origin, (cg_gun_z.value+fovOffset), cg.refdef.viewaxis[2], hand.origin );

// 	qm.AnglesToAxis( angles, hand.axis );

// 	// map torso animations to weapon animations
// 	if ( cg_gun_frame.integer ) {
// 		// development tool
// 		hand.frame = hand.oldframe = cg_gun_frame.integer;
// 		hand.backlerp = 0;
// 	} else {
// 		// get clientinfo for animation map
// 		ci = &cgs.clientinfo[ cent.currentState.clientNum ];
// 		hand.frame = CG_MapTorsoToWeaponFrame( ci, cent.pe.torso.frame );
// 		hand.oldframe = CG_MapTorsoToWeaponFrame( ci, cent.pe.torso.oldFrame );
// 		hand.backlerp = cent.pe.torso.backlerp;
// 	}

// 	hand.hModel = weapon.handsModel;
// 	hand.renderfx = RF_DEPTHHACK | RF_FIRST_PERSON | RF_MINLIGHT;

// 	// add everything onto the hand
// 	CG_AddPlayerWeapon( &hand, ps, &cg.predictedPlayerEntity, ps.persistant[PERS_TEAM] );
// }

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
		cent.pe.barrelAngle = qm.AngleMod(angle);
		cent.pe.barrelSpinning = !!(cent.currentState.eFlags & EF.FIRING);
	}

	return angle;
}

function AddWeaponWithPowerups(gun, powerups) {
	// add powerup effects
	// if (powerups & ( 1 << PW_INVIS ) ) {
	// 	gun.customShader = cgs.media.invisShader;
	// 	trap_R_AddRefEntityToScene( gun );
	// } else {
		imp.re_AddRefEntityToScene(gun);

	// 	if ( powerups & ( 1 << PW_BATTLESUIT ) ) {
	// 		gun.customShader = cgs.media.battleWeaponShader;
	// 		trap_R_AddRefEntityToScene( gun );
	// 	}
	// 	if ( powerups & ( 1 << PW_QUAD ) ) {
	// 		gun.customShader = cgs.media.quadWeaponShader;
	// 		trap_R_AddRefEntityToScene( gun );
	// 	}
	// }
}

/**
 * AddBullet
 *
 * Renders bullet effects.
 */
function AddBullet(end, sourceEntityNum, normal, flesh, fleshEntityNum) {
	// // If the shooter is currently valid, calc a source point and possibly
	// // do trail effects.
	// if ( sourceEntityNum >= 0 && cg_tracerChance.value > 0 ) {
	// 	if ( CG_CalcMuzzlePoint( sourceEntityNum, start ) ) {
	// 		sourceContentType = CG_PointContents( start, 0 );
	// 		destContentType = CG_PointContents( end, 0 );

	// 		// do a complete bubble trail if necessary
	// 		if ( ( sourceContentType == destContentType ) && ( sourceContentType & CONTENTS_WATER ) ) {
	// 			CG_BubbleTrail( start, end, 32 );
	// 		}
	// 		// bubble trail from water into air
	// 		else if ( ( sourceContentType & CONTENTS_WATER ) ) {
	// 			trap_CM_BoxTrace( &trace, end, start, NULL, NULL, 0, CONTENTS_WATER );
	// 			CG_BubbleTrail( start, trace.endpos, 32 );
	// 		}
	// 		// bubble trail from air into water
	// 		else if ( ( destContentType & CONTENTS_WATER ) ) {
	// 			trap_CM_BoxTrace( &trace, start, end, NULL, NULL, 0, CONTENTS_WATER );
	// 			CG_BubbleTrail( trace.endpos, end, 32 );
	// 		}

	// 		// draw a tracer
	// 		if ( random() < cg_tracerChance.value ) {
	// 			CG_Tracer( start, end );
	// 		}
	// 	}
	// }

	// Impact splash and mark.
	// if (flesh) {
	// 	CG_Bleed( end, fleshEntityNum );
	// } else {
		MissileHitWall(WP.MACHINEGUN, 0, end, normal, IMPACTSOUND.DEFAULT);
	// }
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
	// cent.muzzleFlashTime = cg.time;

	// Lightning gun only does this this on initial press
	// if (es.weapon === WP.LIGHTNING) {
	// 	if (cent.pe.lightningFiring) {
	// 		return;
	// 	}
	// }

	// if (es.weapon === WP.RAILGUN ) {
	// 	cent.pe.railFireTime = cg.time;
	// }

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
			imp.snd_StartSound(null, es.number, weaponInfo.flashSound[c]);
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

	switch (weapon) {
		// default:
		// case WP_LIGHTNING:
		// 	// no explosion at LG impact, it is added with the beam
		// 	r = rand() & 3;
		// 	if ( r < 2 ) {
		// 		sfx = cgs.media.sfx_lghit2;
		// 	} else if ( r == 2 ) {
		// 		sfx = cgs.media.sfx_lghit1;
		// 	} else {
		// 		sfx = cgs.media.sfx_lghit3;
		// 	}
		// 	mark = cgs.media.holeMarkShader;
		// 	radius = 12;
		// 	break;
		// case WP_GRENADE_LAUNCHER:
		// 	mod = cgs.media.dishFlashModel;
		// 	shader = cgs.media.grenadeExplosionShader;
		// 	sfx = cgs.media.sfx_rockexp;
		// 	mark = cgs.media.burnMarkShader;
		// 	radius = 64;
		// 	light = 300;
		// 	isSprite = qtrue;
		// 	break;
		// case WP_ROCKET_LAUNCHER:
		// 	mod = cgs.media.dishFlashModel;
		// 	shader = cgs.media.rocketExplosionShader;
		// 	sfx = cgs.media.sfx_rockexp;
		// 	mark = cgs.media.burnMarkShader;
		// 	radius = 64;
		// 	light = 300;
		// 	isSprite = qtrue;
		// 	duration = 1000;
		// 	lightColor[0] = 1;
		// 	lightColor[1] = 0.75;
		// 	lightColor[2] = 0.0;
		// 	if (cg_oldRocket.integer == 0) {
		// 		// explosion sprite animation
		// 		VectorMA( origin, 24, dir, sprOrg );
		// 		VectorScale( dir, 64, sprVel );

		// 		CG_ParticleExplosion( "explode1", sprOrg, sprVel, 1400, 20, 30 );
		// 	}
		// 	break;
		// case WP_RAILGUN:
		// 	mod = cgs.media.ringFlashModel;
		// 	shader = cgs.media.railExplosionShader;
		// 	//sfx = cgs.media.sfx_railg;
		// 	sfx = cgs.media.sfx_plasmaexp;
		// 	mark = cgs.media.energyMarkShader;
		// 	radius = 24;
		// 	break;
		// case WP_PLASMAGUN:
		// 	mod = cgs.media.ringFlashModel;
		// 	shader = cgs.media.plasmaExplosionShader;
		// 	sfx = cgs.media.sfx_plasmaexp;
		// 	mark = cgs.media.energyMarkShader;
		// 	radius = 16;
		// 	break;
		// case WP_BFG:
		// 	mod = cgs.media.dishFlashModel;
		// 	shader = cgs.media.bfgExplosionShader;
		// 	sfx = cgs.media.sfx_rockexp;
		// 	mark = cgs.media.burnMarkShader;
		// 	radius = 32;
		// 	isSprite = qtrue;
		// 	break;
		// case WP_SHOTGUN:
		// 	mod = cgs.media.bulletFlashModel;
		// 	shader = cgs.media.bulletExplosionShader;
		// 	mark = cgs.media.bulletMarkShader;
		// 	sfx = 0;
		// 	radius = 4;
		// 	break;
		case WP.MACHINEGUN:
			mod = cgs.media['bulletFlashModel'];
			shader = cgs.media['bulletExplosionShader']
			// mark = cgs.media.bulletMarkShader;
			// r = parseInt(Math.random()*100, 10) % 4;
			// if (r === 0) {
			// 	sfx = cgs.media.sfx_ric1;
			// } else if ( r == 1 ) {
			// 	sfx = cgs.media.sfx_ric2;
			// } else {
			// 	sfx = cgs.media.sfx_ric3;
			// }
			// radius = 8;
			break;
	}

	// if (sfx) {
	// 	trap_S_StartSound( origin, ENTITYNUM_WORLD, CHAN_AUTO, sfx );
	// }

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
	// Create the mpact mark.
	//
	// alphaFade = (mark == cgs.media.energyMarkShader);	// plasma fades alpha, all others fade color
	// if ( weapon == WP_RAILGUN ) {
	// 	float	*color;

	// 	// colorize with client color
	// 	color = cgs.clientinfo[clientNum].color1;
	// 	CG_ImpactMark( mark, origin, dir, random()*360, color[0],color[1], color[2],1, alphaFade, radius, qfalse );
	// } else {
	// 	CG_ImpactMark( mark, origin, dir, random()*360, 1,1,1,1, alphaFade, radius, qfalse );
	// }
}