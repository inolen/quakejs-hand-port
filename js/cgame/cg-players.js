/**
 * NewClientInfo
 */
function NewClientInfo(clientNum) {
	var ci = cgs.clientInfo[clientNum] = new ClientInfo();
	var cs = ConfigString('player' + clientNum);

	console.log('Loading client info for', clientNum, ci, cs);

	if (!cs) {
		return; // player just left
	}

	// Isolate the player's name
	//ci.name = cs['n'];

	/*// force the model
	char modelStr[

	trap_Cvar_VariableStringBuffer( "model", modelStr, sizeof( modelStr ) );
	if ( ( skin = strchr( modelStr, '/' ) ) == NULL) {
		skin = "default";
	} else {
		*skin++ = 0;
	}

	ci.skinName = skin;
	ci.modelName = modelStr;*/

	// scan for an existing clientinfo that matches this modelname
	// so we can avoid loading checks if possible
	/*if (!ScanForExistingClientInfo(ci)) {
		LoadClientInfo(clientNum, ci);
	}

	// replace whatever was there with the new one
	ci.infoValid = true;*/
}



// /*
// ======================
// CG_ScanForExistingClientInfo
// ======================
// */
// static qboolean CG_ScanForExistingClientInfo( clientInfo_t *ci ) {
// 	int		i;
// 	clientInfo_t	*match;

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


// /**
//  * LoadClientInfo
//  * 
//  * Load it now, taking the disk hits.
//  * This will usually be deferred to a safe time
//  */
// function LoadClientInfo(clientNum, ci) {
// 	const char	*dir, *fallback;
// 	int			i, modelloaded;
// 	const char	*s;
// 	char		teamname[MAX_QPATH];

// 	teamname[0] = 0;
// 	modelloaded = qtrue;
// 	if ( !CG_RegisterClientModelname( ci, ci->modelName, ci->skinName, ci->headModelName, ci->headSkinName, teamname ) ) {
// 		if ( cg_buildScript.integer ) {
// 			CG_Error( "CG_RegisterClientModelname( %s, %s, %s, %s %s ) failed", ci->modelName, ci->skinName, ci->headModelName, ci->headSkinName, teamname );
// 		}

// 		// fall back to default team name
// 		if( cgs.gametype >= GT_TEAM) {
// 			// keep skin name
// 			if( ci->team == TEAM_BLUE ) {
// 				Q_strncpyz(teamname, DEFAULT_BLUETEAM_NAME, sizeof(teamname) );
// 			} else {
// 				Q_strncpyz(teamname, DEFAULT_REDTEAM_NAME, sizeof(teamname) );
// 			}
// 			if ( !CG_RegisterClientModelname( ci, DEFAULT_TEAM_MODEL, ci->skinName, DEFAULT_TEAM_HEAD, ci->skinName, teamname ) ) {
// 				CG_Error( "DEFAULT_TEAM_MODEL / skin (%s/%s) failed to register", DEFAULT_TEAM_MODEL, ci->skinName );
// 			}
// 		} else {
// 			if ( !CG_RegisterClientModelname( ci, DEFAULT_MODEL, "default", DEFAULT_MODEL, "default", teamname ) ) {
// 				CG_Error( "DEFAULT_MODEL (%s) failed to register", DEFAULT_MODEL );
// 			}
// 		}
// 		modelloaded = qfalse;
// 	}

// 	ci->newAnims = qfalse;
// 	if ( ci->torsoModel ) {
// 		orientation_t tag;
// 		// if the torso model has the "tag_flag"
// 		if ( trap_R_LerpTag( &tag, ci->torsoModel, 0, 0, 1, "tag_flag" ) ) {
// 			ci->newAnims = qtrue;
// 		}
// 	}

// 	ci->deferred = qfalse;

// 	// reset any existing players and bodies, because they might be in bad
// 	// frames for this new model
// 	for ( i = 0 ; i < MAX_GENTITIES ; i++ ) {
// 		if ( cg_entities[i].currentState.clientNum == clientNum
// 			&& cg_entities[i].currentState.eType == ET_PLAYER ) {
// 			CG_ResetPlayerEntity( &cg_entities[i] );
// 		}
// 	}
// }