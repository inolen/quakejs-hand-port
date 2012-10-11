var sys;

var cl;
var clc;
var cls = new ClientStatic();
var cl_sensitivity;
var cl_showTimeDelta;
var commands = {};
var keys = {};

function Init(sys_) {
	console.log('--------- CL Init ---------');

	sys = sys_;

	ClearState();
	clc = new ClientConnection();
	cls.realtime = 0;

	cl_sensitivity = cvar.AddCvar('cl_sensitivity', 2);
	cl_showTimeDelta = cvar.AddCvar('cl_showTimeDelta', 0);

	InputInit();
	CmdInit();
	NetInit();
	InitRenderer();

	cls.initialized = true;

	setTimeout(function () {
		//NetConnect('192.168.0.102', 9001);
		NetConnect('localhost', 9000);
	}, 100);
}

function ClearState() {
	console.log('Clearing client state');

	cl = new ClientLocals();
}

function InitCGame() {
	clc.state = ConnectionState.LOADING;
	cg.Init(sys, protectedExports, clc.serverMessageSequence);
	clc.state = ConnectionState.PRIMED;
}

function ShutdownCGame() {
	cg.Shutdown();
}

function InitRenderer() {
	re.Init(sys);
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
	cls.realTime += cls.frameDelta;

	NetFrame();
	SendCommand();

	// Decide on the serverTime to render.
	SetCGameTime();

	UpdateScreen();
}

function UpdateScreen() {
	switch (clc.state) {
		case ConnectionState.DISCONNECTED:
		case ConnectionState.CONNECTING:
		case ConnectionState.CHALLENGING:
		case ConnectionState.CONNECTED:
		case ConnectionState.LOADING:
		case ConnectionState.PRIMED:
			break;
		case ConnectionState.ACTIVE:
			cg.Frame(cl.serverTime);
			break;
	}
}

function MapLoading() {
	clc.state = ConnectionState.CONNECTED;
	//UpdateScreen();
}