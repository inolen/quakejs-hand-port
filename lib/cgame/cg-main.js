var cg,
	cgs,
	cg_hud,
	cg_scoreboard;

var cg_fov,
	cg_zoomFov,
	cg_errordecay,
	cg_nopredict,
	cg_showmiss,
	cg_thirdPerson,
	cg_thirdPersonAngle,
	cg_thirdPersonRange,
	cg_railTrailTime,
	cg_trueLightning,
	cg_crosshairShaders,
	cg_drawLagometer;

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'CG:');
	Function.apply.call(console.log, console, args);
}

/**
 * error
 */
function error(str) {
	com.Error(ERR.DROP, str);
}

/**
 * Init
 */
function Init(serverMessageNum, serverCommandSequence, clientNum) {
	log('Initializing', serverMessageNum, serverCommandSequence, clientNum);

	cg = new ClientGame();
	cg.clientNum = clientNum;

	if (!cgs) {
		cgs = new ClientGameStatic();
	}
	cgs.processedSnapshotNum = serverMessageNum;
	cgs.serverCommandSequence = serverCommandSequence;
	cgs.gameState = cl.GetGameState();

	cg_fov              = com.AddCvar('cg_fov',              110,  CVF.ARCHIVE);
	cg_zoomFov          = com.AddCvar('cg_zoomFov',          22.5, CVF.ARCHIVE),
	cg_errordecay       = com.AddCvar('cg_errordecay',       100,  CVF.ARCHIVE);
	cg_nopredict        = com.AddCvar('cg_nopredict',        0,    CVF.ARCHIVE);
	cg_showmiss         = com.AddCvar('cg_showmiss',         1,    CVF.ARCHIVE);
	cg_thirdPerson      = com.AddCvar('cg_thirdPerson',      0,    CVF.ARCHIVE);
	cg_thirdPersonAngle = com.AddCvar('cg_thirdPersonAngle', 0);
	cg_thirdPersonRange = com.AddCvar('cg_thirdPersonRange', 100);
	cg_railTrailTime    = com.AddCvar('cg_railTrailTime',    400,  CVF.CHEAT);
	cg_trueLightning    = com.AddCvar('cg_trueLightning',    1,    CVF.ARCHIVE);
	cg_crosshairShaders = com.AddCvar('cg_crosshairShaders', 0,    CVF.CHEAT);
	cg_drawLagometer    = com.AddCvar('cg_drawLagometer',    0,    CVF.ARCHIVE);

	cg_hud        = ui.GetView('hud');
	cg_scoreboard = ui.GetView('scoreboard');

	RegisterCommands();
	ParseServerinfo();

	cm.LoadMap(cgs.mapname, function () {
		re.LoadMap(cgs.mapname, function () {
			// The renderer uses our clipmap data to build the buffers.
			re.BuildCollisionBuffers();

			RegisterSounds();
			RegisterGraphics();
			RegisterClients();
			InitLocalEntities();
			StartMusic();

			cg.initialized = true;
		});
	});
}

/**
 * Shutdown
 */
function Shutdown() {
	log('Shutting down');
}

/**
 * Frame
 */
function Frame(serverTime) {
	// Wait for the collision / render bsp to load.
	if (!cg.initialized) {
		DrawLoading();
		return;
	}

	cg.time = serverTime;

	ProcessSnapshots();

	if (!cg.snap || (cg.snap.snapFlags & SNAPFLAG_NOT_ACTIVE)) {
		DrawLoading();
		return;
	}

	// Let the client system know our weapon.
	cl.SetUserCmdValue('weapon', cg.weaponSelect);
	cl.SetUserCmdValue('sensitivity', cg.zoomSensitivity);

	// Predicate our local playerstate.
	PredictPlayerState();

	// Decide on third person view.
	cg.renderingThirdPerson = cg_thirdPerson() || cg.snap.ps.pm_type === PM.DEAD;

	// Calculate view origin and axis.
	CalcViewValues();
	cg.refdef.time = cg.time;

	// Add network and local entities to the scene.
	if (!cg.hyperspace) {
		AddPacketEntities();
		AddLocalEntities();
	}
	AddViewWeapon(cg.predictedPlayerState);

	// Update audio positions.
	snd.Respatialize(cg.snap.ps.clientNum, cg.refdef.vieworg, cg.refdef.viewaxis/*, inwater*/);

	cg.frameTime = cg.time - cg.oldTime;
	if (cg.frametime < 0) {
		cg.frametime = 0;
	}
	cg.oldTime = cg.time;

	// Issue rendering calls.
	re.RenderScene(cg.refdef);

	if (cg.snap.ps.pm_type == PM.INTERMISSION ) {
		// DrawIntermission();
		ui.RenderView(cg_scoreboard);
		return;
	}

	// All Draw* calls just prep the cg_hud viewmodel,
	// which is finally rendered with ui.Render() in cl-main.
	LagometerAddFrame();

	HudUpdateFPS();
	HudUpdateCounts();
	HudUpdateCrosshairNames();
	HudUpdateHealth();
	HudUpdateArmor();
	HudUpdateAmmo();
	HudUpdateKills();
	HudUpdateTeam();
	HudUpdateWeaponSelect();
	// if (!DrawFollow()) {
		DrawWarmup();
	// }
	LagometerUpdate();

	ui.RenderView(cg_hud);

	if (cg.showScores) {
		ui.RenderView(cg_scoreboard);
	}
}

/**
 * RegisterSounds
 */
function RegisterSounds() {
	// Warmup.
	cgs.media.oneMinuteSound = snd.RegisterSound('sound/feedback/1_minute');
	cgs.media.fiveMinuteSound = snd.RegisterSound('sound/feedback/5_minute');
	cgs.media.suddenDeathSound = snd.RegisterSound('sound/feedback/sudden_death');
	cgs.media.oneFragSound = snd.RegisterSound('sound/feedback/1_frag');
	cgs.media.twoFragSound = snd.RegisterSound('sound/feedback/2_frags');
	cgs.media.threeFragSound = snd.RegisterSound('sound/feedback/3_frags');
	cgs.media.count3Sound = snd.RegisterSound('sound/feedback/three');
	cgs.media.count2Sound = snd.RegisterSound('sound/feedback/two');
	cgs.media.count1Sound = snd.RegisterSound('sound/feedback/one');
	cgs.media.countFightSound = snd.RegisterSound('sound/feedback/fight');
	cgs.media.countPrepareSound = snd.RegisterSound('sound/feedback/prepare');
	cgs.media.countPrepareTeamSound = snd.RegisterSound('sound/feedback/prepare_team');

	// Gibs.
	cgs.media.gibSound = snd.RegisterSound('sound/player/gibsplt1');
	cgs.media.gibBounce1Sound = snd.RegisterSound('sound/player/gibimp1');
	cgs.media.gibBounce2Sound = snd.RegisterSound('sound/player/gibimp2');
	cgs.media.gibBounce3Sound = snd.RegisterSound('sound/player/gibimp3');

	cgs.media.teleInSound = snd.RegisterSound('sound/world/telein');
	cgs.media.teleOutSound = snd.RegisterSound('sound/world/teleout');
	cgs.media.respawnSound = snd.RegisterSound('sound/items/respawn1');

	cgs.media.noAmmoSound = snd.RegisterSound('sound/weapons/noammo');

	cgs.media.jumpPadSound = snd.RegisterSound('sound/world/jumppad');

	if (cgs.gametype >= GT.TEAM) {
		cgs.media.captureAwardSound = snd.RegisterSound('sound/teamplay/flagcapture_yourteam');
		cgs.media.redLeadsSound = snd.RegisterSound('sound/feedback/redleads');
		cgs.media.blueLeadsSound = snd.RegisterSound('sound/feedback/blueleads');
		cgs.media.teamsTiedSound = snd.RegisterSound('sound/feedback/teamstied');
		cgs.media.hitTeamSound = snd.RegisterSound('sound/feedback/hit_teammate');

		cgs.media.redScoredSound = snd.RegisterSound('sound/teamplay/voc_red_scores');
		cgs.media.blueScoredSound = snd.RegisterSound('sound/teamplay/voc_blue_scores');

		cgs.media.captureYourTeamSound = snd.RegisterSound('sound/teamplay/flagcapture_yourteam');
		cgs.media.captureOpponentSound = snd.RegisterSound('sound/teamplay/flagcapture_opponent');

		cgs.media.returnYourTeamSound = snd.RegisterSound('sound/teamplay/flagreturn_yourteam');
		cgs.media.returnOpponentSound = snd.RegisterSound('sound/teamplay/flagreturn_opponent');

		cgs.media.takenYourTeamSound = snd.RegisterSound('sound/teamplay/flagtaken_yourteam');
		cgs.media.takenOpponentSound = snd.RegisterSound('sound/teamplay/flagtaken_opponent');

		if (cgs.gametype == GT.CTF) {
			cgs.media.redFlagReturnedSound = snd.RegisterSound('sound/teamplay/voc_red_returned');
			cgs.media.blueFlagReturnedSound = snd.RegisterSound('sound/teamplay/voc_blue_returned');
			cgs.media.enemyTookYourFlagSound = snd.RegisterSound('sound/teamplay/voc_enemy_flag');
			cgs.media.yourTeamTookEnemyFlagSound = snd.RegisterSound('sound/teamplay/voc_team_flag');
		}

		if (cgs.gametype == GT.NFCTF) {
			// FIXME: get a replacement for this sound ?
			cgs.media.neutralFlagReturnedSound = snd.RegisterSound('sound/teamplay/flagreturn_opponent');
			cgs.media.yourTeamTookTheFlagSound = snd.RegisterSound('sound/teamplay/voc_team_1flag');
			cgs.media.enemyTookTheFlagSound = snd.RegisterSound('sound/teamplay/voc_enemy_1flag');
		}

		if ( cgs.gametype == GT.NFCTF || cgs.gametype == GT.CTF) {
			cgs.media.youHaveFlagSound = snd.RegisterSound('sound/teamplay/voc_you_flag');
			cgs.media.holyShitSound = snd.RegisterSound('sound/feedback/voc_holyshit');
		}

		cgs.media.youHaveFlagSound = snd.RegisterSound('sound/teamplay/voc_you_flag');
		cgs.media.holyShitSound = snd.RegisterSound('sound/feedback/voc_holyshit');
	}
}

/**
 * RegisterGraphics
 */
function RegisterGraphics() {
	for (var i = 1; i < bg.ItemList.length; i++) {
		RegisterItemVisuals(i);
	}

	// Powerup shaders.
	cgs.media.quadShader = re.RegisterShader('powerups/quad');
	cgs.media.quadWeaponShader = re.RegisterShader('powerups/quadWeapon');
	cgs.media.battleSuitShader = re.RegisterShader('powerups/battleSuit');
	cgs.media.battleWeaponShader = re.RegisterShader('powerups/battleWeapon');
	cgs.media.invisShader = re.RegisterShader('powerups/invisibility');
	cgs.media.regenShader = re.RegisterShader('powerups/regen');
	cgs.media.hastePuffShader = re.RegisterShader('hasteSmokePuff');

	// General weapon fx.
	cgs.media.bulletFlashModel = re.RegisterModel('models/weaphits/bullet');
	cgs.media.ringFlashModel = re.RegisterModel('models/weaphits/ring02');
	cgs.media.dishFlashModel = re.RegisterModel('models/weaphits/boom01');
	cgs.media.smokePuffShader = re.RegisterShader('smokePuff');
	cgs.media.shotgunSmokePuffShader = re.RegisterShader('shotgunSmokePuff');
	cgs.media.plasmaBallShader = re.RegisterShader('sprites/plasma1');

	// Gibs.
	cgs.media.bloodExplosionShader = re.RegisterShader('bloodExplosion');
	cgs.media.bloodTrailShader = re.RegisterShader('bloodTrail');
	cgs.media.bloodMarkShader = re.RegisterShader('bloodMark');

	cgs.media.gibAbdomen = re.RegisterModel('models/gibs/abdomen');
	cgs.media.gibArm = re.RegisterModel('models/gibs/arm');
	cgs.media.gibChest = re.RegisterModel('models/gibs/chest');
	cgs.media.gibFist = re.RegisterModel('models/gibs/fist');
	cgs.media.gibFoot = re.RegisterModel('models/gibs/foot');
	cgs.media.gibForearm = re.RegisterModel('models/gibs/forearm');
	cgs.media.gibIntestine = re.RegisterModel('models/gibs/intestine');
	cgs.media.gibLeg = re.RegisterShader('models/gibs/leg');
	cgs.media.gibSkull = re.RegisterModel('models/gibs/skull');
	cgs.media.gibBrain = re.RegisterModel('models/gibs/brain');

	// Teleporter fx.
	cgs.media.teleportEffectModel = re.RegisterModel('models/misc/telep');
	cgs.media.teleportEffectShader = re.RegisterShader('teleportEffect');

	// Wall marks.
	cgs.media.bulletMarkShader = re.RegisterShader('gfx/damage/bullet_mrk');
	cgs.media.burnMarkShader = re.RegisterShader('gfx/damage/burn_med_mrk');
	cgs.media.holeMarkShader = re.RegisterShader('gfx/damage/hole_lg_mrk');
	cgs.media.energyMarkShader = re.RegisterShader('gfx/damage/plasma_mrk');
	cgs.media.shadowMarkShader = re.RegisterShader('markShadow');

	// Register the inline models.
	var numInlineModels = re.NumInlineModels();

	cgs.inlineDrawModels = new Array(numInlineModels);
	cgs.inlineModelMidpoints = new Array(numInlineModels);

	for (var i = 1; i < numInlineModels; i++) {
		var mins = [0, 0, 0];
		var maxs = [0, 0, 0];
		var name = '*' + i;

		cgs.inlineDrawModels[i] = re.RegisterModel(name);

		re.ModelBounds(cgs.inlineDrawModels[i], mins, maxs);

		cgs.inlineModelMidpoints[i] = [
			mins[0] + 0.5 * (maxs[0] - mins[0]),
			mins[1] + 0.5 * (maxs[1] - mins[1]),
			mins[2] + 0.5 * (maxs[2] - mins[2])
		];
	}

	// Register all the server specified models.
	// for (var i = 1; i < MAX_MODELS; i++) {
	// 	const char		*modelName;

	// 	modelName = CG_ConfigString( CS_MODELS+i );
	// 	if ( !modelName[0] ) {
	// 		break;
	// 	}

	// 	cgs.gameModels[i] = trap_R_RegisterModel( modelName );
	// }
}

/**
 * RegisterItemVisuals
 */
function RegisterItemVisuals(itemNum) {
	var gitem = bg.ItemList[itemNum];
	var itemInfo = cg.itemInfo[itemNum];

	if (!gitem || itemInfo) {
		return;
	}

	itemInfo = cg.itemInfo[itemNum] = new ItemInfo();

	for (var i = 0; i < gitem.models.length; i++) {
		itemInfo.modelHandles[i] = re.RegisterModel(gitem.models[i]);
	}
	itemInfo.icon = ui.RegisterImage(gitem.icon);

	if (gitem.giType === IT.WEAPON) {
		RegisterWeapon(gitem);
	}
}

/**
 * RegisterClients
 */
function RegisterClients() {
	NewClientInfo(cg.clientNum);

	for (var i = 0; i < MAX_CLIENTS; i++) {
		if (cg.clientNum === i) {
			continue;
		}

		var cs = ConfigString('player' + i);

		if (!cs) {
			continue;
		}

		NewClientInfo(i);
	}
}

/**
 * ConfigString
 */
function ConfigString(key) {
	return cgs.gameState[key];
}

/**
 * StartMusic
 */
function StartMusic() {
	var music = ConfigString('music');
	snd.StartBackgroundTrack(snd.RegisterSound(music), true);
}

/**
 * AddBufferedSound
 */
function AddBufferedSound(sfx) {
	if (!sfx) {
		return;
	}

	cg.soundBuffer[cg.soundBufferIn] = sfx;
	cg.soundBufferIn = (cg.soundBufferIn + 1) % MAX_SOUNDBUFFER;
	if (cg.soundBufferIn === cg.soundBufferOut) {
		cg.soundBufferOut++;
	}
}

/**
 * PlayBufferedSounds
 */
function PlayBufferedSounds() {
	if (cg.soundTime < cg.time) {
		if (cg.soundBufferOut !== cg.soundBufferIn && cg.soundBuffer[cg.soundBufferOut]) {
			snd.StartLocalSound(cg.soundBuffer[cg.soundBufferOut]/*, CHAN_ANNOUNCER*/);
			cg.soundBuffer[cg.soundBufferOut] = 0;
			cg.soundBufferOut = (cg.soundBufferOut + 1) % MAX_SOUNDBUFFER;
			cg.soundTime = cg.time + 750;
		}
	}
}


/**
* BGExports
*/
function BGExports() {
	return {
		com: {
			ERR:   com.ERR,
			Error: com.Error
		}
	};
}
