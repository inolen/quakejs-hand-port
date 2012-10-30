/**
 * TextTokenizer
 */
var TextTokenizer = function (src) {
	// Strip out comments
	src = src.replace(/\/\/.*$/mg, ''); // C++ style (//...)
	src = src.replace(/\/\*[^*\/]*\*\//mg, ''); // C style (/*...*/) (Do the shaders even use these?)
	this.tokens = src.match(/[^\s\n\r\"]+/mg);

	this.offset = 0;
};

TextTokenizer.prototype.EOF = function() {
	if (this.tokens === null) { return true; }
	var token = this.tokens[this.offset];
	while (token === '' && this.offset < this.tokens.length) {
		this.offset++;
		token = this.tokens[this.offset];
	}
	return this.offset >= this.tokens.length;
};

TextTokenizer.prototype.next = function() {
	if (this.tokens === null) { return ; }
	var token = '';
	while (token === '' && this.offset < this.tokens.length) {
		token = this.tokens[this.offset++];
	}
	return token;
};

TextTokenizer.prototype.prev = function() {
	if (this.tokens === null) { return ; }
	var token = '';
	while (token === '' && this.offset >= 0) {
		token = this.tokens[this.offset--];
	}
	return token;
};

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
		RegisterClientModelname(ci, DEFAULT_MODEL, 'default', null, function (err) {
			if (err) {
				console.log(err.message);
				throw new Error('DEFAULT_MODEL (' + DEFAULT_MODEL + ') failed to register');
			}
		});
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
function RegisterClientModelname(ci, modelName, skinName, teamName, callback) {
	var filename = 'models/players/' + modelName + '/lower.md3';
	ci.legsModel = re.RegisterModel(filename);

	filename = 'models/players/' + modelName + '/upper.md3';
	ci.torsoModel = re.RegisterModel(filename);

	filename = 'models/players/' + modelName + '/head.md3';
	ci.headModel = re.RegisterModel(filename);

	RegisterClientSkin(ci, modelName, skinName, teamName);

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
	// }

	// if ( !ci->modelIcon ) {
	// 	return qfalse;
	// }

	// load the animations
	filename = 'models/players/' + modelName + '/animation.cfg';
	ParseAnimationFile(filename, ci, function (err) {
		if (err) return callback(err);
		return callback(null);
	});
}

function RegisterClientSkin(ci, modelName, skinName, teamName) {
	teamName = teamName || 'default';

	var filename = 'models/players/' + modelName + '/lower_' + teamName + '.skin';
	ci.legsSkin = re.RegisterSkin(filename);

	filename = 'models/players/' + modelName + '/upper_' + teamName + '.skin';
	ci.torsoSkin = re.RegisterSkin(filename);

	filename = 'models/players/' + modelName + '/head_' + teamName + '.skin';
	ci.headSkin = re.RegisterSkin(filename);

}

/**
 * ParseAnimationFile
 *
 * Read a configuration file containing animation coutns and rates
 * models/players/visor/animation.cfg, etc
 */
function ParseAnimationFile(filename, ci, callback) {
	var animations = ci.animations;

	sys.ReadFile(filename, 'utf8', function (err, data) {
		if (err) return callback(err);

		// ci->footsteps = FOOTSTEP_NORMAL;
		// VectorClear( ci->headOffset );
		// ci->gender = GENDER_MALE;
		ci.fixedlegs = false;
		ci.fixedtorso = false;

		// read optional parameters
		var tokens = new TextTokenizer(data);
		var token;

		while (!tokens.EOF()) {
			token = tokens.next();
			if (!token) {
				break;
			}

			if (token === 'footsteps') {
				token = tokens.next();
				if (!token) {
					break;
				}

				// if (token === 'default' || token === 'normal') {
				// 	ci.footsteps = Animations.FOOTSTEP_NORMAL;
				// } else if (token === 'boot') {
				// 	ci.footsteps = Animations.FOOTSTEP_BOOT;
				// } else if (token === 'flesh') {
				// 	ci.footsteps = Animations.FOOTSTEP_FLESH;
				// } else if (token === 'mech') {
				// 	ci.footsteps = Animations.FOOTSTEP_MECH;
				// } else if (token === 'energy') {
				// 	ci.footsteps = Animations.FOOTSTEP_ENERGY;
				// } else {
				// 	console.log('Bad footsteps parm in ' + filename + ': ' + token);
				// }

				continue;
			} else if (token === 'headoffset') {
				for (var i = 0; i < 3; i++) {
					token = tokens.next();
					if (!token) {
						break;
					}

					//ci.headOffset[i] = parseFloat(token);
				}
				continue;
			} else if (token === 'sex') {
				token = tokens.next();
				if (!token) {
					break;
				}

				// if (token[0] === 'f' || token[0] == 'F') {
				// 	ci.gender = GENDER_FEMALE;
				// } else if (token[0] === 'n' || token[0] === 'N') {
				// 	ci.gender = GENDER_NEUTER;
				// } else {
				// 	ci.gender = GENDER_MALE;
				// }
				continue;
			} else if (token === 'fixedlegs') {
				ci.fixedlegs = true;
				continue;
			} else if (token === 'fixedtorso') {
				ci.fixedtorso = true;
				continue;
			}

			// If it is a number, start parsing animations.
			if (token.charAt(0) >= '0' && token.charAt(0) <= '9') {
				tokens.prev();  // unget the token
				break;
			}

			console.log('Unknown token \'' + token + '\' in ' + filename);
		}

		// read information for each frame
		for (var i = 0; i < Animations.MAX; i++) {
			token = tokens.next();

			if (!token) {
				if (i >= Animations.TORSO_GETFLAG && i <= Animations.TORSO_NEGATIVE) {
					animations[i].firstFrame = animations[Animations.TORSO_GESTURE].firstFrame;
					animations[i].frameLerp = animations[Animations.TORSO_GESTURE].frameLerp;
					animations[i].initialLerp = animations[Animations.TORSO_GESTURE].initialLerp;
					animations[i].loopFrames = animations[Animations.TORSO_GESTURE].loopFrames;
					animations[i].numFrames = animations[Animations.TORSO_GESTURE].numFrames;
					animations[i].reversed = false;
					animations[i].flipflop = false;
					continue;
				}
				break;
			}

			animations[i].firstFrame = parseInt(token, 10);
			// leg only frames are adjusted to not count the upper body only frames
			if (i === Animations.LEGS_WALKCR) {
				skip = animations[Animations.LEGS_WALKCR].firstFrame - animations[Animations.TORSO_GESTURE].firstFrame;
			}
			if (i >= Animations.LEGS_WALKCR && i < Animations.TORSO_GETFLAG) {
				animations[i].firstFrame -= skip;
			}

			token = tokens.next();
			if (!token) {
				break;
			}
			animations[i].numFrames = parseInt(token, 10);
			animations[i].reversed = false;
			animations[i].flipflop = false;

			// if NumFrames is negative the animation is reversed
			if (animations[i].numFrames < 0) {
				animations[i].numFrames = -animations[i].numFrames;
				animations[i].reversed = true;
			}

			token = tokens.next();
			if (!token) {
				break;
			}
			animations[i].loopFrames = parseInt(token, 10);

			token = tokens.next();
			if (!token) {
				break;
			}
			fps = parseInt(token, 10);
			if (!fps) {
				fps = 1;
			}
			animations[i].frameLerp = 1000 / fps;
			animations[i].initialLerp = 1000 / fps;
		}

		if (i !== Animations.MAX) {
			return callback(new Error('Error parsing animation file: ' + filename));
		}

		// Crouch backward animation.
		animations[Animations.LEGS_BACKCR] = _.clone(animations[Animations.LEGS_WALKCR]);
		animations[Animations.LEGS_BACKCR].reversed = true;

		// Walk backward animation.
		animations[Animations.LEGS_BACKWALK] = _.clone(animations[Animations.LEGS_WALK]);
		animations[Animations.LEGS_BACKWALK].reversed = true;

		// Flag moving fast.
		animations[Animations.FLAG_RUN].firstFrame = 0;
		animations[Animations.FLAG_RUN].numFrames = 16;
		animations[Animations.FLAG_RUN].loopFrames = 16;
		animations[Animations.FLAG_RUN].frameLerp = 1000 / 15;
		animations[Animations.FLAG_RUN].initialLerp = 1000 / 15;
		animations[Animations.FLAG_RUN].reversed = false;

		// Flag not moving or moving slowly.
		animations[Animations.FLAG_STAND].firstFrame = 16;
		animations[Animations.FLAG_STAND].numFrames = 5;
		animations[Animations.FLAG_STAND].loopFrames = 0;
		animations[Animations.FLAG_STAND].frameLerp = 1000 / 20;
		animations[Animations.FLAG_STAND].initialLerp = 1000 / 20;
		animations[Animations.FLAG_STAND].reversed = false;

		// Flag speeding up.
		animations[Animations.FLAG_STAND2RUN].firstFrame = 16;
		animations[Animations.FLAG_STAND2RUN].numFrames = 5;
		animations[Animations.FLAG_STAND2RUN].loopFrames = 1;
		animations[Animations.FLAG_STAND2RUN].frameLerp = 1000 / 15;
		animations[Animations.FLAG_STAND2RUN].initialLerp = 1000 / 15;
		animations[Animations.FLAG_STAND2RUN].reversed = true;
	});
}

/**********************************************************
 *
 * Player rendering
 *
 **********************************************************/

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

	var renderfx = 0;
	if (cent.currentState.number === cg.snap.ps.clientNum) {
		if (!cg_thirdPerson()) {
			renderfx = RenderFx.THIRD_PERSON;  // only draw in mirrors
		}
	}

	var legs = new RefEntity();
	var torso = new RefEntity();
	var head = new RefEntity();

	// Get the player model information
	/*var renderfx = 0;
	if ( cent->currentState.number == cg.snap->ps.clientNum) {
		renderfx = RF_THIRD_PERSON;			// only draw in mirrors
	}*/

	// // get the rotation information
	PlayerAngles(cent, legs.axis, torso.axis, head.axis);
	
	// // get the animation state (after rotation, to allow feet shuffle)
	PlayerAnimation(cent, legs, torso);

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
	legs.reType = RefEntityType.MODEL;
	legs.renderfx = renderfx;
	legs.hModel = ci.legsModel;
	legs.customSkin = ci.legsSkin;
	vec3.set(cent.lerpOrigin, legs.origin);
	vec3.set(cent.lerpOrigin, legs.lightingOrigin);
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
	torso.reType = RefEntityType.MODEL;
	torso.renderfx = renderfx;
	torso.hModel = ci.torsoModel;
	if (!torso.hModel) {
		return;
	}
	torso.customSkin = ci.torsoSkin;
	PositionRotatedEntityOnTag(torso, legs, ci.legsModel, 'tag_torso');
	vec3.set(cent.lerpOrigin, torso.lightingOrigin);
	// torso.shadowPlane = shadowPlane;
	// torso.renderfx = renderfx;
	AddRefEntityWithPowerups(torso, cent.currentState/*, ci.team*/);

	//
	// add the head
	//
	head.reType = RefEntityType.MODEL;
	head.renderfx = renderfx;
	head.hModel = ci.headModel;
	if (!head.hModel) {
		return;
	}
	head.customSkin = ci.headSkin;
	PositionRotatedEntityOnTag(head, torso, ci.torsoModel, 'tag_head');
	vec3.set(cent.lerpOrigin, head.lightingOrigin);
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
		re.AddRefEntityToScene(refent);

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

/**********************************************************
 *
 * Player angles
 *
 **********************************************************/

/**
 * PlayerAngles
 * 
 * Handles seperate torso motion. 
 * Legs pivot based on direction of movement.
 * Head always looks exactly at cent->lerpAngles.
 * 
 * If motion < 20 degrees, show in head only.
 * If < 45 degrees, also show in torso.
 */
var swingSpeed = 0.3;
var movementOffsets = [0, 22, 45, -22, 0, 22, -45, -22];
function PlayerAngles(cent, legs, torso, head) {
	var ci;

	var clientNum = cent.currentState.clientNum;
	if (clientNum >= 0 && clientNum < MAX_CLIENTS) {
		ci = cgs.clientinfo[clientNum];
	}

	var headAngles = vec3.create(cent.lerpAngles);
	var before = headAngles[YAW];
	headAngles[YAW] = AngleMod(headAngles[YAW]);

	var torsoAngles = [0, 0, 0];
	var legsAngles = [0, 0, 0];

	// --------- yaw -------------

	// Allow yaw to drift a bit
	if ((cent.currentState.legsAnim & ~ANIM_TOGGLEBIT ) !== Animations.LEGS_IDLE ||
		((cent.currentState.torsoAnim & ~ANIM_TOGGLEBIT) !== Animations.TORSO_STAND &&
		(cent.currentState.torsoAnim & ~ANIM_TOGGLEBIT) !== Animations.TORSO_STAND2)) {
		// If not standing still, always point all in the same direction.
		cent.pe.torso.yawing = true;    // always center
		cent.pe.torso.pitching = true;  // always center
		cent.pe.legs.yawing = true;     // always center
	}

	// Adjust legs for movement dir.
	var dir;
	if (cent.currentState.eFlags & EntityFlags.DEAD) {
		// Don't let dead bodies twitch.
		dir = 0;
	} else {
		dir = cent.currentState.angles2[YAW];
		if (dir < 0 || dir > 7) {
			throw new Error('Bad player movement angle');
		}
	}
	legsAngles[YAW] = headAngles[YAW] + movementOffsets[dir];
	torsoAngles[YAW] = headAngles[YAW] + 0.25 * movementOffsets[dir];

	// torso
	var res = { angle: cent.pe.torso.yawAngle, swinging: cent.pe.torso.yawing };
	SwingAngles(torsoAngles[YAW], 25, 90, swingSpeed, res);
	torsoAngles[YAW] = cent.pe.torso.yawAngle = res.angle;
	cent.pe.torso.yawing = res.swinging;

	// legs
	res = { angle: cent.pe.legs.yawAngle, swinging: cent.pe.legs.yawing };
	SwingAngles(legsAngles[YAW], 40, 90, swingSpeed, res);
	legsAngles[YAW] = cent.pe.legs.yawAngle = res.angle;
	cent.pe.legs.yawing = res.swinging;


	// --------- pitch -------------

	// Only show a fraction of the pitch angle in the torso.
	var dest;
	if (headAngles[PITCH] > 180) {
		dest = (-360 + headAngles[PITCH]) * 0.75;
	} else {
		dest = headAngles[PITCH] * 0.75;
	}
	res = { angle: cent.pe.torso.pitchAngle, swinging: cent.pe.torso.pitching };
	SwingAngles(dest, 15, 30, 0.1, res);
	torsoAngles[PITCH] = cent.pe.torso.pitchAngle = res.angle;
	cent.pe.torso.pitching = res.swinging;

	//
	if (ci && ci.fixedtorso) {
		torsoAngles[PITCH] = 0;
	}

	// --------- roll -------------

	// Lean towards the direction of travel.
	var velocity = vec3.create(cent.currentState.pos.trDelta);
	var speed = vec3.length(velocity);
	vec3.normalize(velocity);

	if (speed) {
		speed *= 0.05;

		var axis = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

		AnglesToAxis(legsAngles, axis);

		var side = speed * vec3.dot(velocity, axis[1]);
		legsAngles[ROLL] -= side;

		side = speed * vec3.dot(velocity, axis[0]);
		legsAngles[PITCH] += side;
	}

	//
	if (ci && ci.fixedlegs) {
		legsAngles[YAW] = torsoAngles[YAW];
		legsAngles[PITCH] = 0.0;
		legsAngles[ROLL] = 0.0;
	}

	// // pain twitch
	// AddPainTwitch( cent, torsoAngles );

	// pull the angles back out of the hierarchial chain
	AnglesSubtract(headAngles, torsoAngles, headAngles);
	AnglesSubtract(torsoAngles, legsAngles, torsoAngles);
	AnglesToAxis(legsAngles, legs);
	AnglesToAxis(torsoAngles, torso);
	AnglesToAxis(headAngles, head);
}

/**
 * SwingAngles
 */
function SwingAngles(destination, swingTolerance, clampTolerance, speed, res) {
	if (!res.swinging) {
		// See if a swing should be started
		swing = AngleSubtract(res.angle, destination);
		if (swing > swingTolerance || swing < -swingTolerance) {
			res.swinging = true;
		}
	}

	if (!res.swinging) {
		return;
	}
	
	// Modify the speed depending on the delta
	// so it doesn't seem so linear
	swing = AngleSubtract(destination, res.angle);
	scale = Math.abs(swing);
	if (scale < swingTolerance * 0.5) {
		scale = 0.5;
	} else if (scale < swingTolerance) {
		scale = 1.0;
	} else {
		scale = 2.0;
	}

	// Swing towards the destination angle
	if (swing >= 0) {
		move = cg.frameTime * scale * speed;
		if (move >= swing) {
			move = swing;
			res.swinging = false;
		}
		res.angle = AngleMod(res.angle + move);
	} else if ( swing < 0 ) {
		move = cg.frameTime * scale * -speed;
		if (move <= swing) {
			move = swing;
			res.swinging = false;
		}
		res.angle = AngleMod(res.angle + move);
	}

	// clamp to no more than tolerance
	swing = AngleSubtract(destination, res.angle);
	if (swing > clampTolerance) {
		res.angle = AngleMod(destination - (clampTolerance - 1));
	} else if ( swing < -clampTolerance ) {
		res.angle = AngleMod(destination + (clampTolerance - 1));
	}
}

/**
 * AddPainTwitch
 */
function AddPainTwitch(cent, torsoAngles) {
	var t = cg.time - cent.pe.painTime;
	if (t >= PAIN_TWITCH_TIME) {
		return;
	}

	f = 1.0 - (t / PAIN_TWITCH_TIME);

	if (cent.pe.painDirection) {
		torsoAngles[ROLL] += 20 * f;
	} else {
		torsoAngles[ROLL] -= 20 * f;
	}
}

/**********************************************************
 *
 * Player animation
 *
 *********************************************************/

/**
 * PlayerAnimation
 */
function PlayerAnimation(cent, legs, torso) {
	var clientNum = cent.currentState.clientNum;
	var ci = cgs.clientinfo[clientNum];
	var speedScale = 1;

	// if ( cent->currentState.powerups & ( 1 << PW_HASTE ) ) {
	// 	speedScale = 1.5;
	// }

	// Do the shuffle turn frames locally.
	// if (cent->pe.legs.yawing && (cent.currentState.legsAnim & ~ANIM_TOGGLEBIT) === LEGS_IDLE) {
	// 	RunLerpFrame( ci, &cent->pe.legs, LEGS_TURN, speedScale );
	// } else {
		RunLerpFrame(ci, cent.pe.legs, cent.currentState.legsAnim, speedScale);
	// }

	legs.oldFrame = cent.pe.legs.oldFrame;
	legs.frame = cent.pe.legs.frame;
	legs.backlerp = cent.pe.legs.backlerp;

	RunLerpFrame(ci, cent.pe.torso, cent.currentState.torsoAnim, speedScale);

	torso.oldFrame = cent.pe.torso.oldFrame;
	torso.frame = cent.pe.torso.frame;
	torso.backlerp = cent.pe.torso.backlerp;
}


/**
 * RunLerpFrame
 *
 * Sets cg.snap, cg.oldFrame, and cg.backlerp
 * cg.time should be between oldFrameTime and frameTime after exit
 */
function RunLerpFrame(ci, lf, newAnimation, speedScale) {
	// See if the animation sequence is switching.
	if (newAnimation !== lf.animationNumber || !lf.animation) {
		SetLerpFrameAnimation(ci, lf, newAnimation);
	}

	// If we have passed the current frame, move it to
	// oldFrame and calculate a new frame.
	if (cg.time >= lf.frameTime) {
		lf.oldFrame = lf.frame;
		lf.oldFrameTime = lf.frameTime;

		// Get the next frame based on the animation.
		var anim = lf.animation;
		if (!anim.frameLerp) {
			return;  // shouldn't happen
		}
		if (cg.time < lf.animationTime) {
			lf.frameTime = lf.animationTime;  // initial lerp
		} else {
			lf.frameTime = lf.oldFrameTime + anim.frameLerp;
		}
		var f = parseInt(((lf.frameTime - lf.animationTime) / anim.frameLerp) * speedScale, 10);

		numFrames = anim.numFrames;
		if (anim.flipflop) {
			numFrames *= 2;
		}
		if (f >= numFrames) {
			f -= numFrames;
			if (anim.loopFrames) {
				f %= anim.loopFrames;
				f += anim.numFrames - anim.loopFrames;
			} else {
				f = numFrames - 1;
				// The animation is stuck at the end, so it
				// can immediately transition to another sequence
				lf.frameTime = cg.time;
			}
		}
		if (anim.reversed) {
			lf.frame = anim.firstFrame + anim.numFrames - 1 - f;
		} else if (anim.flipflop && f >= anim.numFrames) {
			lf.frame = anim.firstFrame + anim.numFrames - 1 - (f % anim.numFrames);
		} else {
			lf.frame = anim.firstFrame + f;
		}
		if (cg.time > lf.frameTime) {
			lf.frameTime = cg.time;
		}
	}

	if (lf.frameTime > cg.time + 200) {
		lf.frameTime = cg.time;
	}

	if (lf.oldFrameTime > cg.time) {
		lf.oldFrameTime = cg.time;
	}

	// Calculate current lerp value.
	if (lf.frameTime === lf.oldFrameTime) {
		lf.backlerp = 0;
	} else {
		lf.backlerp = 1.0 - (cg.time - lf.oldFrameTime) / (lf.frameTime - lf.oldFrameTime);
	}
}

/**
 * SetLerpFrameAnimation
 *
 * May include ANIM_TOGGLEBIT.
 */
function SetLerpFrameAnimation(ci, lf, newAnimation) {
	lf.animationNumber = newAnimation;
	newAnimation &= ~ANIM_TOGGLEBIT;

	if (newAnimation < 0 || newAnimation >= Animations.MAX_TOTALANIMATIONS) {
		throw new Error('Bad animation number: ' + newAnimation);
	}

	var anim = ci.animations[newAnimation];

	lf.animation = anim;
	lf.animationTime = lf.frameTime + anim.initialLerp;
}

/**
 * ClearLerpFrame
 */
function ClearLerpFrame(ci, lf, animationNumber) {
	lf.frameTime = lf.oldFrameTime = cg.time;
	SetLerpFrameAnimation(ci, lf, animationNumber);
	lf.oldFrame = lf.frame = lf.animation.firstFrame;
}