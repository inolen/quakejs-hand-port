var gl;
var viewportFrame = document.getElementById('viewport-frame');
var viewport = document.getElementById('viewport');
var viewportUi = document.getElementById('viewport-ui');

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
	// TODO Provide some better UX in the case of a system error.
	throw new Error(str);
}

/**
 * Init
 */
function Init(expectedGameVersion) {
	// Sanity check the game version to make sure
	// our caching isn't completely fubar.
	if (expectedGameVersion !== undefined &&   // dev requests don't expect anything
		expectedGameVersion !== GAME_VERSION)  // production requests do
	{
		error('Requested game version \'' + expectedGameVersion + '\'' +
			' does not match received game version \'' + GAME_VERSION + '\'');
		return;
	}

	// Get the GL Context (try 'webgl' first, then fallback).
	gl = GetAvailableContext(viewport, ['webgl', 'experimental-webgl']);

	if (!gl) {
		document.getElementById('webgl-error').style.display = 'block';
		return;
	}

	// Set default size.
	viewport.width = viewportFrame.offsetWidth;
	viewport.height = viewportFrame.offsetHeight;

	// Handle fullscreen transition.
	document.addEventListener('fullscreenchange', ResizeViewport);
	window.addEventListener('resize', ResizeViewport);

	com.Init(GetExports(), false);
	InitInput();
	InitConsole();
	ExecuteQueryCommands();

	// Start main loop.
	function onRequestedFrame(timestamp) {
		window.requestAnimationFrame(onRequestedFrame, viewport);
		com.Frame();
	}
	window.requestAnimationFrame(onRequestedFrame, viewport);
}

/**
 * InitConsole
 */
function InitConsole() {
	window.$ = function (str) {
		com.ExecuteBuffer(str);
	};
}

/**
 * ExecuteQueryCommands
 */
function ExecuteQueryCommands() {
	var commands = GetQueryCommands();
	for (var i = 0; i < commands.length; i++) {
		com.ExecuteBuffer(commands[i]);
	}
}

/**
 * GetQueryCommands
 */
function GetQueryCommands() {
	var match,
		pl       = /\+/g,  // Regex for replacing addition symbol with a space
		search   = /([^&=]+)/g,
		decode   = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
		query    = window.location.search.substring(1),
		commands = [];

	while ((match = search.exec(query))) {
		commands.push(decode(match[1]));
	}

	return commands;
}

/**
 * GetAvailableContext
 *
 * Utility function that tests a list of webgl contexts and returns when one can be created.
 * Hopefully this future-proofs us a bit.
 */
function GetAvailableContext(canvas, contextList) {
	if (canvas.getContext) {
		for (var i = 0; i < contextList.length; ++i) {
			try {
				var context = canvas.getContext(contextList[i], { antialias: false });
				if( context !== null) {
					return context;
				}
			} catch (ex) { }
		}
	}
	return null;
}

/**
 * ResizeViewport
 */
function ResizeViewport() {
	if (document.fullscreenEnabled) {
		viewport.width = screen.width;
		viewport.height = screen.height;

		// Request automatically on fullscreen.
		viewportFrame.requestPointerLock();
	} else {
		viewport.width = viewportFrame.offsetWidth;
		viewport.height = viewportFrame.offsetHeight;
	}
}

/**
 * GetGLContext
 */
function GetGLContext() {
	return gl;
}

/**
 * GetUIContext
 */
function GetUIContext() {
	return viewportUi;
}

/**
 * GetMilliseconds
 */
function GetMilliseconds() {
	if (window.performance.now) {
		return parseInt(window.performance.now(), 10);
	} else if (window.performance.webkitNow) {
		return parseInt(window.performance.webkitNow(), 10);
	} else {
		return Date.now();
	}
}

/**
 * GetExports
 */
function GetExports() {
	return {
		Error:              error,
		GetMilliseconds:    GetMilliseconds,
		ReadFile:           ReadFile,
		WriteFile:          WriteFile,
		GetGLContext:       GetGLContext,
		GetUIContext:       GetUIContext,
		NetCreateServer:    NetCreateServer,
		NetConnectToServer: NetConnectToServer,
		NetSend:            NetSend,
		NetClose:           NetClose
	};
}