var frameTime = lastFrameTime = sys.GetMilliseconds();

function Init(canvas, gl) {
	sv.Init();
	cl.Init(canvas, gl);

	// Provide the user a way to interface with the client.
	window.$ = function (cmd) {
		var args = Array.prototype.slice.call(arguments, 1);
		var callback;

		if ((callback = CmdGet(cmd))) {
			callback(args);
		}
	};
}

function GetMsec() {
	lastFrameTime = frameTime;
	frameTime = sys.GetMilliseconds();
	return frameTime - lastFrameTime;
}

function Frame() {
	var msec = GetMsec();
	//console.log(msec);
	sv.Frame(frameTime, msec);
	cl.Frame(frameTime, msec);
}