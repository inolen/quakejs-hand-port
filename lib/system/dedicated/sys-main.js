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
		ExecuteCommandLine();

		// Start main loop.
		setInterval(function () {
			COM.Frame();
		}, 10);
	});
}

/**
 * CreateRemoteConsole
 */
function CreateRemoteConsole(port) {
	// Create small TCP server.
	var server = net.createServer(function (socket) {
		socket.write('Welcome!\n');

		// Create a readline interface bound to the connected
		// socket for stdio / stdout.
		var rl = readline.createInterface({
			input: socket,
			output: socket,
			terminal: true
		});

		rl.setPrompt('quakejs> ');
		rl.prompt();

		rl.on('line', function(line) {
			COM.ExecuteBuffer(line);
			rl.prompt();
		}).on('close', function() {
			console.log('Have a great day!');
		});
	});

	server.listen(port, function() {
		log((new Date()), 'Rcon server is listening on port', server.address().port);
	});
}

/**
 * ExecuteCommandLine
 *
 * TODO Perhaps use a proper command line parser if this needs to be expanded.
 */
function ExecuteCommandLine() {
	var args = process.argv.slice(2);

	for (var i = 0; i < args.length; i++) {
		var cmd = args[i];

		if (cmd.indexOf('--exec') === 0) {
			var buffer = cmd.substr(7);
			COM.ExecuteBuffer(buffer);
		}
	}
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
		Error:               error,
		GetMilliseconds:     GetMilliseconds,
		ReadFile:            ReadFile,
		WriteFile:           WriteFile,
		GetGLContext:        GetGLContext,
		GetUIContext:        GetUIContext,
		NetListen:           NetListen,
		NetConnect:          NetConnect,
		NetSend:             NetSend,
		NetClose:            NetClose,
		CreateRemoteConsole: CreateRemoteConsole
	};
}