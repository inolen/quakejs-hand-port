/**
 * AddPlayer
 */
function AddPlayer(cent) {
	// The client number is stored in clientNum. It can't be derived
	// from the entity number, because a single client may have
	// multiple corpses on the level using the same clientinfo
	var clientNum = cent.currentState.clientNum;
	if (clientNum < 0 || clientNum >= MAX_CLIENTS) {
		throw new Error('Bad clientNum on player entity');
	}

	var ci = cgs.clientinfo[clientNum];
	// It is possible to see corpses from disconnected players that may
	// not have valid clientinfo
	if (!ci.infoValid) {
		return;
	}

	// Get the player model information
	/*var renderfx = 0;
	if ( cent->currentState.number == cg.snap->ps.clientNum) {
		renderfx = RF_THIRD_PERSON;			// only draw in mirrors
	}*/

	// // get the rotation information
	vec3.set(cg.autoAngles, cent.lerpAngles);
	// CG_PlayerAngles( cent, legs.axis, torso.axis, head.axis );
	
	// // get the animation state (after rotation, to allow feet shuffle)
	// CG_PlayerAnimation( cent, &legs.oldframe, &legs.frame, &legs.backlerp,
	// 	 &torso.oldframe, &torso.frame, &torso.backlerp );

	// // add the talk baloon or disconnect icon
	// CG_PlayerSprites( cent );

	// // add the shadow
	// shadow = CG_PlayerShadow( cent, &shadowPlane );

	// // add a water splash if partially in and out of water
	// CG_PlayerSplash( cent );

	// if ( cg_shadows.integer == 3 && shadow ) {
	// 	renderfx |= RF_SHADOW_PLANE;
	// }
	// renderfx |= RF_LIGHTING_ORIGIN;			// use the same origin for all

	//
	// Add the legs
	//
	var legs = new RefEntity();
	legs.reType = RefEntityType.MODEL;
	legs.hModel = ci.legsModel;
	legs.customSkin = ci.legsSkin;
	vec3.set(cent.lerpOrigin, legs.origin);
	vec3.set(cent.lerpOrigin, legs.lightingOrigin);
	AnglesToAxis(cent.lerpAngles, legs.axis);
	// legs.shadowPlane = shadowPlane;
	// legs.renderfx = renderfx;
	vec3.set(legs.origin, legs.oldOrigin);  // don't positionally lerp at all
	AddRefEntityWithPowerups(legs, cent.currentState/*, ci.team*/);

	// if the model failed, allow the default nullmodel to be displayed
	if (!legs.hModel) {
		return;
	}

	//
	// add the torso
	//
	var torso = new RefEntity();
	torso.reType = RefEntityType.MODEL;
	torso.hModel = ci.torsoModel;
	if (!torso.hModel) {
		return;
	}
	torso.customSkin = ci.torsoSkin;
	PositionRotatedEntityOnTag(torso, legs, ci.legsModel, 'tag_torso');
	vec3.set(cent.lerpOrigin, torso.lightingOrigin);
	AnglesToAxis(cent.lerpAngles, torso.axis);
	// torso.shadowPlane = shadowPlane;
	// torso.renderfx = renderfx;
	AddRefEntityWithPowerups(torso, cent.currentState/*, ci.team*/);

	//
	// add the head
	//
	var head = new RefEntity();
	head.reType = RefEntityType.MODEL;
	head.hModel = ci.headModel;
	if (!head.hModel) {
		return;
	}
	head.customSkin = ci.headSkin;
	PositionRotatedEntityOnTag(head, torso, ci.torsoModel, 'tag_head');
	vec3.set(cent.lerpOrigin, head.lightingOrigin);
	AnglesToAxis(cent.lerpAngles, head.axis);
	// head.shadowPlane = shadowPlane;
	// head.renderfx = renderfx;
	AddRefEntityWithPowerups(head, cent.currentState/*, ci.team*/);

	//
	// add the gun / barrel / flash
	//
	//CG_AddPlayerWeapon( &torso, NULL, cent, ci->team );

	// add powerups floating behind the player
	//CG_PlayerPowerups( cent, &torso );
}

/**
 * AddRefEntityWithPowerups
 *
 * Adds a piece with modifications or duplications for powerups
 * Also called by CG_Missile for quad rockets, but nobody can tell...
 */
function AddRefEntityWithPowerups(refent, s/*, team*/) {
	// if ( state->powerups & ( 1 << PW_INVIS ) ) {
	// 	ent->customShader = cgs.media.invisShader;
	// 	trap_R_AddRefEntityToScene( ent );
	// } else {
		r.AddRefEntityToScene(refent);

	// 	if ( state->powerups & ( 1 << PW_QUAD ) )
	// 	{
	// 		if (team == TEAM_RED)
	// 			ent->customShader = cgs.media.redQuadShader;
	// 		else
	// 			ent->customShader = cgs.media.quadShader;
	// 		trap_R_AddRefEntityToScene( ent );
	// 	}
	// 	if ( state->powerups & ( 1 << PW_REGEN ) ) {
	// 		if ( ( ( cg.time / 100 ) % 10 ) == 1 ) {
	// 			ent->customShader = cgs.media.regenShader;
	// 			trap_R_AddRefEntityToScene( ent );
	// 		}
	// 	}
	// 	if ( state->powerups & ( 1 << PW_BATTLESUIT ) ) {
	// 		ent->customShader = cgs.media.battleSuitShader;
	// 		trap_R_AddRefEntityToScene( ent );
	// 	}
	// }
}

/**
 * NewClientInfo
 */
function NewClientInfo(clientNum) {
	var ci = cgs.clientinfo[clientNum] = new ClientInfo();
	var cs = ConfigString('player' + clientNum);

	if (!cs) {
		return;  // player just left
	}

	// Isolate the player's name.
	ci.name = cs['name'];

	// // force the model
	// char modelStr[

	// trap_Cvar_VariableStringBuffer( "model", modelStr, sizeof( modelStr ) );
	// if ( ( skin = strchr( modelStr, '/' ) ) == NULL) {
	// 	skin = "default";
	// } else {
	// 	*skin++ = 0;
	// }

	// ci.skinName = skin;
	// ci.modelName = modelStr;

	// // scan for an existing clientinfo that matches this modelname
	// // so we can avoid loading checks if possible
	// if (!ScanForExistingClientInfo(ci)) {
		LoadClientInfo(clientNum, ci);
	// }

	// Replace whatever was there with the new one.
	ci.infoValid = true;
}



// /*
// ======================
// CG_ScanForExistingClientInfo
// ======================
// */
// static qboolean CG_ScanForExistingClientInfo( clientinfo_t *ci ) {
// 	int		i;
// 	clientinfo_t	*match;

// 	for ( i = 0 ; i < cgs.maxclients ; i++ ) {
// 		match = &cgs.clientinfo[ i ];
// 		if ( !match->infoValid ) {
// 			continue;
// 		}
// 		if ( match->deferred ) {
// 			continue;
// 		}
// 		if ( !Q_stricmp( ci->modelName, match->modelName )
// 			&& !Q_stricmp( ci->skinName, match->skinName )
// 			&& !Q_stricmp( ci->headModelName, match->headModelName )
// 			&& !Q_stricmp( ci->headSkinName, match->headSkinName ) 
// 			&& !Q_stricmp( ci->blueTeam, match->blueTeam ) 
// 			&& !Q_stricmp( ci->redTeam, match->redTeam )
// 			&& (cgs.gametype < GT_TEAM || ci->team == match->team) ) {
// 			// this clientinfo is identical, so use its handles

// 			ci->deferred = qfalse;

// 			CG_CopyClientInfoModel( match, ci );

// 			return qtrue;
// 		}
// 	}

// 	// nothing matches, so defer the load
// 	return qfalse;
// }


/**
 * LoadClientInfo
 * 
 * Load it now, taking the disk hits.
 * This will usually be deferred to a safe time
 */
function LoadClientInfo(clientNum, ci) {
	//if (!RegisterClientModelname(ci, ci->modelName, ci->skinName, ci->headModelName, ci->headSkinName, teamname)) {
		if ( !RegisterClientModelname(ci, DEFAULT_MODEL, 'default', DEFAULT_MODEL, 'default'/*, teamname*/) ) {
			throw new Error('DEFAULT_MODEL (' + DEFAULT_MODEL + ') failed to register');
		}
	//}

	// ci->newAnims = qfalse;
	// if ( ci->torsoModel ) {
	// 	orientation_t tag;
	// 	// if the torso model has the "tag_flag"
	// 	if ( trap_R_LerpTag( &tag, ci->torsoModel, 0, 0, 1, "tag_flag" ) ) {
	// 		ci->newAnims = qtrue;
	// 	}
	// }

	// ci->deferred = qfalse;

	// // reset any existing players and bodies, because they might be in bad
	// // frames for this new model
	// for ( i = 0 ; i < MAX_GENTITIES ; i++ ) {
	// 	if ( cg_entities[i].currentState.clientNum == clientNum
	// 		&& cg_entities[i].currentState.eType == ET_PLAYER ) {
	// 		CG_ResetPlayerEntity( &cg_entities[i] );
	// 	}
	// }
}

/**
 * RegisterClientModelname
 */
function RegisterClientModelname(ci, modelName, skinName, headModelName, headSkinName/*, teamName*/) {
	var filename = 'models/players/' + modelName + '/lower.md3';
	ci.legsModel = r.RegisterModel(filename);
	if (!ci.legsModel) {
		console.log('Failed to load model file ' + filename);
		return false;
	}

	filename = 'models/players/' + modelName + '/upper.md3';
	ci.torsoModel = r.RegisterModel(filename);
	if (!ci.torsoModel) {
		console.log('Failed to load model file ' + filename);
		return false;
	}

	filename = 'models/players/' + headModelName + '/head.md3';
	ci.headModel = r.RegisterModel(filename);
	if (!ci.headModel) {
		console.log('Failed to load model file ' + filename);
		return false;
	}

	// if any skins failed to load, return failure
	// if ( !CG_RegisterClientSkin( ci, teamName, modelName, skinName, headName, headSkinName ) ) {
	// 	if ( teamName && *teamName) {
	// 		Com_Printf( "Failed to load skin file: %s : %s : %s, %s : %s\n", teamName, modelName, skinName, headName, headSkinName );
	// 		if( ci->team == TEAM_BLUE ) {
	// 			Com_sprintf(newTeamName, sizeof(newTeamName), "%s/", DEFAULT_BLUETEAM_NAME);
	// 		}
	// 		else {
	// 			Com_sprintf(newTeamName, sizeof(newTeamName), "%s/", DEFAULT_REDTEAM_NAME);
	// 		}
	// 		if ( !CG_RegisterClientSkin( ci, newTeamName, modelName, skinName, headName, headSkinName ) ) {
	// 			Com_Printf( "Failed to load skin file: %s : %s : %s, %s : %s\n", newTeamName, modelName, skinName, headName, headSkinName );
	// 			return qfalse;
	// 		}
	// 	} else {
	// 		Com_Printf( "Failed to load skin file: %s : %s, %s : %s\n", modelName, skinName, headName, headSkinName );
	// 		return qfalse;
	// 	}
	// }

	// // load the animations
	// Com_sprintf( filename, sizeof( filename ), "models/players/%s/animation.cfg", modelName );
	// if ( !CG_ParseAnimationFile( filename, ci ) ) {
	// 	Com_sprintf( filename, sizeof( filename ), "models/players/characters/%s/animation.cfg", modelName );
	// 	if ( !CG_ParseAnimationFile( filename, ci ) ) {
	// 		Com_Printf( "Failed to load animation file %s\n", filename );
	// 		return qfalse;
	// 	}
	// }

	// if ( CG_FindClientHeadFile( filename, sizeof(filename), ci, teamName, headName, headSkinName, "icon", "skin" ) ) {
	// 	ci->modelIcon = trap_R_RegisterShaderNoMip( filename );
	// }
	// else if ( CG_FindClientHeadFile( filename, sizeof(filename), ci, teamName, headName, headSkinName, "icon", "tga" ) ) {
	// 	ci->modelIcon = trap_R_RegisterShaderNoMip( filename );
	// }

	// if ( !ci->modelIcon ) {
	// 	return qfalse;
	// }

	return true;
}