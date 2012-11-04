var tess;
var tessFns = {};
tessFns[SurfaceType.BAD] = TesselateFace;
tessFns[SurfaceType.FACE] = TesselateFace;
tessFns[SurfaceType.GRID] = TesselateFace;
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

	backend.currentEntity = null;

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
			if (oldShader) {
				EndSurface();
			}

			BeginSurface(shader);
			oldShader = shader;
		}

		// Change the model view matrix for entity.
		if (oldEntityNum !== entityNum) {
			if (entityNum !== ENTITYNUM_WORLD) {
				backend.currentEntity = refdef.refEntities[entityNum];
				RotateModelMatrixForEntity(backend.currentEntity, backend.or);
			} else {
				backend.currentEntity = null;
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

	// Reset count on dynamic vertex buffers.
	if (tess.vertexBuffers) {
		for (var i = 0; i < tess.vertexBuffers.length; i++) {
			var vb = tess.vertexBuffers[i];

			if (vb.type === RenderBufferType.VERTEX_DYNAMIC) {
				vb.count = 0;
			}
		}
	}
	tess.vertexBuffers = null;

	// Resten count on dynamic index buffers.
	if (tess.indexBuffer.type == RenderBufferType.INDEX_DYNAMIC) {
		tess.indexBuffer.count = 0;
	}
}

/**
 * EndSurface
 */
function EndSurface() {
	var shader = tess.shader;

	re.counts.shaders++;
	re.counts.indexes += tess.indexBuffer.count;

	BindBuffer(tess.indexBuffer);

	for (var i = 0; i < tess.vertexBuffers.length; i++) {
		BindBuffer(tess.vertexBuffers[i]);
	}

	// Bind the surface shader.
	SetShader(shader);
	
	for (var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];

		SetShaderStage(shader, stage);

		for (var j = 0; j < tess.vertexBuffers.length; j++) {
			BindBufferAttributes(tess.vertexBuffers[j], stage);
		}

		gl.drawElements(shader.mode, tess.indexBuffer.count, gl.UNSIGNED_SHORT, 0);
	}

	if (r_showtris()) {
		DrawTris();
	}
	
	if (r_shownormals()) {
		DrawNormals();
	}
}

/**
 * DrawTris
 */
function DrawTris() {
	gl.depthMask(true);
	gl.depthRange(0, 0);

	SetShaderStage(re.debugShader, re.debugShader.stages[0]);
	gl.drawElements(gl.LINE_LOOP, tess.indexBuffer.count, gl.UNSIGNED_SHORT, 0);

	gl.depthRange(0, 1);
}


/**
 * DrawNormals
 */
function DrawNormals() {
	gl.depthMask(true);
	gl.depthRange(0, 0); // never occluded

	SetShaderStage(re.debugShader, re.debugShader.stages[0]);
	// for (var i = 0; i < input->numVertexes; i++) {
	// 	qglVertex3fv (input->xyz[i]);
	// 	VectorMA (input->xyz[i], 2, input->normal[i], temp);
	// 	qglVertex3fv (temp);
	// }

	gl.DepthRange(0, 1);
}

/** 
 * BindBuffer
 */
function BindBuffer(rb) {
	var isvb = rb.type === RenderBufferType.VERTEX_DYNAMIC ||
	           rb.type === RenderBufferType.VERTEX_STATIC;

	gl.bindBuffer(isvb ? gl.ARRAY_BUFFER : gl.ELEMENT_ARRAY_BUFFER, rb.glbuffer);

	if (rb.modified) {
		// Create new views into the underlying array that represent the
		// much smaller subset of data we need to actually send to the GPU.
		var view;

		if (isvb) {
		 	view = new Float32Array(rb.ab, 0, rb.count);
		 } else {
			view = new Uint16Array(rb.ab, 0, rb.count);
		}

		gl.bufferData(isvb ? gl.ARRAY_BUFFER : gl.ELEMENT_ARRAY_BUFFER, view, gl.DYNAMIC_DRAW);

		rb.modified = false;
	}
}

/** 
 * BindBufferAttributes
 */
function BindBufferAttributes(rb, stage) {
	var program = stage.program;
	var attrs = rb.attrs;

	if (!attrs) {
		return;
	}

	for (var name in attrs) {
		if (!attrs.hasOwnProperty(name)) {
			continue;
		}

		var tuple = attrs[name];
		var idx;

		if ((idx = program.attrib[name]) !== undefined) {
			gl.enableVertexAttribArray(idx);
			gl.vertexAttribPointer(idx, tuple[0], gl.FLOAT, false, rb.stride, tuple[1]);
		}
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
function SetShaderStage(shader, stage) {
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
		var refent = backend.currentEntity;
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
}

/**
 * TesselateFace
 */
function TesselateFace(tess, face) {
	var meshVerts = re.world.meshVerts;

	// Append to our index buffer.
	var ib = tess.indexBuffer;

	for (var i = 0; i < face.meshVertCount; i++) {
		ib.view[ib.count++] = face.vertex + meshVerts[face.meshVert + i];
	}

	ib.modified = true;

	tess.vertexBuffers = re.world.vertexBuffers;
}

/**
 * TesselateMd3
 */
function TesselateMd3(tess, face) {
	var refent = backend.currentEntity;
	var backlerp = refent.oldFrame === refent.frame ? 0 : refent.backlerp;
	var numVerts = face.header.numVerts;
	var oldXyz = [0, 0, 0];
	var newXyz = [0, 0, 0];
	var oldNormal = [0, 0, 0];
	var newNormal = [0, 0, 0];

	//
	// Update the scratch vertex buffers.
	//
	var vb = re.modelVertexBuffers[0];
	var indexOffset = vb.count / 12;

	for (var i = 0; i < numVerts; i++) {
		var oldXyzNormal = face.xyzNormals[refent.oldFrame * numVerts + i];
		var newXyzNormal = face.xyzNormals[refent.frame * numVerts + i];

		vec3.scale(oldXyzNormal.xyz, MD3_XYZ_SCALE, oldXyz);
		oldNormal[0] = Math.cos(oldXyzNormal.lng) * Math.sin(oldXyzNormal.lat);
		oldNormal[1] = Math.sin(oldXyzNormal.lng) * Math.sin(oldXyzNormal.lat);
		oldNormal[2] = Math.cos(oldXyzNormal.lat);
		vec3.normalize(oldNormal);

		vec3.scale(newXyzNormal.xyz, MD3_XYZ_SCALE, newXyz);
		newNormal[0] = Math.cos(newXyzNormal.lng) * Math.sin(newXyzNormal.lat);
		newNormal[1] = Math.sin(newXyzNormal.lng) * Math.sin(newXyzNormal.lat);
		newNormal[2] = Math.cos(newXyzNormal.lat);
		vec3.normalize(newNormal);

		if (backlerp != 0.0) {
			for (var j = 0; j < 3; j++) {
				newXyz[j] = newXyz[j] + backlerp * (oldXyz[j] - newXyz[j]);
				newNormal[j] = newNormal[j] + backlerp * (oldNormal[j] - newNormal[j]);
			}
		}

		vb.view[vb.count++] = newXyz[0];
		vb.view[vb.count++] = newXyz[1];
		vb.view[vb.count++] = newXyz[2];

		vb.view[vb.count++] = newNormal[0];
		vb.view[vb.count++] = newNormal[1];
		vb.view[vb.count++] = newNormal[2];

		vb.view[vb.count++] = face.st[i].st[0];
		vb.view[vb.count++] = face.st[i].st[1];

		CalcDiffuseColor(backend.currentEntity, newNormal, vb.view, vb.count);
		vb.count += 4;
	}

	vb.modified = true;

	//
	// Update the scratch index buffer.
	//
	var ib = tess.indexBuffer;

	for (var i = 0; i < face.triangles.length; i++) {
		var tri = face.triangles[i];

		ib.view[ib.count++] = indexOffset + tri.indexes[0];
		ib.view[ib.count++] = indexOffset + tri.indexes[1];
		ib.view[ib.count++] = indexOffset + tri.indexes[2];
	}

	ib.modified = true;

	tess.vertexBuffers = re.modelVertexBuffers;
}