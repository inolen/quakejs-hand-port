var cg,
	cgs,
	cg_hud;

var cg_fov,
	cg_zoomFov,
	cg_errordecay,
	cg_nopredict,
	cg_showmiss,
	cg_thirdPerson,
	cg_thirdPersonAngle,
	cg_thirdPersonRange,
	cg_railTrailTime;

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
	com.error(ERR.DROP, str);
}

/**
 * Init
 */
function Init(serverMessageNum, serverCommandSequence, clientNum) {
	log('Initializing', serverMessageNum, serverCommandSequence, clientNum);

	cg  = new ClientGame();
	cg.clientNum = clientNum;

	cgs = new ClientGameStatic();
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
	cg_railTrailTime    = com.AddCvar('cg_railTrailTime',    1000, CVF.CHEAT);

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
	if (!cg.initialized) {
		return;
	}
	
	cg.time = serverTime;
	
	ProcessSnapshots();

	if (!cg.snap || (cg.snap.snapFlags & SNAPFLAG_NOT_ACTIVE)) {
		//CG_DrawInformation();
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
	DrawRenderCounts();
	DrawHealth();
	DrawArmor();
	DrawAmmo();
	DrawWeaponSelect();
	ui.RenderView(cg_hud);
	
	// if (cg.showScores === true) {
	// 	var players = [
	// 		{ name: 'Player 1' }
	// 	];

	// 	ui.RenderView('scoreboard');
	// }
}

/**
 * RegisterSounds
 */
function RegisterSounds() {
	cgs.media.teleInSound = snd.RegisterSound('sound/world/telein.wav');
	cgs.media.teleOutSound = snd.RegisterSound('sound/world/teleout');
	cgs.media.respawnSound = snd.RegisterSound('sound/items/respawn1');

	cgs.media.noAmmoSound = snd.RegisterSound('sound/weapons/noammo');

	cgs.media.jumpPadSound = snd.RegisterSound('sound/world/jumppad');
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
	cgs.media.bulletFlashModel = re.RegisterModel('models/weaphits/bullet.md3');
	cgs.media.ringFlashModel = re.RegisterModel('models/weaphits/ring02.md3');
	cgs.media.dishFlashModel = re.RegisterModel('models/weaphits/boom01.md3');
	cgs.media.smokePuffShader = re.RegisterShader('smokePuff');
	cgs.media.shotgunSmokePuffShader = re.RegisterShader('shotgunSmokePuff');
	cgs.media.plasmaBallShader = re.RegisterShader('sprites/plasma1');
	
	cgs.media.bloodExplosionShader = re.RegisterShader('bloodExplosion');

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
			mins[2] + 0.5 * (maxs[2] - mins[2]),
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
	// // Start the background music.
	// s = (char *)CG_ConfigString( CS_MUSIC );
	// Q_strncpyz( parm1, COM_Parse( &s ), sizeof( parm1 ) );
	// Q_strncpyz( parm2, COM_Parse( &s ), sizeof( parm2 ) );

	snd.StartBackgroundTrack(snd.RegisterSound('music/sonic5'), true);
}
