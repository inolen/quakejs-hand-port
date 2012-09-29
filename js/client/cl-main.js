var canvas, gl;
var cl = new ClientLocals();
var clc = new ClientConnection();
var cls = new ClientStatic();
var cg = new ClientGame();
var commands = {};
var keys = {};

function Init(canvasCtx, glCtx) {
	// Due to sv/cl/com having a circular dependency on eachother,
	// we need to re-grab com now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	com = require('common/com');

	canvas = canvasCtx;
	gl = glCtx;

	com.CvarAdd('cl_sensitivity', '2');

	InputInit();
	CmdInit();
	NetInit();
	re.Init(canvas, gl);

	// Handle fullscreen transition.
	var defaultWidth = canvas.width,
		defaultHeight = canvas.height;

	document.addEventListener('fullscreenchange', function() {
		if (document.fullscreenEnabled) {
			canvas.width = screen.width;
			canvas.height = screen.height;
			// Request automatically on fullscreen.
			canvas.requestPointLock();
		} else {
			canvas.width = defaultWidth;
			canvas.height = defaultHeight;
		}
	}, false);

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
	CalcViewValues(cg.refdef);
	re.RenderScene(cg.refdef);
}

function ServerSpawning() {
	NetConnect('localhost', 9000);
}

function CalcViewValues(refdef) {
	refdef.x = 0;
	refdef.y = 0;
	refdef.width = canvas.width;
	refdef.height = canvas.height;
	refdef.fov = 45;
	refdef.vieworg = cg.ps.origin;
	vec3.anglesToAxis(cl.viewangles, refdef.viewaxis);

	OffsetFirstPersonView(refdef);
}

function OffsetFirstPersonView(refdef) {
	// add view height
	refdef.vieworg[2] += DEFAULT_VIEWHEIGHT;//cg.ps.viewheight;
}