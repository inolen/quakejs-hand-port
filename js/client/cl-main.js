var canvas, gl;
var cl = new ClientLocals();
var clc = new ClientConnection();
var cls = new ClientStatic();
var cg1 = new ClientGame();
var commands = {};
var keys = {};

function Init(canvasCtx, glCtx) {
	// Due to circular dependencies, we need to re-require now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	com = require('common/com');
	sys = require('system/sys');

	canvas = canvasCtx;
	gl = glCtx;

	com.CvarAdd('cl_sensitivity', '2');

	InputInit();
	CmdInit();
	NetInit();
	cg.Init();
	re.Init(canvas, gl);

	cls.initialized = true;
}

function Frame(frameTime, msec) {
	if (!cls.initialized) {
		return;
	}

	cls.frameTime = frameTime;
	cls.frameDelta = msec;
	cls.realTime += msec;

	// TODO Do fancy stuff like Q3.
	cl.serverTime = cls.realTime;

	//
	NetFrame();

	SendCommand();
	CalcViewValues(cg1.refdef);
	re.RenderScene(cg1.refdef);
}

function ServerSpawning() {
	NetConnect('localhost', 9000);
}

function CalcViewValues(refdef) {
	refdef.x = 0;
	refdef.y = 0;
	refdef.width = canvas.width;
	refdef.height = canvas.height;
	refdef.vieworg = cg1.ps.origin;
	vec3.anglesToAxis(cl.viewangles, refdef.viewaxis);

	OffsetFirstPersonView(refdef);
	CalcFov(refdef);
}

function OffsetFirstPersonView(refdef) {
	// add view height
	refdef.vieworg[2] += DEFAULT_VIEWHEIGHT;//cg1.ps.viewheight;
}

function CalcFov(refdef) {
	var fovX = 90;
	var x = refdef.width / Math.tan(fovX / 360 * Math.PI);
	var fovY = Math.atan2(refdef.height, x) * 360 / Math.PI;

	refdef.fovX = fovX;
	refdef.fovY = fovY;
}