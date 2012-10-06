var cl;
var cg = new ClientGame();
var cgs = new ClientGameStatic();

function Init(cl_interface, serverMessageNum) {
	// Due to circular dependencies, we need to re-require now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	sys = require('system/sys');

	cl = cl_interface;

	cgs.processedSnapshotNum = serverMessageNum;
}

function Frame(serverTime) {
	cg.time = serverTime;
	
	ProcessSnapshots(); 

	if (!cg.snap/* || (cg.snap->snapFlags & SNAPFLAG_NOT_ACTIVE)*/) {
		//CG_DrawInformation();
		return;
	}

	//console.log('Frame', cg.snap.ps.origin[2]);

	PredictPlayerState();
	
	CalcViewValues();
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