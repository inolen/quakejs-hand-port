requirejs(['common/com'], function (com) {
	var GL_WINDOW_WIDTH = 854;
	var GL_WINDOW_HEIGHT = 480;

	function InitEvents() {
		var viewport = document.getElementById('viewport');
		var viewportFrame = document.getElementById('viewport-frame');

		// Request to lock the mouse cursor when the user clicks on the canvas.
		viewport.addEventListener('click', function(event) {
			viewport.requestPointerLock();
		}, false);

		// Handle fullscreen transition.
		document.addEventListener('fullscreenchange', function() {
			if (document.fullscreenEnabled) {
				canvas.width = screen.width;
				canvas.height = screen.height;
				viewportFrame.requestPointerLock(); // Attempt to lock the mouse automatically on fullscreen
			} else {
				canvas.width = GL_WINDOW_WIDTH;
				canvas.height = GL_WINDOW_HEIGHT;
			}
			gl.viewport(0, 0, canvas.width, canvas.height);
			mat4.perspective(45.0, canvas.width/canvas.height, 1.0, 4096.0, projectionMat);
		}, false);
	}

	function Init(canvas, gl) {
		com.Init(canvas, gl);

		// Main loop.
		function onRequestedFrame(timestamp) {
			window.requestAnimationFrame(onRequestedFrame, canvas);
			com.Frame();
		}
		window.requestAnimationFrame(onRequestedFrame, canvas);
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

	function main() {
		var canvas = document.getElementById("viewport");

		// Set the canvas size
		canvas.width = GL_WINDOW_WIDTH;
		canvas.height = GL_WINDOW_HEIGHT;

		// Get the GL Context (try 'webgl' first, then fallback)
		var gl = GetAvailableContext(canvas, ['webgl', 'experimental-webgl']);

		if (!gl) {
			document.getElementById('webgl-error').style.display = 'block';
		} else {
			InitEvents();
			Init(canvas, gl);
		}
	}

	// Fire this once the page is loaded up
	window.addEventListener('load', main);
});