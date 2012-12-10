var readline = require('readline');

var assetsUrl;
var gamePort;

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'SYS:');
	Function.apply.call(console.log, console, args);
}

/**
 * error
 */
function error(str) {
	console.error(str);
	process.exit(0);
}

/**
 * Init
 */
function Init(inAssetsUrl, inGamePort) {
	assetsUrl = inAssetsUrl;
	gamePort = inGamePort;
	
	com.Init(GetExports(), true);
	NetCreateServer(gamePort);
	InitConsole();

	// Start main loop.
	setInterval(function () {
		com.Frame();
	}, 10);
}

/**
 * InitConsole
 */
function InitConsole() {
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.setPrompt('quakejs> ');
	rl.prompt();

	rl.on('line', function (line) {
		com.ExecuteBuffer(line);
		rl.prompt();
	}).on('close', function() {
		process.exit(0);
	});
}

/**
 * FullscreenChanged
 */
function FullscreenChanged() {
	error('Should not happen');
}

/**
 * GetGLContext
 */
function GetGLContext() {
	error('Should not happen');
}

/**
 * GetUIContext
 */
function GetUIContext() {
	error('Should not happen');
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

/**
 * GetExports
 */
function GetExports() {
	return {
		Error:              error,
		GetMilliseconds:    GetMilliseconds,
		ReadFile:           ReadFile,
		GetGLContext:       GetGLContext,
		GetUIContext:       GetUIContext,
		NetCreateServer:    NetCreateServer,
		NetConnectToServer: NetConnectToServer,
		NetSend:            NetSend,
		NetClose:           NetClose
	};
}