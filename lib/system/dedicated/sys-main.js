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

	// Initialize the game.
	COM.Init(GetExports(), true, function () {
		// Start main loop.
		setInterval(function () {
			COM.Frame();
		}, 10);
	});
}

/**
 * ExecuteStartupCvars
 */
function ExecuteStartupCvars(cvarsOnly, callback) {
	var args = process.argv.slice(2);

	var tasks = [];

	args.forEach(function (arg) {
		if (arg.indexOf('--cmd') !== 0) {
			return;
		}

		var buffer = arg.substr(6);
		tasks.push(function (cb) {
			COM.ExecuteBuffer(buffer, cb);
		});
	});

	// Execute tasks.
	async.series(tasks, function (err) {
		callback(err);
	});
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
		NetListen:          NetListen,
		NetConnect:         NetConnect,
		NetSend:            NetSend,
		NetClose:           NetClose
	};
}