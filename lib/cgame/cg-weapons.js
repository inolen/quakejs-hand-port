/**
 * WeaponSelectable
 */
function WeaponSelectable(i) {
	// if (!cg.snap.ps.ammo[i]) {
	// 	return false;
	// }

	if (!(cg.snap.ps.stats[Stat.WEAPONS] & (1 << i))) {
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
	if (cg.snap.ps.pm_flags & PmoveFlags.FOLLOW) {
		return;
	}

	//cg.weaponSelectTime = cg.time;
	var original = cg.weaponSelect;

	for (var i = 0; i < MAX_WEAPONS; i++) {
		cg.weaponSelect++;
		if (cg.weaponSelect === MAX_WEAPONS) {
			cg.weaponSelect = 0;
		}
		if (cg.weaponSelect === Weapon.GAUNTLET) {
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
	if (cg.snap.ps.pm_flags & PmoveFlags.FOLLOW) {
		return;
	}

	// cg.weaponSelectTime = cg.time;
	var original = cg.weaponSelect;

	for (var i = 0; i < MAX_WEAPONS; i++) {
		cg.weaponSelect--;
		if (cg.weaponSelect === -1) {
			cg.weaponSelect = MAX_WEAPONS - 1;
		}
		if (cg.weaponSelect === Weapon.GAUNTLET) {
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
	if (cg.snap.ps.pm_flags & PmoveFlags.FOLLOW) {
		return;
	}

	var num = parseInt(arg1, 10);
	if (num < 1 || num > MAX_WEAPONS-1) {
		return;
	}

	// cg.weaponSelectTime = cg.time;

	if (!(cg.snap.ps.stats[Stat.WEAPONS] & (1 << num))) {
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
function AddPlayerWeapon(parent, ps, cent/*, team*/) {
	var weaponNum = cent.currentState.weapon;

	//RegisterWeapon(weaponNum);
	var weapon = cg.weaponInfo[weaponNum];

	// TODO remove this once we call RegisterWeapon
	if (!weapon) {
		return;
	}

	// add the weapon
	var gun = new re.RefEntity();
	vec3.set(parent.lightingOrigin, gun.lightingOrigin);
	// gun.shadowPlane = parent->shadowPlane;
	gun.renderfx = parent.renderfx;

	// set custom shading for railgun refire rate
	// if( weaponNum == WP_RAILGUN ) {
	// 	clientInfo_t *ci = &cgs.clientinfo[cent->currentState.clientNum];
	// 	if( cent->pe.railFireTime + 1500 > cg.time ) {
	// 		int scale = 255 * ( cg.time - cent->pe.railFireTime ) / 1500;
	// 		gun.shaderRGBA[0] = ( ci->c1RGBA[0] * scale ) >> 8;
	// 		gun.shaderRGBA[1] = ( ci->c1RGBA[1] * scale ) >> 8;
	// 		gun.shaderRGBA[2] = ( ci->c1RGBA[2] * scale ) >> 8;
	// 		gun.shaderRGBA[3] = 255;
	// 	}
	// 	else {
	// 		Byte4Copy( ci->c1RGBA, gun.shaderRGBA );
	// 	}
	// }

	//gun.hModel = weapon.weaponModel;
	gun.hModel = weapon.modelHandles[0];
	if (!gun.hModel) {
		return;
	}

	// if ( !ps ) {
	// 	// add weapon ready sound
	// 	cent->pe.lightningFiring = qfalse;
	// 	if ( ( cent->currentState.eFlags & EF_FIRING ) && weapon->firingSound ) {
	// 		// lightning gun and guantlet make a different sound when fire is held down
	// 		trap_S_AddLoopingSound( cent->currentState.number, cent->lerpOrigin, vec3_origin, weapon->firingSound );
	// 		cent->pe.lightningFiring = qtrue;
	// 	} else if ( weapon->readySound ) {
	// 		trap_S_AddLoopingSound( cent->currentState.number, cent->lerpOrigin, vec3_origin, weapon->readySound );
	// 	}
	// }
	var lerped = new Orientation();
	re.LerpTag(lerped, parent.hModel, parent.oldFrame, parent.frame, 1.0 - parent.backlerp, 'tag_weapon');
	vec3.set(parent.origin, gun.origin);
	vec3.add(gun.origin, vec3.scale(parent.axis[0], lerped.origin[0], [0, 0, 0]));

	// // Make weapon appear left-handed for 2 and centered for 3
	// if(ps && cg_drawGun.integer == 2)
	// 	VectorMA(gun.origin, -lerped.origin[1], parent->axis[1], gun.origin);
	// else if(!ps || cg_drawGun.integer != 3)
		vec3.add(gun.origin, vec3.scale(parent.axis[1], lerped.origin[1], [0, 0, 0]));

	vec3.add(gun.origin, vec3.scale(parent.axis[2], lerped.origin[2], [0, 0, 0]));
	AxisMultiply(lerped.axis, parent.axis, gun.axis);
	gun.backlerp = parent.backlerp;

	AddWeaponWithPowerups(gun, cent.currentState.powerups);

	// // add the spinning barrel
	// if ( weapon->barrelModel ) {
	// 	memset( &barrel, 0, sizeof( barrel ) );
	// 	VectorCopy( parent->lightingOrigin, barrel.lightingOrigin );
	// 	barrel.shadowPlane = parent->shadowPlane;
	// 	barrel.renderfx = parent->renderfx;

	// 	barrel.hModel = weapon->barrelModel;
	// 	angles[YAW] = 0;
	// 	angles[PITCH] = 0;
	// 	angles[ROLL] = CG_MachinegunSpinAngle( cent );
	// 	AnglesToAxis( angles, barrel.axis );

	// 	CG_PositionRotatedEntityOnTag( &barrel, &gun, weapon->weaponModel, "tag_barrel" );

	// 	CG_AddWeaponWithPowerups( &barrel, cent->currentState.powerups );
	// }

	// // make sure we aren't looking at cg.predictedPlayerEntity for LG
	// nonPredictedCent = &cg_entities[cent->currentState.clientNum];

	// // add the flash
	// if ( ( weaponNum == WP_LIGHTNING || weaponNum == WP_GAUNTLET || weaponNum == WP_GRAPPLING_HOOK )
	// 	&& ( nonPredictedCent->currentState.eFlags & EF_FIRING ) ) 
	// {
	// 	// continuous flash
	// } else {
	// 	// impulse flash
	// 	if ( cg.time - cent->muzzleFlashTime > MUZZLE_FLASH_TIME ) {
	// 		return;
	// 	}
	// }

	// memset( &flash, 0, sizeof( flash ) );
	// VectorCopy( parent->lightingOrigin, flash.lightingOrigin );
	// flash.shadowPlane = parent->shadowPlane;
	// flash.renderfx = parent->renderfx;

	// flash.hModel = weapon->flashModel;
	// if (!flash.hModel) {
	// 	return;
	// }
	// angles[YAW] = 0;
	// angles[PITCH] = 0;
	// angles[ROLL] = crandom() * 10;
	// AnglesToAxis( angles, flash.axis );

	// // colorize the railgun blast
	// if ( weaponNum == WP_RAILGUN ) {
	// 	clientInfo_t	*ci;

	// 	ci = &cgs.clientinfo[ cent->currentState.clientNum ];
	// 	flash.shaderRGBA[0] = 255 * ci->color1[0];
	// 	flash.shaderRGBA[1] = 255 * ci->color1[1];
	// 	flash.shaderRGBA[2] = 255 * ci->color1[2];
	// }

	// CG_PositionRotatedEntityOnTag( &flash, &gun, weapon->weaponModel, "tag_flash");
	// trap_R_AddRefEntityToScene( &flash );

	// if ( ps || cg.renderingThirdPerson ||
	// 	cent->currentState.number != cg.predictedPlayerState.clientNum ) {
	// 	// add lightning bolt
	// 	CG_LightningBolt( nonPredictedCent, flash.origin );

	// 	if ( weapon->flashDlightColor[0] || weapon->flashDlightColor[1] || weapon->flashDlightColor[2] ) {
	// 		trap_R_AddLightToScene( flash.origin, 300 + (rand()&31), weapon->flashDlightColor[0],
	// 			weapon->flashDlightColor[1], weapon->flashDlightColor[2] );
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

// 	if ( ps->persistant[PERS_TEAM] == TEAM_SPECTATOR ) {
// 		return;
// 	}

// 	if ( ps->pm_type == PM_INTERMISSION ) {
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
// 			CG_LightningBolt( &cg_entities[ps->clientNum], origin );
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

// 	cent = &cg.predictedPlayerEntity;	// &cg_entities[cg.snap->ps.clientNum];
// 	CG_RegisterWeapon( ps->weapon );
// 	weapon = &cg_weapons[ ps->weapon ];

// 	memset (&hand, 0, sizeof(hand));

// 	// set up gun position
// 	CG_CalculateWeaponPosition( hand.origin, angles );

// 	VectorMA( hand.origin, cg_gun_x.value, cg.refdef.viewaxis[0], hand.origin );
// 	VectorMA( hand.origin, cg_gun_y.value, cg.refdef.viewaxis[1], hand.origin );
// 	VectorMA( hand.origin, (cg_gun_z.value+fovOffset), cg.refdef.viewaxis[2], hand.origin );

// 	AnglesToAxis( angles, hand.axis );

// 	// map torso animations to weapon animations
// 	if ( cg_gun_frame.integer ) {
// 		// development tool
// 		hand.frame = hand.oldframe = cg_gun_frame.integer;
// 		hand.backlerp = 0;
// 	} else {
// 		// get clientinfo for animation map
// 		ci = &cgs.clientinfo[ cent->currentState.clientNum ];
// 		hand.frame = CG_MapTorsoToWeaponFrame( ci, cent->pe.torso.frame );
// 		hand.oldframe = CG_MapTorsoToWeaponFrame( ci, cent->pe.torso.oldFrame );
// 		hand.backlerp = cent->pe.torso.backlerp;
// 	}

// 	hand.hModel = weapon->handsModel;
// 	hand.renderfx = RF_DEPTHHACK | RF_FIRST_PERSON | RF_MINLIGHT;

// 	// add everything onto the hand
// 	CG_AddPlayerWeapon( &hand, ps, &cg.predictedPlayerEntity, ps->persistant[PERS_TEAM] );
// }

function AddWeaponWithPowerups(gun, powerups) {
	// add powerup effects
	// if (powerups & ( 1 << PW_INVIS ) ) {
	// 	gun->customShader = cgs.media.invisShader;
	// 	trap_R_AddRefEntityToScene( gun );
	// } else {
		re.AddRefEntityToScene(gun);

	// 	if ( powerups & ( 1 << PW_BATTLESUIT ) ) {
	// 		gun->customShader = cgs.media.battleWeaponShader;
	// 		trap_R_AddRefEntityToScene( gun );
	// 	}
	// 	if ( powerups & ( 1 << PW_QUAD ) ) {
	// 		gun->customShader = cgs.media.quadWeaponShader;
	// 		trap_R_AddRefEntityToScene( gun );
	// 	}
	// }
}
