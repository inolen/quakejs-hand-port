var frameTime = lastFrameTime = Date.now();

function Init(canvas, gl) {
	cl.Init(canvas, gl);
	sv.Init(cl);

	// Provide the user a way to interface with the client.
	window.$ = function (cmd) {
		var args = Array.prototype.slice.call(arguments, 1);
		var callback;

		if ((callback = sv.CmdGet(cmd))) {
			callback.apply(sv, args);
		} else if ((callback = cl.CmdGet(cmd))) {
			callback.apply(cl, args);
		}
	};
}

function GetMsec() {
	lastFrameTime = frameTime;
	frameTime = Date.now();
	return frameTime - lastFrameTime;
}

function Frame() {
	var msec = GetMsec();
	//console.log(msec);
	sv.Frame(frameTime, msec);
	cl.Frame(frameTime, msec);
}