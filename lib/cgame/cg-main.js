var cg;
var cgs;

var cg_fov,
	cg_errordecay,
	cg_predict,
	cg_showmiss,
	cg_thirdPerson,
	cg_thirdPersonAngle,
	cg_thirdPersonRange;

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
	imp.com_error(sh.Err.DROP, str);
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
	cgs.gameState = imp.cl_GetGameState();

	cg_fov              = imp.com_AddCvar('cg_fov',              110, CVF.ARCHIVE);
	cg_errordecay       = imp.com_AddCvar('cg_errordecay',       100, CVF.ARCHIVE);
	cg_predict          = imp.com_AddCvar('cg_predict',          0,   CVF.ARCHIVE);
	cg_showmiss         = imp.com_AddCvar('cg_showmiss',         1,   CVF.ARCHIVE);
	cg_thirdPerson      = imp.com_AddCvar('cg_thirdPerson',      0,   CVF.ARCHIVE);
	cg_thirdPersonAngle = imp.com_AddCvar('cg_thirdPersonAngle', 0);
	cg_thirdPersonRange = imp.com_AddCvar('cg_thirdPersonRange', 100);

	cg_hud = imp.ui_GetView('hud');

	RegisterCommands();
	ParseServerinfo();

	imp.cm_LoadMap(cgs.mapname, function () {
		imp.re_LoadMap(cgs.mapname, function () {
			// The renderer uses our clipmap data to build the buffers.
			imp.re_BuildCollisionBuffers();

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
	imp.cl_SetUserCmdValue('weapon', cg.weaponSelect);

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
	imp.snd_Respatialize(cg.snap.ps.clientNum, cg.refdef.vieworg, cg.refdef.viewaxis/*, inwater*/);

	cg.frameTime = cg.time - cg.oldTime;
	if (cg.frametime < 0) {
		cg.frametime = 0;
	}
	cg.oldTime = cg.time;
	
	// Issue rendering calls.
	imp.re_RenderScene(cg.refdef);

	// All Draw* calls just prep the cg_hud viewmodel,
	// which is finally rendered with imp.ui_Render() in cl-main.
	DrawRenderCounts();
	DrawHealth();
	DrawArmor();
	DrawAmmo();
	DrawWeaponSelect();
	imp.ui_RenderView(cg_hud);

	// if (cg.showScores === true) {
	// 	var players = [
	// 		{ name: 'Player 1' }
	// 	];

	// 	imp.ui_RenderView('scoreboard');
	// }
}

/**
 * RegisterGraphics
 */
function RegisterGraphics() {
	for (var i = 0; i < bg.ItemList.length; i++) {
		RegisterItemVisuals(i);
	}

	cgs.media.bulletFlashModel = imp.re_RegisterModel('models/weaphits/bullet.md3');
	cgs.media.ringFlashModel = imp.re_RegisterModel('models/weaphits/ring02.md3');
	cgs.media.dishFlashModel = imp.re_RegisterModel('models/weaphits/boom01.md3');
	cgs.media.smokePuffShader = imp.re_RegisterShader('smokePuff');

	cgs.media.bloodExplosionShader = imp.re_RegisterShader('bloodExplosion');
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
		itemInfo.modelHandles[i] = imp.re_RegisterModel(gitem.models[i]);
	}
	itemInfo.icon = imp.ui_RegisterImage(gitem.icon);

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

	imp.snd_StartBackgroundTrack(imp.snd_RegisterSound('music/sonic5'), true);
}
