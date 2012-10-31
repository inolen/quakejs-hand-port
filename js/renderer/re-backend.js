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
				re.currentEntity = null;
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
	tess.shader = shader;
	tess.shaderTime = backend.refdef.time / 1000;
	tess.numVertexes = 0;
	tess.activeVertexBuffer = tess.vertexBuffer;
	tess.activeIndexBuffer = tess.indexBuffer;
	tess.numIndexes = 0;
	tess.indexOffset = 0;
}

/**
 * EndSurface
 */
function EndSurface() {
	var shader = tess.shader;

	// If we're using the scratch buffers.
	if (tess.activeVertexBuffer === tess.vertexBuffer &&
		tess.activeIndexBuffer === tess.indexBuffer) {
		// Create new views into the underlying ArrayBuffer that represent the
		// much smaller subset of data we need to actually send to the GPU.
		var vertexView = new Float32Array(tess.abvertexes, 0, tess.numVertexes * (tess.stride/4));
		var indexView = new Uint16Array(tess.abindexes, 0, tess.numIndexes);

		gl.bindBuffer(gl.ARRAY_BUFFER, tess.activeVertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertexView, gl.DYNAMIC_DRAW);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tess.activeIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexView, gl.DYNAMIC_DRAW);
	} else {
		gl.bindBuffer(gl.ARRAY_BUFFER, tess.activeVertexBuffer);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tess.activeIndexBuffer);
	}

	// Bind the surface shader
	SetShader(shader);
	
	for (var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];

		SetShaderStage(shader, stage, tess.stride, tess.attrs);

		gl.drawElements(shader.mode, tess.numIndexes, gl.UNSIGNED_SHORT, tess.indexOffset);
	}
}

/**
 * SetShader
 */
function SetShader(shader) {
	if (shader.cull) {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(shader.cull);
	} else {
		gl.disable(gl.CULL_FACE);
	}
}

/**
 * SetShaderStage
 */
function SetShaderStage(shader, stage, stride, attrs) {
	var program = stage.program;

	// Sanity check after being burned so many times by this.
	if (!tess.shaderTime || isNaN(tess.shaderTime)) {
		throw new Error('Invalid time for shader');
	}
	
	gl.blendFunc(stage.blendSrc, stage.blendDest);

	if (stage.depthWrite) {
		gl.depthMask(true);
	} else {
		gl.depthMask(false);
	}
	gl.depthFunc(stage.depthFunc);

	gl.useProgram(program);

	var texture;
	if (stage.animFreq) {
		var animFrame = Math.floor(tess.shaderTime * stage.animFreq) % stage.animTextures.length;
		texture = stage.animTextures[animFrame];
	} else {
		texture = stage.texture;
	}

	if (texture) {
		gl.activeTexture(gl.TEXTURE0);
		gl.uniform1i(program.uniform.texture, 0);
		gl.bindTexture(gl.TEXTURE_2D, texture.texnum);
	}

	// Set uniforms
	gl.uniformMatrix4fv(program.uniform.modelViewMat, false, backend.or.modelMatrix);
	gl.uniformMatrix4fv(program.uniform.projectionMat, false, backend.viewParms.projectionMatrix);

	if (program.uniform.backlerp !== undefined) {
		var refent = re.currentEntity;
		var backlerp = !refent || refent.oldFrame === refent.frame ? 0 : refent.backlerp;
		gl.uniform1f(program.uniform.backlerp, backlerp);
	}

	if (program.uniform.lightmap !== undefined) {
		gl.activeTexture(gl.TEXTURE1);
		gl.uniform1i(program.uniform.lightmap, 1);
		gl.bindTexture(gl.TEXTURE_2D, re.lightmapTexture.texnum);
	}

	if (program.uniform.time !== undefined) {
		gl.uniform1f(program.uniform.time, tess.shaderTime);
	}

	// Setup vertex attributes.
	for (var name in attrs) {
		if (!attrs.hasOwnProperty(name)) {
			continue;
		}

		var tuple = attrs[name];

		if (program.attrib[name] !== undefined) {
			gl.enableVertexAttribArray(program.attrib[name]);
			gl.vertexAttribPointer(program.attrib[name], tuple[0], gl.FLOAT, false, stride, tuple[1]);
		}
	}
}