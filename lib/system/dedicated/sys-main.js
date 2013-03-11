var net = require('net');
var readline = require('readline');

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
	console.trace();
	console.error(str);
	process.exit(0);
}

/**
 * Init
 */
function Init() {
	log('Starting dedicated server for version', QS.GAME_VERSION);

	// Override gl-matrix's default array type.
	setMatrixArrayType(Array);

	InitConsole();

	// Initialize the game.
	COM.Init(GetExports(), true, function () {
		// Start main loop.
		setInterval(function () {
			COM.Frame();
		}, 0);
	});
}

/**
 * InitConsole
 */
function InitConsole() {
	// var rl = require('readline').createInterface({
	// 	input: process.stdin,
	// 	output: process.stdout
	// });

	// rl.on('line', function (line) {
	// 	// FIXME should queue an event, not directly execute.
	// 	COM.ExecuteBuffer(line);

	// 	rl.prompt(true);
	// }).on('close', function() {
	// 	process.exit(0);
	// });

	// rl.prompt(true);
}

/**
 * GetStartupCommands
 */
function GetStartupCommands() {
	var args = process.argv.slice(2);

	var cmds = [];

	args.forEach(function (arg) {
		if (arg.indexOf('--cmd') !== 0) {
			return;
		}

		var cmd = arg.substr(6);
		cmds.push(cmd);
	});

	return cmds;
}

/**
 * FullscreenChanged
 */
function FullscreenChanged() {
	error('FullscreenChanged: Should not happen');
}

/**
 * GetGLContext
 */
function GetGLContext() {
	error('GetGLContext: Should not happen');
}

/**
 * GetUIContext
 */
function GetUIContext() {
	error('GetUIContext: Should not happen');
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
		GetStartupCommands: GetStartupCommands,
		ReadFile:           ReadFile,
		WriteFile:          WriteFile,
		GetGLContext:       GetGLContext,
		GetUIContext:       GetUIContext,
		SockToString:       SockToString,
		NetListen:          NetListen,
		NetConnect:         NetConnect,
		NetSend:            NetSend,
		NetClose:           NetClose
	};
}