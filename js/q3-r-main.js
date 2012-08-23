/*
 * Q3RMain.js - Parses Quake 3 Maps (.bsp) for use in WebGL
 */

/*
 * Copyright (c) 2009 Brandon Jones
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

q3render_vertex_stride = 56;
q3render_sky_vertex_stride = 20;
q3render_base_folder = 'demo_baseq3';

var lightmapTexture;;
var glShaders = {};

var vertexBuffer = null;
var indexBuffer = null;
var indexCount = 0;

var skyboxMat = mat4.create();
var skyboxBuffer = null;
var skyboxIndexBuffer = null;
var skyboxIndexCount;

// Sorted draw elements
var skyShader = null;
var unshadedSurfaces = [];
var defaultSurfaces = [];
var modelSurfaces = [];
var effectSurfaces = [];

var startTime = new Date().getTime();

Q3RMain = {};

/*Q3RMain.prototype.playMusic = function(play) {
    if(!this.bgMusic) { return; }

    if(play) {
        this.bgMusic.play();
    } else {
        this.bgMusic.pause();
    }
};

Q3RMain.prototype.showLoadStatus = function() {
    // Yeah, this shouldn't be hardcoded in here
    var loading = document.getElementById('loading');
    loading.style.display = 'block';
};

Q3RMain.prototype.onLoadStatus = function(message) {
    // Yeah, this shouldn't be hardcoded in here
    var loading = document.getElementById('loading');
    loading.innerHTML = message;
};

Q3RMain.prototype.clearLoadStatus = function() {
    // Yeah, this shouldn't be hardcoded in here
    var loading = document.getElementById('loading');
    loading.style.display = 'none';
};*/

/*Q3RMain.prototype.processEntities = function(entities) {
    // Background music
    if(entities.worldspawn[0].music) {
        this.bgMusic = new Audio(q3render_base_folder + '/' + entities.worldspawn[0].music.replace('.wav', '.ogg'));
        // TODO: When can we change this to simply setting the 'loop' property?
        this.bgMusic.addEventListener('ended', function(){
            this.currentTime = 0;
        }, false);
        this.bgMusic.play();
    }

    // It would be relatively easy to do some ambient sound processing here, but I don't really feel like
    // HTML5 audio is up to the task. For example, lack of reliable gapless looping makes them sound terrible!
    // Look into this more when browsers get with the program.
    //var speakers = entities.target_speaker;
    //for(var i = 0; i < 1; ++i) {
    //    var speaker = speakers[i];
    //    q3renderCreateSpeaker(speaker);
    //}
};

function q3renderCreateSpeaker(speaker) {
    speaker.audio = new Audio(q3render_base_folder + '/' + speaker.noise.replace('.wav', '.ogg'));

    // TODO: When can we change this to simply setting the 'loop' property?
    speaker.audio.addEventListener('ended', function(){
        this.currentTime = 0;
    }, false);
    speaker.audio.play();
};*/

Q3RMain._buildShaders = function (gl, shaders) {
    for (var i = 0; i < shaders.length; i++) {
        var shader = shaders[i],
            glShader = Q3GLShader.build(gl, shader);
        glShaders[shader.name] = glShader;
    }
};

Q3RMain._buildLightmaps = function(gl, bsp) {
    var lightmaps = bsp.data.lightmaps;
    var gridSize = 2;
    while(gridSize * gridSize < lightmaps.length) gridSize *= 2;
    var textureSize = gridSize * LIGHTMAP_WIDTH;

    lightmapTexture = Q3GLShader.createSolidTexture(gl, [255,255,255,255]);

    gl.bindTexture(gl.TEXTURE_2D, lightmapTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize, textureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    for (var i = 0; i < lightmaps.length; ++i) {
        var lightmap = lightmaps[i];

        gl.texSubImage2D(
            gl.TEXTURE_2D, 0, lightmap.x, lightmap.y, lightmap.width, lightmap.height,
            gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(lightmap.bytes)
        );
    }

    gl.generateMipmap(gl.TEXTURE_2D);

    Q3GLShader.init(gl, lightmapTexture);
};

Q3RMain._buildWorldBuffers = function (gl, bsp) {
    var faces = bsp.data.faces,
        verts = bsp.data.verts,
        meshVerts = bsp.data.meshVerts,
        shaders = bsp.data.shaders,
        facesForShader = new Array(shaders.length);

    // Add faces to the appropriate texture face list.
    for (var i = 0; i < faces.length; ++i) {
        var face = faces[i];

        if (face.type !== 1 && face.type !==2 && face.type !== 3) {
            continue;
        }

        var shader = shaders[face.shader];
        if (!facesForShader[face.shader]) {
            facesForShader[face.shader] = [];
        }
        facesForShader[face.shader].push(face);
    }

    // Compile vert list
    var vertices = new Array(verts.length*10);
    var offset = 0;
    for (var i = 0; i < verts.length; ++i) {
        var vert = verts[i];

        vertices[offset++] = vert.pos[0];
        vertices[offset++] = vert.pos[1];
        vertices[offset++] = vert.pos[2];

        vertices[offset++] = vert.texCoord[0];
        vertices[offset++] = vert.texCoord[1];

        vertices[offset++] = vert.lmCoord[0];
        vertices[offset++] = vert.lmCoord[1];

        vertices[offset++] = vert.normal[0];
        vertices[offset++] = vert.normal[1];
        vertices[offset++] = vert.normal[2];

        vertices[offset++] = vert.color[0];
        vertices[offset++] = vert.color[1];
        vertices[offset++] = vert.color[2];
        vertices[offset++] = vert.color[3];
    }

    // Compile index list
    var indices = new Array();
    for(var i = 0; i < shaders.length; ++i) {
        var shader = shaders[i],
            shaderFaces = facesForShader[i];

        if (!shaderFaces || !shaderFaces.length) {
            continue;
        }

        shader.indexOffset = indices.length * 2; // Offset is in bytes

        for (var j = 0; j < shaderFaces.length; ++j) {
            var face = shaderFaces[j];
            face.indexOffset = indices.length * 2;
            for(var k = 0; k < face.meshVertCount; ++k) {
                indices.push(face.vertex + meshVerts[face.meshVert + k]);
            }
            shader.elementCount += face.meshVertCount;
        }
    }

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    indexCount = indices.length;
}

Q3RMain._buildSkyboxBuffers = function (gl) {
    var skyVerts = [
        -128, 128, 128, 0, 0,
        128, 128, 128, 1, 0,
        -128, -128, 128, 0, 1,
        128, -128, 128, 1, 1,

        -128, 128, 128, 0, 1,
        128, 128, 128, 1, 1,
        -128, 128, -128, 0, 0,
        128, 128, -128, 1, 0,

        -128, -128, 128, 0, 0,
        128, -128, 128, 1, 0,
        -128, -128, -128, 0, 1,
        128, -128, -128, 1, 1,

        128, 128, 128, 0, 0,
        128, -128, 128, 0, 1,
        128, 128, -128, 1, 0,
        128, -128, -128, 1, 1,

        -128, 128, 128, 1, 0,
        -128, -128, 128, 1, 1,
        -128, 128, -128, 0, 0,
        -128, -128, -128, 0, 1
    ];

    var skyIndices = [
        0, 1, 2,
        1, 2, 3,

        4, 5, 6,
        5, 6, 7,

        8, 9, 10,
        9, 10, 11,

        12, 13, 14,
        13, 14, 15,

        16, 17, 18,
        17, 18, 19
    ];

    skyboxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyVerts), gl.STATIC_DRAW);

    skyboxIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(skyIndices), gl.STATIC_DRAW);

    skyboxIndexCount = skyIndices.length;
};

Q3RMain._bindShaders = function (gl, bsp) {
    var shaders = bsp.data.shaders;

    for (var i = 0; i < shaders.length; ++i) {
        var shader = shaders[i];
        if (shader.elementCount === 0 || shader.glShader || shader.shaderName == 'noshader') {
            continue;
        }
        unshadedSurfaces.push(shader);
    }

    var interval = setInterval(function() {
        if (unshadedSurfaces.length === 0) { // Have we processed all surfaces?
            // Sort to ensure correct order of transparent objects
            effectSurfaces.sort(function(a, b) {
                var order = a.glShader.sort - b.glShader.sort;
                // TODO: Sort by state here to cut down on changes?
                return order; //(order == 0 ? 1 : order);
            });

            clearInterval(interval);
            return;
        }

        var shader = unshadedSurfaces.shift(),
            glShader = glShaders[shader.shaderName];

        if (glShader) {
            shader.glShader = glShader;

            if (glShader.sky) {
                skyShader = glShader; // Sky does not get pushed into effectSurfaces. It's a separate pass
            } else {
                effectSurfaces.push(shader);
            }

            Q3GLShader.loadShaderMaps(gl, shader, glShader);
        } else {
            shader.glShader = Q3GLShader.buildDefault(gl, shader);

            if (shader.geomType == 3) {
                shader.glShader.model = true;
                modelSurfaces.push(shader);
            } else {
                defaultSurfaces.push(shader);
            }
        }
    }, 10);
};

// Draw the map
Q3RMain._bindShaderAttribs = function(gl, shader, modelViewMat, projectionMat) {
    // Set uniforms
    gl.uniformMatrix4fv(shader.uniform.modelViewMat, false, modelViewMat);
    gl.uniformMatrix4fv(shader.uniform.projectionMat, false, projectionMat);

    // Setup vertex attributes
    gl.enableVertexAttribArray(shader.attrib.position);
    gl.vertexAttribPointer(shader.attrib.position, 3, gl.FLOAT, false, q3render_vertex_stride, 0);

    if(shader.attrib.texCoord !== undefined) {
        gl.enableVertexAttribArray(shader.attrib.texCoord);
        gl.vertexAttribPointer(shader.attrib.texCoord, 2, gl.FLOAT, false, q3render_vertex_stride, 3*4);
    }

    if(shader.attrib.lightCoord !== undefined) {
        gl.enableVertexAttribArray(shader.attrib.lightCoord);
        gl.vertexAttribPointer(shader.attrib.lightCoord, 2, gl.FLOAT, false, q3render_vertex_stride, 5*4);
    }

    if(shader.attrib.normal !== undefined) {
        gl.enableVertexAttribArray(shader.attrib.normal);
        gl.vertexAttribPointer(shader.attrib.normal, 3, gl.FLOAT, false, q3render_vertex_stride, 7*4);
    }

    if(shader.attrib.color !== undefined) {
        gl.enableVertexAttribArray(shader.attrib.color);
        gl.vertexAttribPointer(shader.attrib.color, 4, gl.FLOAT, false, q3render_vertex_stride, 10*4);
    }
}

Q3RMain._bindSkyAttribs = function(gl, shader, modelViewMat, projectionMat) {
    mat4.set(modelViewMat, skyboxMat);

    // Clear out the translation components
    skyboxMat[12] = 0;
    skyboxMat[13] = 0;
    skyboxMat[14] = 0;

    // Set uniforms
    gl.uniformMatrix4fv(shader.uniform.modelViewMat, false, skyboxMat);
    gl.uniformMatrix4fv(shader.uniform.projectionMat, false, projectionMat);

    // Setup vertex attributes
    gl.enableVertexAttribArray(shader.attrib.position);
    gl.vertexAttribPointer(shader.attrib.position, 3, gl.FLOAT, false, q3render_sky_vertex_stride, 0);

    if(shader.attrib.texCoord !== undefined) {
        gl.enableVertexAttribArray(shader.attrib.texCoord);
        gl.vertexAttribPointer(shader.attrib.texCoord, 2, gl.FLOAT, false, q3render_sky_vertex_stride, 3*4);
    }
};

Q3RMain.loadShaders = function(gl, sources) {
    var self = this;

    for (var i = 0; i < sources.length; ++i) {
        sources[i] = q3render_base_folder + '/' + sources[i];
    }

    Q3Shader.loadList(sources, function (shaders) {
        self._buildShaders(gl, shaders);
    });
};

Q3RMain.loadMap = function (gl, mapName, callback) {
    var self = this,
        bsp = new Q3Bsp();

    bsp.load('maps/' + mapName +'.bsp', function () {
        self._buildLightmaps(gl, bsp);
        self._buildSkyboxBuffers(gl);
        self._buildWorldBuffers(gl, bsp);
        self._bindShaders(gl, bsp);
        //this.clearLoadStatus();

        callback(bsp);
    });
}

Q3RMain.updateVisibility = function(pos) {
    this.buildVisibleList(Q3RMain.getLeaf(pos));
};

Q3RMain.setVisibility = function(visibilityList) {
    if(this.surfaces.length > 0) {
        for(var i = 0; i < this.surfaces.length; ++i) {
            //this.surfaces[i].visible = (visibilityList[i] === true);
        }
    }
};

Q3RMain.draw = function(gl, cameraPos, modelViewMat, projectionMat) {
    if (vertexBuffer === null || indexBuffer === null) { return; } // Not ready to draw yet

    // Seconds passed since map was initialized
    var time = (new Date().getTime() - startTime)/1000.0;
    var i = 0;

    // If we have a skybox, render it first
    if (skyShader) {
        // SkyBox Buffers
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);

        // Render Skybox
        if(Q3GLShader.setShader(gl, skyShader)) {
            for(var j = 0; j < skyShader.stages.length; j++) {
                var stage = skyShader.stages[j];

                var shaderProgram = Q3GLShader.setShaderStage(gl, skyShader, stage, time);
                if(!shaderProgram) { continue; }
                this._bindSkyAttribs(gl, shaderProgram, modelViewMat, projectionMat);

                // Draw all geometry that uses this textures
                gl.drawElements(gl.TRIANGLES, skyboxIndexCount, gl.UNSIGNED_SHORT, 0);
            }
        }
    }

    // Map Geometry buffers
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // Default shader surfaces (can bind shader once and draw all of them very quickly)
    if (defaultSurfaces.length > 0 || unshadedSurfaces.length > 0) {
        // Setup State
        var defaultShader = Q3GLShader.defaultShader;
        Q3GLShader.setShader(gl, defaultShader);

        var shaderProgram = Q3GLShader.setShaderStage(gl, defaultShader, defaultShader.stages[0], time);
        this._bindShaderAttribs(gl, shaderProgram, modelViewMat, projectionMat);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, Q3GLShader.defaultTexture);
        for (i = 0; i < unshadedSurfaces.length; ++i) {
            var shader = unshadedSurfaces[i];
            gl.drawElements(gl.TRIANGLES, shader.elementCount, gl.UNSIGNED_SHORT, shader.indexOffset);
        }
        for (i = 0; i < defaultSurfaces.length; ++i) {
            var shader = defaultSurfaces[i];
            var stage = shader.glShader.stages[0];
            gl.bindTexture(gl.TEXTURE_2D, stage.texture);
            gl.drawElements(gl.TRIANGLES, shader.elementCount, gl.UNSIGNED_SHORT, shader.indexOffset);
        }
    }

    // Model shader surfaces (can bind shader once and draw all of them very quickly)
    if (modelSurfaces.length > 0) {
        // Setup State
        var glShader = modelSurfaces[0].glShader;
        Q3GLShader.setShader(gl, glShader);

        var shaderProgram = Q3GLShader.setShaderStage(gl, glShader, glShader.stages[0], time);
        this._bindShaderAttribs(gl, shaderProgram, modelViewMat, projectionMat);

        gl.activeTexture(gl.TEXTURE0);
        for(i = 0; i < modelSurfaces.length; i++) {
            var shader = modelSurfaces[i],
                stage = shader.glShader.stages[0];

            gl.bindTexture(gl.TEXTURE_2D, stage.texture);
            gl.drawElements(gl.TRIANGLES, shader.elementCount, gl.UNSIGNED_SHORT, shader.indexOffset);
        }
    }

    // Effect surfaces
    for (var i = 0; i < effectSurfaces.length; i++) {
        var shader = effectSurfaces[i];
        if (shader.elementCount == 0 || shader.visible !== true) { continue; }

        // Bind the surface shader
        var glShader = shader.glShader;
        if (!Q3GLShader.setShader(gl, glShader)) { continue; }

        for (var j = 0; j < glShader.stages.length; j++) {
            var shaderProgram = Q3GLShader.setShaderStage(gl, glShader, glShader.stages[j], time);
            if (!shaderProgram) { continue; }
            this._bindShaderAttribs(gl, shaderProgram, modelViewMat, projectionMat);

            // Draw all geometry that uses this textures
            gl.drawElements(gl.TRIANGLES, shader.elementCount, gl.UNSIGNED_SHORT, shader.indexOffset);
        }
    }
};













//
// Visibility Checking
//

/*var lastLeaf = -1;

Q3RMain.prototype.checkVis = function(visCluster, testCluster) {
    if(visCluster == testCluster || visCluster == -1) { return true; }
    var i = (visCluster * this.bspTree.visSize) + (testCluster >> 3);
    var visSet = this.bspTree.visBuffer[i];
    return (visSet & (1 << (testCluster & 7)) !== 0);
};

Q3RMain.prototype.getLeaf = function(pos) {
    var index = 0;

    var node = null;
    var plane = null;
    var distance = 0;

    while (index >= 0) {
        node = this.bspTree.nodes[index];
        plane = this.bspTree.planes[node.plane];
        distance = vec3.dot(plane.normal, pos) - plane.distance;

        if (distance >= 0) {
            index = node.children[0];
        } else {
            index = node.children[1];
        }
    }

    return -(index+1);
};

Q3RMain.prototype.buildVisibleList = function(leafIndex) {
    // Determine visible faces
    if(leafIndex == lastLeaf) { return; }
    lastLeaf = leafIndex;

    var curLeaf = this.bspTree.leaves[leafIndex];

    var visibleShaders = new Array(shaders.length);

    for(var i = 0; i < this.bspTree.leaves.length; ++i) {
        var leaf = this.bspTree.leaves[i];
        if(Q3RMain.checkVis(curLeaf.cluster, leaf.cluster)) {
            for(var j = 0; j < leaf.leafFaceCount; ++j) {
                var face = faces[this.bspTree.leafFaces[[j + leaf.leafFace]]];
                if(face) {
                    visibleShaders[face.shader] = true;
                }
            }
        }
    }

    var ar = new Array(this.bspTree.visSize);

    for(var i = 0; i < this.bspTree.visSize; ++i) {
        ar[i] = this.bspTree.visBuffer[(curLeaf.cluster * this.bspTree.visSize) + i];
    }

    this.setVisibility(msg.data.visibleShaders);
};*/