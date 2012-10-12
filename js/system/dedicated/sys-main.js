function Init() {
	NetCreateServer();
	com.Init(protectedExports, true);

	setInterval(function () {
		com.Frame();
	}, 10);
}

function FullscreenChanged() {
	throw new Error('Dedicated server');
}

function GetGameRenderContext() {
	throw new Error('Dedicated server');
}

function GetUIRenderContext() {
	throw new Error('Dedicated server');
}

function GetMilliseconds() {
	var time = process.hrtime();
	return time[0] * 1000 + parseInt(time[1] / 1000000);
}