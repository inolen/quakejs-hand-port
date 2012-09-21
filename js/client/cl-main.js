var canvas, gl;
var frameTime, oldFrameTime;
var frameDelta = 0;
var cla = Object.create(ClientActive);
var clc = Object.create(ClientConnection);
var pm = Object.create(Pmove);
var commands = {};
var keys = {};

function Init(canvasCtx, glCtx) {
	canvas = canvasCtx;
	gl = glCtx;
	frameTime = oldFrameTime = Date().now;

	InputInit();
	CmdInit();
	NetInit();
	re.Init(canvas, gl);
}

function Frame() {
	oldFrameTime = frameTime;
	frameTime = Date().now;
	frameDelta = frameTime - oldFrameTime;

	//
	NetFrame();

	var refdef = Object.create(ReRefDef);
	SendCommand();
	CalcViewValues(refdef);
	re.RenderScene(refdef);
}

function MapLoading() {
	NetConnect('localhost', 9000);
}

function CalcViewValues(refdef) {
	refdef.x = 0;
	refdef.y = 0;
	refdef.width = canvas.width;
	refdef.height = canvas.height;
	refdef.fov = 45;
	refdef.origin = /*pm.ps.origin ||*/ [0, 0, 0];
	refdef.angles = cla.viewangles;
}