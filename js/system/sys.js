define('system/sys', ['common/com'], function (com) {
	var viewportFrame = document.getElementById('viewport-frame');
	var viewport = document.getElementById('viewport');
	var viewportUi = document.getElementById('viewport-ui');

	function Init() {
		// Due to circular dependencies, we need to re-require com now that we're all loaded.
		// http://requirejs.org/docs/api.html#circular
		com = require('common/com');

		// Handle fullscreen transition;
		document.addEventListener('fullscreenchange', function() {
			if (document.fullscreenEnabled) {
				viewport.width = screen.width;
				viewport.height = screen.height;

				// Request automatically on fullscreen.
				viewport.requestPointerLock();
			} else {
				viewport.width = viewportFrame.offsetWidth;
				viewport.height = viewportFrame.offsetHeight;
			}
		}, false);

		// Set default size.
		viewport.width = viewportFrame.offsetWidth;
		viewport.height = viewportFrame.offsetHeight;

		// Get the GL Context (try 'webgl' first, then fallback)
		var gl = GetAvailableContext(viewport, ['webgl', 'experimental-webgl']);

		if (!gl) {
			document.getElementById('webgl-error').style.display = 'block';
			return;
		}

		// Main.
		com.Init(gl, viewport, viewportUi);

		function onRequestedFrame(timestamp) {
			window.requestAnimationFrame(onRequestedFrame, viewport);
			com.Frame();
		}

		window.requestAnimationFrame(onRequestedFrame, viewport);
	}

	// Utility function that tests a list of webgl contexts and returns when one can be created
	// Hopefully this future-proofs us a bit
	function GetAvailableContext(canvas, contextList) {
		if (canvas.getContext) {
			for (var i = 0; i < contextList.length; ++i) {
				try {
					var context = canvas.getContext(contextList[i], { antialias:false });
					if(context !== null) {
						return context;
					}
				} catch (ex) { }
			}
		}
		return null;
	}

	function RequestFullscreen() {
		viewportFrame.requestFullscreen();
	}

	function GetMilliseconds() {
		if (window.performance.now) {
			return parseInt(window.performance.now());
		} else if (window.performance.webkitNow) {
			return parseInt(window.performance.webkitNow());
		} else {
			return Date.now();
		}
	}

	return {
		Init: Init,
		RequestFullscreen: RequestFullscreen,
		GetMilliseconds: GetMilliseconds
	};
});
