var cg;
var cgs;

var cg_errordecay;
var cg_predict;
var cg_showmiss;

var cg_hud;

/**
 * Init
 */
function Init(serverMessageNum) {
	console.log('--------- CG Init ---------');

	cg = new ClientGame();
	cgs = new ClientGameStatic();

	cg_errordecay = com.AddCvar('cg_errordecay', 100, CvarFlags.ARCHIVE);
	cg_predict = com.AddCvar('cg_predict', 0, CvarFlags.ARCHIVE);
	cg_showmiss = com.AddCvar('cg_showmiss', 1, CvarFlags.ARCHIVE);

	cg_hud = ui.RegisterView('hud');

	cgs.processedSnapshotNum = serverMessageNum;
	cgs.gameState = cl.GetGameState();

	InitCommands();	
	cm.LoadMap(cgs.gameState['sv_mapname'], function () {
		r.LoadMap(cgs.gameState['sv_mapname'], function () {
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
	/*NewClientInfo(cg.clientNum);

	for (var i = 0; i < MAX_CLIENTS; i++) {
		if (cg.clientNum === i) {
			continue;
		}

		clientInfo = CG_ConfigString(CS_PLAYERS + i);

		if ( !clientInfo[0]) {
			continue;
		}

		NewClientInfo(i);
	}*/
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
	
	r.RenderScene(cg.refdef);
	
	UpdateFPS();
	ui.RenderView(cg_hud);

	if (cg.showScores === true) {
		var players = [
			{ name: 'Player 1' }
		];

		ui.RenderView('scoreboard');
	}
}

/**
 * CalcViewValues
 */
function CalcViewValues() {
	var ps = cg.predictedPlayerState;

	cg.refdef.x = 0;
	cg.refdef.y = 0;
	cg.refdef.width = viewport.width;
	cg.refdef.height = viewport.height;
	vec3.set(ps.origin, cg.refdef.vieworg);
	AnglesToAxis(ps.viewangles, cg.refdef.viewaxis);

	// Add error decay.
	// if (cg_errorDecay() > 0) {
	// 	var t = cg.time - cg.predictedErrorTime;
	// 	var f = (cg_errorDecay() - t) / cg_errorDecay();
	// 	if (f > 0 && f < 1) {
	// 		VectorMA( cg.refdef.vieworg, f, cg.predictedError, cg.refdef.vieworg );
	// 	} else {
	// 		cg.predictedErrorTime = 0;
	// 	}
	// }

	OffsetFirstPersonView();
	CalcFov();
}

/**
 * OffsetFirstPersonView
 */
function OffsetFirstPersonView() {
	// add view height
	cg.refdef.vieworg[2] += DEFAULT_VIEWHEIGHT;//ps.viewheight;
}

/**
 * CalcFov
 */
function CalcFov() {
	var fovX = 90;
	var x = cg.refdef.width / Math.tan(fovX / 360 * Math.PI);
	var fovY = Math.atan2(cg.refdef.height, x) * 360 / Math.PI;

	cg.refdef.fovX = fovX;
	cg.refdef.fovY = fovY;
}