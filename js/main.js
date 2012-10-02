requirejs(['common/com'], function (com) {
	var GL_WINDOW_WIDTH = 1024;
	var GL_WINDOW_HEIGHT = 576;

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
		var canvas = document.getElementById('viewport');

		// Set the canvas size
		canvas.width = GL_WINDOW_WIDTH;
		canvas.height = GL_WINDOW_HEIGHT;

		// Get the GL Context (try 'webgl' first, then fallback)
		var gl = GetAvailableContext(canvas, ['webgl', 'experimental-webgl']);

		if (!gl) {
			document.getElementById('webgl-error').style.display = 'block';
		} else {
			Init(canvas, gl);
		}
	}

	// Fire this once the page is loaded up
	window.addEventListener('load', main);
});