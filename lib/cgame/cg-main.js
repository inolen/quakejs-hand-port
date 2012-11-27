var cg;
var cgs;

var cg_fov,
	cg_errordecay,
	cg_nopredict,
	cg_showmiss,
	cg_thirdPerson,
	cg_thirdPersonAngle,
	cg_thirdPersonRange,
	cg_railTrailTime;

var cg_hud;

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

	cg_fov              = com.AddCvar('cg_fov',              110, CVF.ARCHIVE);
	cg_errordecay       = com.AddCvar('cg_errordecay',       100, CVF.ARCHIVE);
	cg_nopredict        = com.AddCvar('cg_nopredict',        0,   CVF.ARCHIVE);
	cg_showmiss         = com.AddCvar('cg_showmiss',         1,   CVF.ARCHIVE);
	cg_thirdPerson      = com.AddCvar('cg_thirdPerson',      0,   CVF.ARCHIVE);
	cg_thirdPersonAngle = com.AddCvar('cg_thirdPersonAngle', 0);
	cg_thirdPersonRange = com.AddCvar('cg_thirdPersonRange', 100);
	cg_railTrailTime    = com.AddCvar('cg_railTrailTime',    1000, CVF.CHEAT);

	cg_hud = ui.GetView('hud');

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

	if (!cg.snap || (cg.snap.snapFlags & sh.SNAPFLAG_NOT_ACTIVE)) {
		//CG_DrawInformation();
		return;
	}

	// Let the client system know our weapon.
	cl.SetUserCmdValue('weapon', cg.weaponSelect);

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
	cgs.media.jumpPadSound = snd.RegisterSound('sound/world/jumppad');
}

/**
 * RegisterGraphics
 */
function RegisterGraphics() {
	for (var i = 0; i < bg.ItemList.length; i++) {
		RegisterItemVisuals(i);
	}

	cgs.media.bulletFlashModel = re.RegisterModel('models/weaphits/bullet.md3');
	cgs.media.ringFlashModel = re.RegisterModel('models/weaphits/ring02.md3');
	cgs.media.dishFlashModel = re.RegisterModel('models/weaphits/boom01.md3');
	cgs.media.smokePuffShader = re.RegisterShader('smokePuff');

	cgs.media.bloodExplosionShader = re.RegisterShader('bloodExplosion');
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
