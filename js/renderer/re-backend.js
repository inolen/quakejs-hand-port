var tess;
var tessFns = {};
tessFns[SurfaceType.BAD] = TesselateFace;
tessFns[SurfaceType.FACE] = TesselateFace;
tessFns[SurfaceType.GRID] = TesselateFace;
tessFns[SurfaceType.BBOX] = TesselateBbox;
tessFns[SurfaceType.MD3] = TesselateMd3;

/**
 * RenderDrawSurfaces
 */
function RenderDrawSurfaces() {
	// Copy off frontend vars for us to work with.
	re.refdef.clone(backend.refdef);
	re.viewParms.clone(backend.viewParms);

	var world = re.world;
	var shaders = world.shaders;
	var refdef = backend.refdef;
	var parms = backend.viewParms;
	var drawSurfs = refdef.drawSurfs;

	if (!tess) {
		tess = new ShaderCommands();
	}

	gl.viewport(0, 0, parms.width, parms.height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.enable(gl.CULL_FACE);

	// Clear back buffer but not color buffer (we expect the entire scene to be overwritten)
	gl.depthMask(true);	
	gl.clear(gl.DEPTH_BUFFER_BIT);

	//
	var oldSort = -1;
	var oldShader = null;
	var oldEntityNum = -1;
	var modelMatrix;

	re.currentEntity = null;

	for (var i = 0; i < refdef.numDrawSurfs; i++) {
		var drawSurf = drawSurfs[i];
		var face = drawSurf.surface;

		//var fogNum = (drawSurf.sort >> QSORT_FOGNUM_SHIFT) & 31;
		var shader = re.sortedShaders[(drawSurf.sort >> QSORT_SHADERNUM_SHIFT) % MAX_SHADERS];
		var entityNum = (drawSurf.sort >> QSORT_ENTITYNUM_SHIFT) % MAX_ENTITIES;
		//var dlightMap = drawSurf.sort & 3;

		if (drawSurfs.sort === oldSort) {
			// Fast path, same as previous sort.
			tessFns[face.surfaceType](tess, face);
			continue;
		}
		oldSort = drawSurf.sort;

		// Change the tess parameters if needed.
		if (shader != oldShader || entityNum != oldEntityNum) {
			/*if (typeof(foobar) === 'undefined' || tess.numIndexes > foobar) {
				foobar = tess.numIndexes;
				console.log('max indexes', foobar);
			}

			if (typeof(foobar2) === 'undefined' || tess.numVertexes > foobar2) {
				foobar2 = tess.numVertexes;
				console.log('max vertexes', foobar2);
			}*/

			if (oldShader) {
				EndSurface();
			}

			BeginSurface(shader);
			oldShader = shader;
		}

		// Change the model view matrix for entity.
		if (oldEntityNum !== entityNum) {
			if (entityNum !== ENTITYNUM_WORLD) {
				re.currentEntity = refdef.refEntities[entityNum];
				RotateModelMatrixForEntity(re.currentEntity, backend.or);
			} else {
				parms.or.clone(backend.or);
			}

			oldEntityNum = entityNum;
		}

		// Add surface.
		tessFns[face.surfaceType](tess, face);
	}

	// Draw the contents of the last shader batch.
	if (oldShader) {
		EndSurface();
	}
}

/**
 * BeginSurface
 */
function BeginSurface(shader) {
	tess.numIndexes = 0;
	tess.numVertexes = 0;
	tess.shader = shader;
	tess.shaderTime = backend.refdef.time / 1000;

	tess.staticVertexBuffer = null;
	tess.staticIndexBuffer = null;
	tess.staticShaderMap = null;
}

/**
 * EndSurface
 */
function EndSurface() {
	var shader = tess.shader;

	var staticPass = tess.staticVertexBuffer && tess.staticIndexBuffer && tess.staticShaderMap;

	if (staticPass) {
		gl.bindBuffer(gl.ARRAY_BUFFER, tess.staticVertexBuffer);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tess.staticIndexBuffer);
	} else {
		// Create new views into the underlying ArrayBuffer that represent the
		// much smaller subset of data we need to actually send to the GPU.
		var vertexView = new Float32Array(tess.abvertexes, 0, tess.numVertexes * 14);
		var indexView = new Uint16Array(tess.abindexes, 0, tess.numIndexes);

		gl.bindBuffer(gl.ARRAY_BUFFER, tess.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertexView, gl.DYNAMIC_DRAW);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tess.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexView, gl.DYNAMIC_DRAW);
	}

	// Bind the surface shader
	SetShader(shader);
	
	for (var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];
		var program = stage.program;

		SetShaderStage(shader, stage, tess.shaderTime);

		// Set uniforms
		gl.uniformMatrix4fv(program.uniform.modelViewMat, false, backend.or.modelMatrix);
		gl.uniformMatrix4fv(program.uniform.projectionMat, false, backend.viewParms.projectionMatrix);

		// Setup vertex attributes
		gl.enableVertexAttribArray(program.attrib.position);
		gl.vertexAttribPointer(program.attrib.position, 3, gl.FLOAT, false, 56, 0);

		if (program.attrib.texCoord !== undefined) {
			gl.enableVertexAttribArray(program.attrib.texCoord);
			gl.vertexAttribPointer(program.attrib.texCoord, 2, gl.FLOAT, false, 56, 3*4);
		}

		if (program.attrib.lightCoord !== undefined) {
			gl.enableVertexAttribArray(program.attrib.lightCoord);
			gl.vertexAttribPointer(program.attrib.lightCoord, 2, gl.FLOAT, false, 56, 5*4);
		}

		if (program.attrib.normal !== undefined) {
			gl.enableVertexAttribArray(program.attrib.normal);
			gl.vertexAttribPointer(program.attrib.normal, 3, gl.FLOAT, false, 56, 7*4);
		}

		if (program.attrib.color !== undefined) {
			gl.enableVertexAttribArray(program.attrib.color);
			gl.vertexAttribPointer(program.attrib.color, 4, gl.FLOAT, false, 56, 10*4);
		}

		if (staticPass) {
			var entry = tess.staticShaderMap[shader.index];
			gl.drawElements(gl.TRIANGLES, entry.elementCount, gl.UNSIGNED_SHORT, entry.indexOffset);
		} else {
			gl.drawElements(shader.mode, tess.numIndexes, gl.UNSIGNED_SHORT, 0);
		}
	}
}