//var process = require('process');

function Init() {
	com.Init(protectedExports);

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
	//return process.hrtime() * 1000;
	return 0;
}