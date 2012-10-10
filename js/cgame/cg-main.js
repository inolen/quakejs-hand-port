var sys;
var cl;

var cg;
var cgs;
var cg_errordecay;
var cg_showmiss;

function Init(sys_, cl_, serverMessageNum) {
	console.log('--------- CG Init ---------');

	sys = sys_;
	cl = cl_;

	cg = new ClientGame();
	cgs = new ClientGameStatic();

	cg_errordecay = cvar.AddCvar('cg_errordecay', 100);
	cg_predict = cvar.AddCvar('cg_predict', 0);
	cg_showmiss = cvar.AddCvar('cg_showmiss', 1);

	cgs.processedSnapshotNum = serverMessageNum;
	cgs.gameState = cl.GetGameState();
	cl.LoadClipMap(cgs.gameState['sv_mapname'], function () {
		cl.LoadRenderMap(cgs.gameState['sv_mapname'], function () {
			cg.initialized = true;
		});
	});
}

function Shutdown() {
	console.log('--------- CG Shutdown ---------');
}

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
	
	cl.RenderScene(cg.refdef);
	DrawFPS();
}

function CalcViewValues() {
	var ps = cg.predictedPlayerState;

	cg.refdef.x = 0;
	cg.refdef.y = 0;
	cg.refdef.width = viewport.width;
	cg.refdef.height = viewport.height;
	vec3.set(ps.origin, cg.refdef.vieworg);
	vec3.anglesToAxis(ps.viewangles, cg.refdef.viewaxis);

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

function OffsetFirstPersonView() {
	// add view height
	cg.refdef.vieworg[2] += DEFAULT_VIEWHEIGHT;//ps.viewheight;
}

function CalcFov() {
	var fovX = 90;
	var x = cg.refdef.width / Math.tan(fovX / 360 * Math.PI);
	var fovY = Math.atan2(cg.refdef.height, x) * 360 / Math.PI;

	cg.refdef.fovX = fovX;
	cg.refdef.fovY = fovY;
}