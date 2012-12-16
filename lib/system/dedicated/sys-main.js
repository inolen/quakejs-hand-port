var net = require('net');
var readline = require('readline');

var assetsUrl;

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
function Init(inAssetsUrl, gamePort, rconPort) {
	assetsUrl = inAssetsUrl;

	// Override gl-matrix's default array type.
	setMatrixArrayType(Array);

	// Initialize the game.
	com.Init(GetExports(), true);
	NetCreateServer(gamePort);
	InitRemoteConsole(rconPort);

	// Start main loop.
	setInterval(function () {
		com.Frame();
	}, 10);
}

/**
 * InitRemoteConsole
 */
function InitRemoteConsole(rconPort) {
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
			com.ExecuteBuffer(line);
			rl.prompt();
		}).on('close', function() {
			console.log('Have a great day!');
		});
	});

	server.listen(rconPort, function() {
		log((new Date()), 'Rcon server is listening on port', rconPort);
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