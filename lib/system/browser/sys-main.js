var root;
var viewportFrame;
var viewport;
var viewportUi;
var gl;

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
	// While this shouldn't happen, remove any old errors first.
	var errorWrapper = document.getElementById('error-wrapper');
	if (errorWrapper) {
		root.removeChild(errorWrapper);
	}

	// Create wrapper.
	errorWrapper = document.createElement('div');
	errorWrapper.setAttribute('id', 'error-wrapper');

	var error = document.createElement('div');
	error.setAttribute('id', 'error-fatal');
	error.innerHTML = str;
	errorWrapper.appendChild(error);

	// For fatal errors, remove everything.
	root.innerHTML = '';
	root.appendChild(errorWrapper);

	// Break pointer lock so the user can interact with the dialog.
	document.exitPointerLock();

	// Throw an exception to break out of the current frame.
	throw new Error(str);
}

/**
 * Init
 */
function Init(inRoot, expectedGameVersion) {
	// Sanity check the game version to make sure our caching
	// isn't completely fubar.
	if (expectedGameVersion !== undefined &&     // dev requests don't expect anything
		expectedGameVersion !== QS.GAME_VERSION) {  // production requests do
		error('Requested game version \'' + expectedGameVersion + '\'' +
			' does not match received game version \'' + QS.GAME_VERSION + '\'');
		return;
	}

	root = inRoot;

	// Override gl-matrix's default array type.
	setMatrixArrayType(Array);

	// Initialize DOM elements.
	InitInterface();

	// Get the GL Context (try 'webgl' first, then fallback).
	gl = GetAvailableContext(viewport, ['webgl', 'experimental-webgl']);
	if (!gl) {
		error('Sorry, but your browser does not support WebGL or does not have it enabled. ' +
	          'To get a WebGL-enabled browser, please see:<br /><br />' +
	          '<a href="http://get.webgl.org/" target="_blank">' +
	              'http://get.webgl.org/' +
	          '</a>');
		return;
	}

	InitInput();
	InitConsole();

	// Initialize the actual game.
	COM.Init(GetExports(), false, function () {
		// Start main loop.
		function onRequestedFrame(timestamp) {
			window.requestAnimationFrame(onRequestedFrame, viewport);
			COM.Frame();
		}
		window.requestAnimationFrame(onRequestedFrame, viewport);
	});
}

/**
 * InitInterface
 */
function InitInterface() {
	root.innerHTML = '<div id="viewport-frame">' +
	                     '<canvas id="viewport"></canvas>' +
	                     '<div id="viewport-ui"></div>' +
	                 '</div>';

	viewportFrame = document.getElementById('viewport-frame');
	viewport = document.getElementById('viewport');
	viewportUi = document.getElementById('viewport-ui');

	// Embed our CSS.
	var style = document.createElement('style');
	style.setAttribute('type', 'text/css');
	style.innerHTML = css;
	document.getElementsByTagName('head')[0].appendChild(style);

	// Handle fullscreen transition.
	document.addEventListener('fullscreenchange', ResizeViewport);
	window.addEventListener('resize', ResizeViewport);

	// Go ahead and set the default viewport size. Wait a frame though
	// to allow the CSS to load and set viewport's frame size.
	setTimeout(function () {
		ResizeViewport();
	}, 0);

}

/**
 * InitConsole
 */
function InitConsole() {
	window.$ = function (str) {
		COM.ExecuteBuffer(str);
	};
}

/**
 * ExecuteCommandLine
 */
function ExecuteCommandLine(callback) {
	var args = GetQueryArguments();

	var tasks = [];

	Object.keys(args).forEach(function (arg) {
		if (arg !== 'cmd') {
			return;
		}

		tasks.push(function (cb) {
			COM.ExecuteBuffer(args[arg], cb);
		});
	});

	// Execute tasks.
	async.series(tasks, function (err) {
		callback(err);
	});
}

/**
 * GetQueryArguments
 */
function GetQueryArguments() {
	var match;
	var pl     = /\+/g;  // Regex for replacing addition symbol with a space
	var search = /([^&=]+)=?([^&]*)/g;
	var decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };
	var query  = window.location.search.substring(1);

	var args = {};

	while (match = search.exec(query)) {
		args[decode(match[1])] = decode(match[2]);
	}

	return args;
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
	if (document.fullscreenElement) {
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
 * GetViewportWidth
 */
function GetViewportWidth() {
	return viewport.width;
}

/**
 * GetViewportHeight
 */
function GetViewportHeight() {
	return viewport.height;
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
var loadTime = Date.now();
function GetMilliseconds() {
	if (window.performance.now) {
		return parseInt(window.performance.now(), 10);
	} else if (window.performance.webkitNow) {
		return parseInt(window.performance.webkitNow(), 10);
	} else {
		return Date.now() - loadTime;
	}
}

/**
 * GetExports
 */
function GetExports() {
	return {
		Error:               error,
		GetMilliseconds:     GetMilliseconds,
		ExecuteCommandLine:  ExecuteCommandLine,
		CancelFileCallbacks: CancelFileCallbacks,
		ReadFile:            ReadFile,
		WriteFile:           WriteFile,
		GetViewportWidth:    GetViewportWidth,
		GetViewportHeight:   GetViewportHeight,
		GetGLContext:        GetGLContext,
		GetUIContext:        GetUIContext,
		NetListen:           NetListen,
		NetConnect:          NetConnect,
		NetSend:             NetSend,
		NetClose:            NetClose
	};
}