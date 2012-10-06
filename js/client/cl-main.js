var gl;
var viewport;
var viewportUi;
var cl = new ClientLocals();
var clc = new ClientConnection();
var cls = new ClientStatic();
var commands = {};
var keys = {};

function Init(glCtx, viewportEl, viewportUiEl) {
	// Due to circular dependencies, we need to re-require now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	com = require('common/com');
	sys = require('system/sys');

	gl = glCtx;
	viewport = viewportEl;
	viewportUi = viewportUiEl;

	com.CvarAdd('cl_sensitivity', '2');

	InputInit();
	CmdInit();
	NetInit();
	re.Init(gl, viewportUi);

	clc.state = CA_LOADING;
	cg.Init(clExports, clc.serverMessageSequence/*, clc.lastExecutedServerCommand*/);
	// We will send a usercmd this frame, which will cause the
	// server to send us the first snapshot.
	clc.state = CA_PRIMED;

	cls.initialized = true;
}

function Frame(frameTime, msec) {
	if (!cls.initialized) {
		return;
	}

	cls.frameTime = frameTime;
	cls.frameDelta = msec;
	cls.realTime += msec;

	//
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

function ServerSpawning() {
	NetConnect('localhost', 9000);
}