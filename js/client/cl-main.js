var gl;
var viewport;
var viewportUi;
var cl;
var clc;
var cls = new ClientStatic();
var cl_sensitivity;
var commands = {};
var keys = {};

function Init(glCtx, viewportEl, viewportUiEl) {
	console.log('--------- CL Init ---------');

	// Due to circular dependencies, we need to re-require now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	com = require('common/com');
	sys = require('system/sys');

	gl = glCtx;
	viewport = viewportEl;
	viewportUi = viewportUiEl;

	ClearState();
	clc = new ClientConnection();
	cls.realtime = 0;

	cl_sensitivity = com.CvarAdd('cl_sensitivity', '2');

	InputInit();
	CmdInit();
	NetInit();
	InitRenderer();

	cls.initialized = true;

	setTimeout(function () {
		NetConnect('localhost', 9000);
	}, 100);
}

function ClearState() {
	console.log('Clearing client state');

	cl = new ClientLocals();
}

function InitCGame() {
	clc.state = CA_LOADING;
	cg.Init(clExports, clc.serverMessageSequence);
	clc.state = CA_PRIMED;
}

function ShutdownCGame() {
	cg.Shutdown();
}

function InitRenderer() {
	re.Init(gl, viewportUi);
}

function ShutdownRenderer() {
	re.Shutdown();
}

function Frame(frameTime, msec) {
	cls.frameTime = frameTime;

	if (!cls.initialized) {
		return;
	}

	cls.frameDelta = msec;
	cls.realTime += msec;

	NetFrame();
	SendCommand();

	// Decide on the serverTime to render.
	SetCGameTime();

	UpdateScreen();
}

function UpdateScreen() {
	switch (clc.state) {
		case CA_DISCONNECTED:
		case CA_CONNECTING:
		case CA_CHALLENGING:
		case CA_CONNECTED:
		case CA_LOADING:
		case CA_PRIMED:
			break;
		case CA_ACTIVE:
			cg.Frame(cl.serverTime);
			break;
	}
}

function MapLoading() {
	clc.state = CA_CONNECTED;
	//UpdateScreen();
}