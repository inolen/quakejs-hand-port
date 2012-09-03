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

requirejs(['common/com'], function (q_com) {

// Set up basic GL State up front
function init(canvas, gl) {
    q_com.Init(canvas, gl);
}

var lastIndex = 0;
// "Respawns" the player at a specific spawn point. Passing -1 will move the player to the next spawn point.
function respawnPlayer(index) {
    var entities = bsp.data.entities;

    if (index == -1) {
        index = (lastIndex+1) % entities.info_player_deathmatch.length;
    }
    lastIndex = index;

    var spawnPoint = entities.info_player_deathmatch[index];

    /*playerMover.position = [
        spawnPoint.origin[0],
        spawnPoint.origin[1],
        spawnPoint.origin[2]+30 // Start a little ways above the floor
    ];
    playerMover.velocity = [0,0,0];*/
}

// Set up event handling
function initEvents() {
    var viewport = document.getElementById('viewport');
    var viewportFrame = document.getElementById('viewport-frame');

    viewport.addEventListener("click", function(event) {
        viewport.requestPointerLock();
    }, false);
}

// Utility function that tests a list of webgl contexts and returns when one can be created
// Hopefully this future-proofs us a bit
function getAvailableContext(canvas, contextList) {
    if (canvas.getContext) {
        for(var i = 0; i < contextList.length; ++i) {
            try {
                var context = canvas.getContext(contextList[i], { antialias:false });
                if(context !== null)
                    return context;
            } catch(ex) { }
        }
    }
    return null;
}

function renderLoop(canvas, gl) {
    function onRequestedFrame(timestamp) {
        //console.log('in render loop');
        window.requestAnimationFrame(onRequestedFrame, canvas);
        q_com.Frame();
    }
    window.requestAnimationFrame(onRequestedFrame, canvas);
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
        initEvents();
        init(canvas, gl);
        renderLoop(gl, canvas);
    }

    /*if (map) {
        map.playMusic(playMusic.checked);
    }*/

    // Handle fullscreen transition
    var viewportFrame = document.getElementById("viewport-frame");
    document.addEventListener("fullscreenchange", function() {
        if(document.fullscreenEnabled) {
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
window.addEventListener("load", main); // Fire this once the page is loaded up

});