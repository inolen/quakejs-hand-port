/*
 * main.js - Setup for Quake 3 WebGL demo
 */

/*
 * Copyright (c) 2011 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

requirejs(['server/sv', 'client/cl'], function (q_sv, q_cl) {
	function initEvents() {
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

	function init(canvas, gl) {
		initEvents();

		q_sv.Init();
		q_cl.Init(canvas, gl);

		function onRequestedFrame(timestamp) {
			window.requestAnimationFrame(onRequestedFrame, canvas);
			q_sv.Frame();
			q_cl.Frame();
		}
		window.requestAnimationFrame(onRequestedFrame, canvas);
	}

	// Utility function that tests a list of webgl contexts and returns when one can be created
	// Hopefully this future-proofs us a bit
	function getAvailableContext(canvas, contextList) {
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

	var GL_WINDOW_WIDTH = 854;
	var GL_WINDOW_HEIGHT = 480;

	function main() {
		var canvas = document.getElementById("viewport");

		// Set the canvas size
		canvas.width = GL_WINDOW_WIDTH;
		canvas.height = GL_WINDOW_HEIGHT;

		// Get the GL Context (try 'webgl' first, then fallback)
		var gl = getAvailableContext(canvas, ['webgl', 'experimental-webgl']);

		if (!gl) {
			document.getElementById('webgl-error').style.display = 'block';
		} else {
			init(canvas, gl);
		}
	}

	// Fire this once the page is loaded up
	window.addEventListener('load', main);
});