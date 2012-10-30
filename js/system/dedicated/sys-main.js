/**
 * Init
 */
function Init(cominterface) {	
	NetCreateServer();
	com.Init(sysinterface, true);

	setInterval(function () {
		com.Frame();
	}, 10);
}

/**
 * FullscreenChanged
 */
function FullscreenChanged() {
	throw new Error('Should not happen');
}

/**
 * GetGameRenderContext
 */
function GetGameRenderContext() {
	throw new Error('Should not happen');
}

/**
 * GetUIRenderContext
 */
function GetUIRenderContext() {
	throw new Error('Should not happen');
}

/**
 * GetMilliseconds
 */
var timeBase;
function GetMilliseconds() {
	var time = process.hrtime();

	if (!timeBase) {
		timeBase = time[0] * 1000 + parseInt(time[1] / 1000000, 10);
	}

	return (time[0] * 1000 + parseInt(time[1] / 1000000, 10)) - timeBase;
}