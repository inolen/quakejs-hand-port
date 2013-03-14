/**
 * NewClientInfo
 */
function NewClientInfo(clientNum, callback) {
	var ci = cgs.clientinfo[clientNum];
	var cs = Configstring('player:' + clientNum);

	if (!cs) {
		ci.infoValid = false;
		return;  // player just left
	}

	// Isolate the player's name.
	ci.arena = cs.arena;
	ci.name = cs.name;
	ci.team = cs.team;
	ci.group = cs.group;

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
		LoadClientInfo(clientNum, ci, callback);
	// }

	UpdateCurrentGame();
	UpdateGameGroups();
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
// 		if ( !match.infoValid ) {
// 			continue;
// 		}
// 		if ( match.deferred ) {
// 			continue;
// 		}
// 		if ( !Q_stricmp( ci.modelName, match.modelName )
// 			&& !Q_stricmp( ci.skinName, match.skinName )
// 			&& !Q_stricmp( ci.headModelName, match.headModelName )
// 			&& !Q_stricmp( ci.headSkinName, match.headSkinName )
// 			&& !Q_stricmp( ci.blueTeam, match.blueTeam )
// 			&& !Q_stricmp( ci.redTeam, match.redTeam )
// 			&& (cgs.gametype < GT.TEAM || ci.team == match.team) ) {
// 			// this clientinfo is identical, so use its handles

// 			ci.deferred = false;

// 			CG_CopyClientInfoModel( match, ci );

// 			return true;
// 		}
// 	}

// 	// nothing matches, so defer the load
// 	return false;
// }


/**
 * LoadClientInfo
 *
 * Load it now, taking the disk hits.
 * This will usually be deferred to a safe time
 */
function LoadClientInfo(clientNum, ci, callback) {
	var teamName = 'default';
	if (ci.team === TEAM.RED) {
		teamName = 'red';
	} else if (ci.team === TEAM.BLUE) {
		teamName = 'blue';
	}

	RegisterClientAssets(ci, DEFAULT_MODEL, 'default', teamName, function (err) {
		if (err) {
			error('DEFAULT_MODEL (' + DEFAULT_MODEL + ') failed to register.');
		}

		ci.infoValid = true;

		if (callback) {
			callback();
		}
	});

	// ci.newAnims = false;
	// if (ci.torsoModel) {
	// 	orientation_t tag;
		// if the torso model has the "tag_flag"
	// 	if (RE.LerpTag(tag, ci.torsoModel, 0, 0, 1, "tag_flag")) {
	// 		ci.newAnims = true;
	// 	}
	// }

	// ci.deferred = false;

	// Reset any existing players and bodies, because they might be in bad
	// frames for this new model.
	for (var i = 0; i < MAX_GENTITIES; i++) {
		if (cg.entities[i].currentState.clientNum === clientNum &&
			cg.entities[i].currentState.eType === ET.PLAYER) {
			ResetPlayerEntity(cg.entities[i]);
		}
	}
}

/**
 * RegisterClientAssets
 */
function RegisterClientAssets(ci, modelName, skinName, teamName, callback) {
	var modelsLoaded = false;
	var skinLoaded = false;
	var soundsLoaded = false;
	var animsLoaded = false;

	var checkComplete = function () {
		if (!modelsLoaded || !skinLoaded || !soundsLoaded || !animsLoaded) {
			return;
		}

		callback(null);
	};

	//
	// Load models.
	//
	RegisterClientModel(ci, modelName, function () {
		modelsLoaded = true;
		checkComplete();
	});

	//
	// Load skins.
	//
	RegisterClientSkin(ci, modelName, skinName, teamName, function () {
		skinLoaded = true;
		checkComplete();
	});

	// if ( !ci.modelIcon ) {
	// 	return false;
	// }

	//
	// Load sounds.
	//
	RegisterClientSounds(ci, modelName, function () {
		soundsLoaded = true;
		checkComplete();
	});

	//
	// Load animations.
	//
	RegisterClientAnimations(ci, modelName, function () {
		animsLoaded = true;
		checkComplete();
	});
}

/**
 * RegisterClientModel
 */
function RegisterClientModel(ci, modelName, callback) {
	var models = {
		'legsModel':  'models/players/' + modelName + '/lower.md3',
		'torsoModel': 'models/players/' + modelName + '/upper.md3',
		'headModel':  'models/players/' + modelName + '/head.md3'
	};

	var total = Object.keys(models).length;
	var loaded = 0;

	_.each(models, function (path, key) {
		RE.RegisterModel(path, function (hModel) {
			ci[key] = hModel;

			if (++loaded === total) {
				callback();
			}
		});
	});
}

/**
 * RegisterClientSkin
 */
function RegisterClientSkin(ci, modelName, skinName, teamName, callback) {
	var skins = {
		'legsSkin':  'models/players/' + modelName + '/lower_' + teamName + '.skin',
		'torsoSkin': 'models/players/' + modelName + '/upper_' + teamName + '.skin',
		'headSkin':  'models/players/' + modelName + '/head_' + teamName + '.skin'
	};

	var total = Object.keys(skins).length;
	var loaded = 0;

	_.each(skins, function (path, key) {
		RE.RegisterSkin(path, function (hSkin) {
			ci[key] = hSkin;

			if (++loaded === total) {
				callback();
			}
		});
	});
}

/**
 * RegisterClientSounds
 */
function RegisterClientSounds(ci, modelName, callback) {
	var total = customSoundNames.length;
	var loaded = 0;

	_.each(customSoundNames, function (sound, i) {
		var path = 'sound/player/' + modelName + '/' + sound.substr(1);

		SND.RegisterSound(path, function (hSound) {
			ci.sounds[i] = hSound;

			if (++loaded === total) {
				callback();
			}
		});
	});
}

/**
 * RegisterClientAnimations
 *
 * Read a configuration file containing animation coutns and rates
 * models/players/visor/animation.cfg, etc
 */
function RegisterClientAnimations(ci, modelName, callback) {
	var filename = 'models/players/' + modelName + '/animation.cfg';
	var animations = ci.animations;
	var skip = 0;

	SYS.ReadFile(filename, 'utf8', function (err, data) {
		if (err) return callback(err);

		ci.footsteps = FOOTSTEP.NORMAL;
		// VectorClear( ci.headOffset );
		ci.gender = GENDER.MALE;
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

				if (token === 'default' || token === 'normal') {
					ci.footsteps = ANIM.FOOTSTEP_NORMAL;
				} else if (token === 'boot') {
					ci.footsteps = ANIM.FOOTSTEP_BOOT;
				} else if (token === 'flesh') {
					ci.footsteps = ANIM.FOOTSTEP_FLESH;
				} else if (token === 'mech') {
					ci.footsteps = ANIM.FOOTSTEP_MECH;
				} else if (token === 'energy') {
					ci.footsteps = ANIM.FOOTSTEP_ENERGY;
				} else {
					log('Bad footsteps parm in ' + filename + ': ' + token);
				}

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

				if (token.charAt(0) === 'f' || token.charAt(0) === 'F') {
					ci.gender = GENDER.FEMALE;
				} else if (token.charAt(0) === 'n' || token.charAt(0) === 'N') {
					ci.gender = GENDER.NEUTER;
				} else {
					ci.gender = GENDER.MALE;
				}
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

			log('Unknown token \'' + token + '\' in ' + filename);
		}

		// Read information for each frame.
		for (var i = 0; i < ANIM.MAX; i++) {
			token = tokens.next();

			if (!token) {
				if (i >= ANIM.TORSO_GETFLAG && i <= ANIM.TORSO_NEGATIVE) {
					animations[i].firstFrame = animations[ANIM.TORSO_GESTURE].firstFrame;
					animations[i].frameLerp = animations[ANIM.TORSO_GESTURE].frameLerp;
					animations[i].initialLerp = animations[ANIM.TORSO_GESTURE].initialLerp;
					animations[i].loopFrames = animations[ANIM.TORSO_GESTURE].loopFrames;
					animations[i].numFrames = animations[ANIM.TORSO_GESTURE].numFrames;
					animations[i].reversed = false;
					animations[i].flipflop = false;
					continue;
				}
				break;
			}

			animations[i].firstFrame = parseInt(token, 10);
			// leg only frames are adjusted to not count the upper body only frames
			if (i === ANIM.LEGS_WALKCR) {
				skip = animations[ANIM.LEGS_WALKCR].firstFrame - animations[ANIM.TORSO_GESTURE].firstFrame;
			}
			if (i >= ANIM.LEGS_WALKCR && i < ANIM.TORSO_GETFLAG) {
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

			var fps = parseInt(token, 10);
			if (!fps) {
				fps = 1;
			}
			animations[i].frameLerp = 1000 / fps;
			animations[i].initialLerp = 1000 / fps;
		}

		if (i !== ANIM.MAX) {
			return callback(new Error('Error parsing animation file: ' + filename));
		}

		// Crouch backward animation.
		animations[ANIM.LEGS_BACKCR] = _.clone(animations[ANIM.LEGS_WALKCR]);
		animations[ANIM.LEGS_BACKCR].reversed = true;

		// Walk backward animation.
		animations[ANIM.LEGS_BACKWALK] = _.clone(animations[ANIM.LEGS_WALK]);
		animations[ANIM.LEGS_BACKWALK].reversed = true;

		// Flag moving fast.
		animations[ANIM.FLAG_RUN].firstFrame = 0;
		animations[ANIM.FLAG_RUN].numFrames = 16;
		animations[ANIM.FLAG_RUN].loopFrames = 16;
		animations[ANIM.FLAG_RUN].frameLerp = 1000 / 15;
		animations[ANIM.FLAG_RUN].initialLerp = 1000 / 15;
		animations[ANIM.FLAG_RUN].reversed = false;

		// Flag not moving or moving slowly.
		animations[ANIM.FLAG_STAND].firstFrame = 16;
		animations[ANIM.FLAG_STAND].numFrames = 5;
		animations[ANIM.FLAG_STAND].loopFrames = 0;
		animations[ANIM.FLAG_STAND].frameLerp = 1000 / 20;
		animations[ANIM.FLAG_STAND].initialLerp = 1000 / 20;
		animations[ANIM.FLAG_STAND].reversed = false;

		// Flag speeding up.
		animations[ANIM.FLAG_STAND2RUN].firstFrame = 16;
		animations[ANIM.FLAG_STAND2RUN].numFrames = 5;
		animations[ANIM.FLAG_STAND2RUN].loopFrames = 1;
		animations[ANIM.FLAG_STAND2RUN].frameLerp = 1000 / 15;
		animations[ANIM.FLAG_STAND2RUN].initialLerp = 1000 / 15;
		animations[ANIM.FLAG_STAND2RUN].reversed = true;

		return callback(null);
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
		error('Bad clientNum on player entity');
	}

	var ci = cgs.clientinfo[clientNum];
	// It is possible to see corpses from disconnected players that may
	// not have valid clientinfo
	if (!ci.infoValid) {
		return;
	}

	var renderfx = 0;
	if (cent.currentState.number === cg.snap.ps.clientNum && !cg.renderingThirdPerson) {
		renderfx = RF.THIRD_PERSON;  // only draw in mirrors
	}

	// for (var i = 0; i < 10; i++) {
	// 	RE.AddLightToScene(
	// 		[2048, -1572 + i*10, -128],
	// 		64,
	// 		1.0,
	// 		0.0,
	// 		0.0);
	// }

	// TODO Pool these?
	var legs = new RE.RefEntity();
	var torso = new RE.RefEntity();
	var head = new RE.RefEntity();

	// Get the rotation information.
	PlayerAngles(cent, legs.axis, torso.axis, head.axis);

	// Get the animation state (after rotation, to allow feet shuffle).
	PlayerAnimation(cent, legs, torso);

	// Add the talk baloon or disconnect icon.
	PlayerSprites(cent);

	// Add the shadow.
	var shadow = PlayerShadow(cent/*, &shadowPlane*/);

	// // Add a water splash if partially in and out of water.
	// CG_PlayerSplash( cent );

	// if ( cg_shadows.integer == 3 && shadow ) {
	// 	renderfx |= RF_SHADOW_PLANE;
	// }
	renderfx |= RF.LIGHTING_ORIGIN;  // use the same origin for all

	//
	// Add the legs.
	//
	legs.reType = RT.MODEL;
	legs.renderfx = renderfx;
	legs.hModel = ci.legsModel;
	legs.customSkin = ci.legsSkin;
	vec3.set(cent.lerpOrigin, legs.origin);
	vec3.set(cent.lerpOrigin, legs.lightingOrigin);
	// legs.shadowPlane = shadowPlane;
	legs.renderfx = renderfx;
	vec3.set(legs.origin, legs.oldOrigin);  // don't positionally lerp at all
	AddRefEntityWithPowerups(legs, cent.currentState, ci.team);

	// if the model failed, allow the default nullmodel to be displayed
	if (!legs.hModel) {
		return;
	}

	//
	// Add the torso.
	//
	torso.reType = RT.MODEL;
	torso.renderfx = renderfx;
	torso.hModel = ci.torsoModel;
	if (!torso.hModel) {
		return;
	}
	torso.customSkin = ci.torsoSkin;
	PositionRotatedEntityOnTag(torso, legs, ci.legsModel, 'tag_torso');
	vec3.set(cent.lerpOrigin, torso.lightingOrigin);
	// torso.shadowPlane = shadowPlane;
	torso.renderfx = renderfx;
	AddRefEntityWithPowerups(torso, cent.currentState, ci.team);

	//
	// Add the head.
	//
	head.reType = RT.MODEL;
	head.renderfx = renderfx;
	head.hModel = ci.headModel;
	if (!head.hModel) {
		return;
	}
	head.customSkin = ci.headSkin;
	PositionRotatedEntityOnTag(head, torso, ci.torsoModel, 'tag_head');
	vec3.set(cent.lerpOrigin, head.lightingOrigin);
	// head.shadowPlane = shadowPlane;
	head.renderfx = renderfx;
	AddRefEntityWithPowerups(head, cent.currentState, ci.team);

	//
	// Add the gun / barrel / flash.
	//
	AddPlayerWeapon(torso, null, cent);

	// Add powerups floating behind the player.
	PlayerPowerups(cent, torso);
}

/**
 * AddRefEntityWithPowerups
 *
 * Adds a piece with modifications or duplications for powerups
 * Also called by CG_Missile for quad rockets, but nobody can tell...
 */
function AddRefEntityWithPowerups(refent, es, team) {
	if (es.powerups & (1 << PW.INVIS)) {
		refent.customShader = cgs.media.invisShader;
		RE.AddRefEntityToScene(refent);
	} else {
		RE.AddRefEntityToScene(refent);

		if (es.powerups & (1 << PW.QUAD)) {
			if (team === TEAM.RED) {
				refent.customShader = cgs.media.redQuadShader;
			} else {
				refent.customShader = cgs.media.quadShader;
			}

			RE.AddRefEntityToScene(refent);
		}
		if (es.powerups & (1 << PW.REGEN)) {
			if (((cg.time / 100 ) % 10 ) === 1 ) {
				refent.customShader = cgs.media.regenShader;
				RE.AddRefEntityToScene(refent);
			}
		}
		if (es.powerups & ( 1 << PW.BATTLESUIT)) {
			refent.customShader = cgs.media.battleSuitShader;
			RE.AddRefEntityToScene(refent);
		}
	}
}

/**
 * PlayerPowerups
 */
function PlayerPowerups(cent, torso) {
	var powerups = cent.currentState.powerups;
	if (!powerups) {
		return;
	}

	// Quad gives a dlight.
	if (powerups & (1 << PW.QUAD)) {
		RE.AddLightToScene(cent.lerpOrigin, 200 + QMath.irrandom(0, 31), 0.2, 0.2, 1);
	}

	// Flight plays a looped sound.
	if (powerups & (1 << PW.FLIGHT)) {
		var flightInfo = FindItemInfo(IT.POWERUP, PW.FLIGHT);
		SND.AddLoopingSound(cent.currentState.number, cent.lerpOrigin, QMath.vec3origin, flightInfo.sounds.pickup);
	}

	var ci = cgs.clientinfo[cent.currentState.clientNum];

	// Redflag.
	if (powerups & (1 << PW.REDFLAG)) {
		// if (ci.newAnims) {
		//	PlayerFlag(cent, cgs.media.redFlagFlapSkin, torso);
		// } else {
			var redFlagInfo = FindItemInfo(IT.TEAM, PW.REDFLAG);
			TrailItem(cent, redFlagInfo.models.primary);
		// }
		RE.AddLightToScene(cent.lerpOrigin, 200 + QMath.irrandom(0, 31), 1.0, 0.2, 0.2);
	}

	// Blueflag.
	if (powerups & (1 << PW.BLUEFLAG)) {
		// if (ci.newAnims){
		//	PlayerFlag(cent, cgs.media.blueFlagFlapSkin, torso);
		// } else {
			var blueFlagInfo = FindItemInfo(IT.TEAM, PW.BLUEFLAG);
			TrailItem(cent, blueFlagInfo.models.primary);
		// }
		RE.AddLightToScene(cent.lerpOrigin, 200 + QMath.irrandom(0, 31), 0.2, 0.2, 1.0);
	}

	// Neutralflag.
	if (powerups & (1 << PW.NEUTRALFLAG)) {
		// if (ci.newAnims) {
		// 	PlayerFlag(cent, cgs.media.neutralFlagFlapSkin, torso);
		// } else {
			var neutralFlagInfo = FindItemInfo(IT.TEAM, PW.NEUTRALFLAG);
			TrailItem(cent, neutralFlagInfo.models.primary);
		// }
		RE.AddLightToScene(cent.lerpOrigin, 200 + QMath.irrandom(0, 31), 1.0, 1.0, 1.0);
	}

	// Haste leaves smoke trails.
	if (powerups & (1 << PW.HASTE)) {
		HasteTrail(cent);
	}
}

// /**
//  * PlayerFlag
//  */
// function PlayerFlag(cent, hSkin, torso) {
// 	clientInfo_t	*ci;
// 	vec3_t		angles, dir;
// 	int			legsAnim, flagAnim, updateangles;
// 	float		angle, d;

// 	// Show the flag pole model.
// 	var pole = new RE.RefEntity();
// 	pole.hModel = cgs.media.flagPoleModel;
// 	vec3.set(torso.lightingOrigin, pole.lightingOrigin);
// 	// pole.shadowPlane = torso.shadowPlane;
// 	pole.renderfx = torso.renderfx;
// 	PositionEntityOnTag(pole, torso, torso.hModel, 'tag_flag');
// 	RE.AddRefEntityToScene(pole);

// 	// Show the flag model.
// 	var flag = new RE.RefEntity();
// 	flag.hModel = cgs.media.flagFlapModel;
// 	flag.customSkin = hSkin;
// 	vec3.set(torso.lightingOrigin, flag.lightingOrigin);
// 	// flag.shadowPlane = torso.shadowPlane;
// 	flag.renderfx = torso.renderfx;

// 	var angles = vec3.create();
// 	var updateangles = false;
// 	var legsAnim = cent.currentState.legsAnim & ~ANIM_TOGGLEBIT;
// 	var flagAnim;

// 	if (legsAnim === ANIMS.LEGS_IDLE || legsAnim === ANIMS.LEGS_IDLECR) {
// 		flagAnim = ANIMS.FLAG_STAND;
// 	} else if (legsAnim === ANIMS.LEGS_WALK || legsAnim === ANIMS.LEGS_WALKCR) {
// 		flagAnim = ANIMS.FLAG_STAND;
// 		updateangles = true;
// 	} else {
// 		flagAnim = ANIMS.FLAG_RUN;
// 		updateangles = true;
// 	}

// 	if (updateangles) {
// 		var dir = vec3.create(cent.currentState.pos.trDelta);

// 		// Add gravity.
// 		dir[2] += 100;
// 		vec3.normalize(dir);

// 		var d = vec3.dot(pole.axis[2], dir);

// 		// If there is enough movement orthogonal to the flag pole.
// 		if (Math.abs(d) < 0.9) {
// 			d = DotProduct(pole.axis[0], dir);
// 			if (d > 1.0) {
// 				d = 1.0;
// 			} else if (d < -1.0) {
// 				d = -1.0;
// 			}

// 			var angle = Math.acos(d);
// 			d = vec3.dot(pole.axis[1], dir);
// 			if (d < 0) {
// 				angles[QMath.YAW] = 360 - angle * 180 / Math.PI;
// 			} else {
// 				angles[QMath.YAW] = angle * 180 / Math.PI;
// 			}
// 			if (angles[QMath.YAW] < 0) {
// 				angles[QMath.YAW] += 360;
// 			}
// 			if (angles[QMath.YAW] > 360) {
// 				angles[QMath.YAW] -= 360;
// 			}

// 			// Change the yaw angle.
// 			var res = { angle: cent.pe.torso.yawAngle, swinging: cent.pe.torso.yawing };
// 			SwingAngles(angles[QMath.YAW], 25, 90, 0.15, res);
// 			cent.pe.flag.yawAngle = res.angle;
// 			cent.pe.flag.yawing = res.swinging;
// 		}
// 	}

// 	// Set the yaw angle.
// 	angles[QMath.YAW] = cent.pe.flag.yawAngle;

// 	// Lerp the flag animation frames.
// 	var ci = cgs.clientinfo[cent.currentState.clientNum];
// 	RunLerpFrame(ci, cent.pe.flag, flagAnim, 1);
// 	flag.oldframe = cent.pe.flag.oldFrame;
// 	flag.frame = cent.pe.flag.frame;
// 	flag.backlerp = cent.pe.flag.backlerp;

// 	QMath.AnglesToAxis(angles, flag.axis);
// 	PositionRotatedEntityOnTag(flag, pole, pole.hModel, 'tag_flag');

// 	RE.AddRefEntityToScene(flag);
// }

/**
 * TrailItem
 */
function TrailItem(cent, hModel) {
	var refent = new RE.RefEntity();

	var angles = vec3.create(cent.lerpAngles);
	angles[QMath.PITCH] = 0;
	angles[QMath.ROLL] = 0;
	QMath.AnglesToAxis(angles, refent.axis);

	vec3.add(vec3.scale(refent.axis[0], -16, refent.origin), cent.lerpOrigin);
	refent.origin[2] += 16;
	angles[QMath.YAW] += 90;
	QMath.AnglesToAxis(angles, refent.axis);

	refent.hModel = hModel;

	RE.AddRefEntityToScene(refent);
}

/**
 * HasteTrail
 */
function HasteTrail(cent) {
	if (cent.trailTime > cg.time) {
		return;
	}
	var anim = cent.pe.legs.animationNumber & ~ANIM_TOGGLEBIT;
	if (anim !== ANIM.LEGS_RUN && anim !== ANIM.LEGS_BACK) {
		return;
	}

	cent.trailTime += 100;
	if ( cent.trailTime < cg.time ) {
		cent.trailTime = cg.time;
	}

	var origin = vec3.create(cent.lerpOrigin);
	origin[2] -= 16;

	var smoke = SmokePuff(origin, QMath.vec3origin,
				  8,
				  1, 1, 1, 1,
				  500,
				  cg.time,
				  0,
				  0,
				  cgs.media.hastePuffShader);

	// Use the optimized local entity add.
	smoke.leType = LE.SCALE_FADE;
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
 * Head always looks exactly at cent.lerpAngles.
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
	var before = headAngles[QMath.YAW];
	headAngles[QMath.YAW] = QMath.AngleNormalize360(headAngles[QMath.YAW]);

	var torsoAngles = vec3.create();
	var legsAngles = vec3.create();

	// --------- yaw -------------

	// Allow yaw to drift a bit
	if ((cent.currentState.legsAnim & ~ANIM_TOGGLEBIT) !== ANIM.LEGS_IDLE ||
		((cent.currentState.torsoAnim & ~ANIM_TOGGLEBIT) !== ANIM.TORSO_STAND &&
		(cent.currentState.torsoAnim & ~ANIM_TOGGLEBIT) !== ANIM.TORSO_STAND2)) {
		// If not standing still, always point all in the same direction.
		cent.pe.torso.yawing = true;    // always center
		cent.pe.torso.pitching = true;  // always center
		cent.pe.legs.yawing = true;     // always center
	}

	// Adjust legs for movement dir.
	var dir;
	if (cent.currentState.eFlags & EF.DEAD) {
		// Don't let dead bodies twitch.
		dir = 0;
	} else {
		dir = cent.currentState.angles2[QMath.YAW];
		if (dir < 0 || dir > 7) {
			error('Bad player movement angle');
		}
	}
	legsAngles[QMath.YAW] = headAngles[QMath.YAW] + movementOffsets[dir];
	torsoAngles[QMath.YAW] = headAngles[QMath.YAW] + 0.25 * movementOffsets[dir];

	// torso
	var res = { angle: cent.pe.torso.yawAngle, swinging: cent.pe.torso.yawing };
	SwingAngles(torsoAngles[QMath.YAW], 25, 90, swingSpeed, res);
	torsoAngles[QMath.YAW] = cent.pe.torso.yawAngle = res.angle;
	cent.pe.torso.yawing = res.swinging;

	// legs
	res = { angle: cent.pe.legs.yawAngle, swinging: cent.pe.legs.yawing };
	SwingAngles(legsAngles[QMath.YAW], 40, 90, swingSpeed, res);
	legsAngles[QMath.YAW] = cent.pe.legs.yawAngle = res.angle;
	cent.pe.legs.yawing = res.swinging;


	// --------- pitch -------------

	// Only show a fraction of the pitch angle in the torso.
	var dest;
	if (headAngles[QMath.PITCH] > 180) {
		dest = (-360 + headAngles[QMath.PITCH]) * 0.75;
	} else {
		dest = headAngles[QMath.PITCH] * 0.75;
	}
	res = { angle: cent.pe.torso.pitchAngle, swinging: cent.pe.torso.pitching };
	SwingAngles(dest, 15, 30, 0.1, res);
	torsoAngles[QMath.PITCH] = cent.pe.torso.pitchAngle = res.angle;
	cent.pe.torso.pitching = res.swinging;

	//
	if (ci && ci.fixedtorso) {
		torsoAngles[QMath.PITCH] = 0;
	}

	// --------- roll -------------

	// Lean towards the direction of travel.
	var velocity = vec3.create(cent.currentState.pos.trDelta);
	var speed = vec3.length(velocity);
	vec3.normalize(velocity);

	if (speed) {
		speed *= 0.05;

		var axis = [vec3.create(), vec3.create(), vec3.create()];

		QMath.AnglesToAxis(legsAngles, axis);

		var side = speed * vec3.dot(velocity, axis[1]);
		legsAngles[QMath.ROLL] -= side;

		side = speed * vec3.dot(velocity, axis[0]);
		legsAngles[QMath.PITCH] += side;
	}

	//
	if (ci && ci.fixedlegs) {
		legsAngles[QMath.YAW] = torsoAngles[QMath.YAW];
		legsAngles[QMath.PITCH] = 0.0;
		legsAngles[QMath.ROLL] = 0.0;
	}

	// Pain twitch.
	AddPainTwitch(cent, torsoAngles);

	// Pull the angles back out of the hierarchial chain.
	QMath.AnglesSubtract(headAngles, torsoAngles, headAngles);
	QMath.AnglesSubtract(torsoAngles, legsAngles, torsoAngles);
	QMath.AnglesToAxis(legsAngles, legs);
	QMath.AnglesToAxis(torsoAngles, torso);
	QMath.AnglesToAxis(headAngles, head);
}

/**
 * SwingAngles
 */
function SwingAngles(destination, swingTolerance, clampTolerance, speed, res) {
	var swing, move, scale;

	if (!res.swinging) {
		// See if a swing should be started
		swing = QMath.AngleSubtract(res.angle, destination);
		if (swing > swingTolerance || swing < -swingTolerance) {
			res.swinging = true;
		}
	}

	if (!res.swinging) {
		return;
	}

	// Modify the speed depending on the delta
	// so it doesn't seem so linear
	swing = QMath.AngleSubtract(destination, res.angle);
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
		res.angle = QMath.AngleNormalize360(res.angle + move);
	} else if ( swing < 0 ) {
		move = cg.frameTime * scale * -speed;
		if (move <= swing) {
			move = swing;
			res.swinging = false;
		}
		res.angle = QMath.AngleNormalize360(res.angle + move);
	}

	// clamp to no more than tolerance
	swing = QMath.AngleSubtract(destination, res.angle);
	if (swing > clampTolerance) {
		res.angle = QMath.AngleNormalize360(destination - (clampTolerance - 1));
	} else if ( swing < -clampTolerance ) {
		res.angle = QMath.AngleNormalize360(destination + (clampTolerance - 1));
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

	var f = 1.0 - (t / PAIN_TWITCH_TIME);
	if (cent.pe.painDirection) {
		torsoAngles[QMath.ROLL] += 20 * f;
	} else {
		torsoAngles[QMath.ROLL] -= 20 * f;
	}
}

/**********************************************************
 *
 * Player effects
 *
 **********************************************************/

/**
 * PlayerSprites
 *
 * Float sprites over the player's head
 */
function PlayerSprites(cent) {
	// if ( cent->currentState.eFlags & EF_CONNECTION ) {
	// 	CG_PlayerFloatSprite( cent, cgs.media.connectionShader );
	// 	return;
	// }

	// if ( cent->currentState.eFlags & EF_TALK ) {
	// 	CG_PlayerFloatSprite( cent, cgs.media.balloonShader );
	// 	return;
	// }

	// if ( cent->currentState.eFlags & EF_AWARD_IMPRESSIVE ) {
	// 	CG_PlayerFloatSprite( cent, cgs.media.medalImpressive );
	// 	return;
	// }

	// if ( cent->currentState.eFlags & EF_AWARD_EXCELLENT ) {
	// 	CG_PlayerFloatSprite( cent, cgs.media.medalExcellent );
	// 	return;
	// }

	// if ( cent->currentState.eFlags & EF_AWARD_GAUNTLET ) {
	// 	CG_PlayerFloatSprite( cent, cgs.media.medalGauntlet );
	// 	return;
	// }

	// if ( cent->currentState.eFlags & EF_AWARD_DEFEND ) {
	// 	CG_PlayerFloatSprite( cent, cgs.media.medalDefend );
	// 	return;
	// }

	// if ( cent->currentState.eFlags & EF_AWARD_ASSIST ) {
	// 	CG_PlayerFloatSprite( cent, cgs.media.medalAssist );
	// 	return;
	// }

	// if ( cent->currentState.eFlags & EF_AWARD_CAP ) {
	// 	CG_PlayerFloatSprite( cent, cgs.media.medalCapture );
	// 	return;
	// }

	var arena = cgs.arenas[cg.snap.ps.arenaNum];
	var team = cgs.clientinfo[cent.currentState.clientNum].team;
	if (!(cent.currentState.eFlags & EF.DEAD) &&
		cg.snap.ps.persistant[PERS.TEAM] === team &&
		arena.gametype >= GT.TEAM) {
		// if (cg_drawFriend.integer) {
			PlayerFloatSprite(cent, cgs.media.friendShader);
		// }
		return;
	}
}

/**
 * PlayerFloatSprite
 *
 * Float a sprite over the player's head
 */
function PlayerFloatSprite(cent, shader) {
	var renderfx = 0;
	if (cent.currentState.number === cg.snap.ps.clientNum && !cg.renderingThirdPerson) {
		renderfx = RF.THIRD_PERSON;  // only show in mirrors
	}

	var refent = new RE.RefEntity();
	vec3.set(cent.lerpOrigin, refent.origin);
	refent.origin[2] += 48;
	refent.reType = RT.SPRITE;
	refent.customShader = shader;
	refent.radius = 10;
	refent.renderfx = renderfx;
	refent.shaderRGBA[0] = 1.0;
	refent.shaderRGBA[1] = 1.0;
	refent.shaderRGBA[2] = 1.0;
	refent.shaderRGBA[3] = 1.0;
	RE.AddRefEntityToScene(refent);
}

/**
 * PlayerShadow
 *
 * Returns the Z component of the surface being shadowed.
 * Should it return a full plane instead of a Z?
 */
var SHADOW_DISTANCE = 128;
function PlayerShadow(cent/*, shadowPlane*/) {
	// *shadowPlane = 0;

	// if (cg_shadows.integer === 0) {
	// 	return false;
	// }

	// No shadows when invisible.
	if (cent.currentState.powerups & (1 << PW.INVIS)) {
		return false;
	}

	// Send a trace down from the player to the ground
	var mins = vec3.createFrom(-15, -15, 0);
	var maxs = vec3.createFrom(15, 15, 2);
	var end = vec3.create(cent.lerpOrigin);
	end[2] -= SHADOW_DISTANCE;

	var trace = new QS.TraceResults();
	CM.BoxTrace(trace, cent.lerpOrigin, end, mins, maxs, 0, MASK.PLAYERSOLID);

	// No shadow if too high
	if (trace.fraction === 1.0 || trace.startSolid || trace.allSolid) {
		return false;
	}

	// *shadowPlane = trace.endPos[2] + 1;

	// if (cg_shadows.integer !== 1) {  // no mark for stencil or projection shadows
	// 	return true;
	// }

	// Fade the shadow out with height.
	var alpha = 1.0 - trace.fraction;

	// Add the mark as a temporary, so it goes directly to the renderer
	// without taking a spot in the cg_marks array.
	ImpactMark(cgs.media.shadowMarkShader, trace.endPos, trace.plane.normal,
		cent.pe.legs.yawAngle, alpha, alpha, alpha, 1, false, 24, true);

	return true;
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

	if (cent.currentState.powerups & (1 << PW.HASTE)) {
		speedScale = 1.5;
	}

	// Do the shuffle turn frames locally.
	if (cent.pe.legs.yawing && (cent.currentState.legsAnim & ~ANIM_TOGGLEBIT) === ANIM.LEGS_IDLE) {
		RunLerpFrame(ci, cent.pe.legs, ANIM.LEGS_TURN, speedScale);
	} else {
		RunLerpFrame(ci, cent.pe.legs, cent.currentState.legsAnim, speedScale);
	}

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
		var numFrames = anim.numFrames;
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

	if (newAnimation < 0 || newAnimation >= ANIM.MAX_TOTALANIMATIONS) {
		error('Bad animation number: ' + newAnimation);
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

/**
 * ResetPlayerEntity
 *
 * A player just came into view or teleported, so reset all animation info
 */
function ResetPlayerEntity(cent) {
	cent.errorTime = -99999;  // guarantee no error decay added
	cent.extrapolated = false;

	// CG_ClearLerpFrame( &cgs.clientinfo[ cent->currentState.clientNum ], &cent->pe.legs, cent->currentState.legsAnim );
	// CG_ClearLerpFrame( &cgs.clientinfo[ cent->currentState.clientNum ], &cent->pe.torso, cent->currentState.torsoAnim );

	// BG_EvaluateTrajectory( &cent->currentState.pos, cg.time, cent->lerpOrigin );
	// BG_EvaluateTrajectory( &cent->currentState.apos, cg.time, cent->lerpAngles );

	// VectorCopy( cent->lerpOrigin, cent->rawOrigin );
	// VectorCopy( cent->lerpAngles, cent->rawAngles );

	// memset( &cent->pe.legs, 0, sizeof( cent->pe.legs ) );
	// cent->pe.legs.yawAngle = cent->rawAngles[YAW];
	// cent->pe.legs.yawing = qfalse;
	// cent->pe.legs.pitchAngle = 0;
	// cent->pe.legs.pitching = qfalse;

	// memset( &cent->pe.torso, 0, sizeof( cent->pe.torso ) );
	// cent->pe.torso.yawAngle = cent->rawAngles[YAW];
	// cent->pe.torso.yawing = qfalse;
	// cent->pe.torso.pitchAngle = cent->rawAngles[PITCH];
	// cent->pe.torso.pitching = qfalse;

	// if ( cg_debugPosition.integer ) {
	// 	CG_Printf("%i ResetPlayerEntity yaw=%f\n", cent->currentState.number, cent->pe.torso.yawAngle );
	// }
}

/**********************************************************
 *
 * Player sounds
 *
 **********************************************************/
var customSoundNames = [
	'*death1',
	'*death2',
	'*death3',
	'*jump1',
	'*pain25_1',
	'*pain50_1',
	'*pain75_1',
	'*pain100_1',
	'*falling1',
	'*gasp',
	'*drown',
	'*fall1',
	'*taunt'
];

/**
 * CustomSound
 */
function CustomSound(clientNum, soundName) {
	if (clientNum < 0 || clientNum >= MAX_CLIENTS) {
		clientNum = 0;
	}

	var ci = cgs.clientinfo[clientNum];

	for (var i = 0; i < customSoundNames.length; i++) {
		if (customSoundNames[i] === soundName) {
			return ci.sounds[i];
		}
	}

	error('Unknown custom sound:', soundName);
	return 0;
}
