function Init(cominterface) {	
	NetCreateServer();
	com.Init(sysinterface, true);

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

var timeBase;
function GetMilliseconds() {
	var time = process.hrtime();

	if (!timeBase) {
		timeBase = time[0] * 1000 + parseInt(time[1] / 1000000);
	}

	return (time[0] * 1000 + parseInt(time[1] / 1000000)) - timeBase;
}