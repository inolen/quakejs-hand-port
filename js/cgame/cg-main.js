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
 * Init
 */
function Init(serverMessageNum, serverCommandSequence, clientNum) {
	console.log('--------- CG Init ---------');

	cg = new ClientGame();
	cgs = new ClientGameStatic();

	cg_errordecay = com.AddCvar('cg_errordecay', 100, CvarFlags.ARCHIVE);
	cg_predict = com.AddCvar('cg_predict', 0, CvarFlags.ARCHIVE);
	cg_showmiss = com.AddCvar('cg_showmiss', 1, CvarFlags.ARCHIVE);

	cg_thirdPerson = com.AddCvar('cg_thirdPerson', 1, CvarFlags.ARCHIVE);
	cg_thirdPersonAngle = com.AddCvar('cg_thirdPersonAngle', 0);
	cg_thirdPersonRange = com.AddCvar('cg_thirdPersonRange', 100);

	cg_hud = ui.RegisterView('hud');

	cg.clientNum = clientNum;
	cgs.processedSnapshotNum = serverMessageNum;
	cgs.serverCommandSequence = serverCommandSequence;
	cgs.gameState = cl.GetGameState();

	RegisterCommands();
	ParseServerinfo();

	cm.LoadMap(cgs.mapname, function () {
		r.LoadMap(cgs.mapname, function () {
			RegisterGraphics();
			RegisterClients();

			cg.initialized = true;
		});
	});
}

/**
 * Shutdown
 */
function Shutdown() {
	console.log('--------- CG Shutdown ---------');
}

/**
 * ConfigString
 */
function ConfigString(key) {
	return cgs.gameState[key];
}

/**
 * RegisterGraphics
 */
function RegisterGraphics() {
	for (var i = 0; i < bg.ItemList.length; i++) {
		RegisterItemVisuals(i);
	}
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
		itemInfo.modelHandles[i] = r.RegisterModel(gitem.modelPaths[i]);
	}

	/*if ( item->giType == IT_WEAPON ) {
		CG_RegisterWeapon( item->giTag );
	}*/
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

	PredictPlayerState();
	
	CalcViewValues();
	cg.refdef.time = cg.time;

	if (!cg.hyperspace) {
		AddPacketEntities();
	}

	cg.frameTime = cg.time - cg.oldTime;
	if (cg.frametime < 0) {
		cg.frametime = 0;
	}
	cg.oldTime = cg.time;
	
	// Issue rendering calls.
	r.RenderScene(cg.refdef);
	UpdateFPS();
	ui.RenderView(cg_hud);

	// if (cg.showScores === true) {
	// 	var players = [
	// 		{ name: 'Player 1' }
	// 	];

	// 	ui.RenderView('scoreboard');
	// }
}