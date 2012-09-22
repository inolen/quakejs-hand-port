var canvas, gl;
var frameTime, oldFrameTime;
var frameDelta = 0;
var cla = new ClientActive();
var clc = new ClientConnection();
var cg = new ClientGame();
var commands = {};
var keys = {};

function Init(canvasCtx, glCtx) {
	canvas = canvasCtx;
	gl = glCtx;
	frameTime = oldFrameTime = Date.now();

	InputInit();
	CmdInit();
	NetInit();
	re.Init(canvas, gl);
}

function Frame() {
	oldFrameTime = frameTime;
	frameTime = Date.now();
	frameDelta = frameTime - oldFrameTime;

	//
	NetFrame();

	SendCommand();
	CalcViewValues(cg.refdef);
	re.RenderScene(cg.refdef);
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
	refdef.origin = cg.ps.origin;
	vec3.anglesToAxis(cla.viewangles, refdef.viewaxis);
}