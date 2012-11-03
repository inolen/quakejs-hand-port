var gl;
var viewportFrame = document.getElementById('viewport-frame');
var viewport = document.getElementById('viewport');
var viewportUi = document.getElementById('viewport-ui');

/**
 * Init
 */
function Init() {
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

	InputInit();
	com.Init(sysinterface, false);

	// Provide the user a way to interface with the client.
	window.$ = function (str) {
		com.ExecuteCmdText(str);
	};

	function onRequestedFrame(timestamp) {
		window.requestAnimationFrame(onRequestedFrame, viewport);
		com.Frame();
	}

	window.requestAnimationFrame(onRequestedFrame, viewport);
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