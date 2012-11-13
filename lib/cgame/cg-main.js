var cg;
var cgs;

var cg_errordecay;
var cg_predict;
var cg_showmiss;
var cg_thirdPerson;
var cg_thirdPersonAngle;
var cg_thirdPersonRange;

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
	imp.COM_error(Err.DROP, str);
}

/**
 * Init
 */
function Init(serverMessageNum, serverCommandSequence, clientNum) {
	log('Initializing');

	cg  = new ClientGame();
	cg.clientNum = clientNum;

	cgs = new ClientGameStatic();
	cgs.processedSnapshotNum = serverMessageNum;
	cgs.serverCommandSequence = serverCommandSequence;
	cgs.gameState = imp.CL_GetGameState();

	cg_errordecay       = imp.COM_AddCvar('cg_errordecay',       100, CvarFlags.ARCHIVE);
	cg_predict          = imp.COM_AddCvar('cg_predict',          0,   CvarFlags.ARCHIVE);
	cg_showmiss         = imp.COM_AddCvar('cg_showmiss',         1,   CvarFlags.ARCHIVE);
	cg_thirdPerson      = imp.COM_AddCvar('cg_thirdPerson',      1,   CvarFlags.ARCHIVE);
	cg_thirdPersonAngle = imp.COM_AddCvar('cg_thirdPersonAngle', 0);
	cg_thirdPersonRange = imp.COM_AddCvar('cg_thirdPersonRange', 100);

	cg_hud = imp.UI_GetView('hud');

	RegisterCommands();
	ParseServerinfo();

	imp.CM_LoadMap(cgs.mapname, function () {
		imp.RE_LoadMap(cgs.mapname, function () {
			// The renderer uses our clipmap data to build the buffers.
			imp.RE_BuildCollisionBuffers();

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
	imp.CL_SetUserCmdValue('weapon', cg.weaponSelect);

	PredictPlayerState();
	
	CalcViewValues();
	cg.refdef.time = cg.time;

	if (!cg.hyperspace) {
		AddPacketEntities();
		AddLocalEntities();
	}
	// AddViewWeapon(cg.predictedPlayerState);

	cg.frameTime = cg.time - cg.oldTime;
	if (cg.frametime < 0) {
		cg.frametime = 0;
	}
	cg.oldTime = cg.time;
	
	// Issue rendering calls.
	imp.RE_RenderScene(cg.refdef);

	// All Draw* calls just prep the cg_hud viewmodel,
	// which is finally rendered with imp.UI_Render() in cl-main.
	DrawRenderCounts();
	DrawWeaponSelect();
	imp.UI_RenderView(cg_hud);

	// if (cg.showScores === true) {
	// 	var players = [
	// 		{ name: 'Player 1' }
	// 	];

	// 	imp.UI_RenderView('scoreboard');
	// }
}

/**
 * RegisterGraphics
 */
function RegisterGraphics() {
	for (var i = 0; i < bg.ItemList.length; i++) {
		RegisterItemVisuals(i);
	}

	cgs.media['bulletFlashModel'] = imp.RE_RegisterModel('models/weaphits/bullet.md3');
	//cgs.media['bulletMarkShader'] = imp.RE_RegisterShader( "gfx/damage/bullet_mrk" );
}

/**
 * RegisterItemVisuals
 */
function RegisterItemVisuals(itemNum) {
	var gitem = bg.ItemList[itemNum];
	var itemInfo = cg.itemInfo[itemNum];

	if (itemInfo) {
		return;
	}

	itemInfo = cg.itemInfo[itemNum] = new ItemInfo();

	for (var i = 0; i < gitem.modelPaths.length; i++) {
		itemInfo.modelHandles[i] = imp.RE_RegisterModel(gitem.modelPaths[i]);
	}
	itemInfo.icon = imp.UI_RegisterImage(gitem.icon);

	if (gitem.giType === ItemType.WEAPON) {
		cg.weaponInfo[gitem.giTag] = itemInfo;
		//RegisterWeapon(gitem.giTag);
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

	// trap_S_StartBackgroundTrack( parm1, parm2 );
	imp.SND_StartBackgroundTrack('sonic5', true);
}
