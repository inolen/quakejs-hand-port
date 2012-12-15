/**
 * InitBackend
 */
function InitBackend() {
	backend.scratchBuffers = {
		index:      CreateBuffer('uint16',  1, SHADER_MAX_INDEXES, true),
		xyz:        CreateBuffer('float32', 3, SHADER_MAX_VERTEXES),
		normal:     CreateBuffer('float32', 3, SHADER_MAX_VERTEXES),
		texCoord:   CreateBuffer('float32', 2, SHADER_MAX_VERTEXES),
		lightCoord: CreateBuffer('float32', 2, SHADER_MAX_VERTEXES),
		color:      CreateBuffer('uint8',   4, SHADER_MAX_VERTEXES)
	};

	backend.debugBuffers = {
		index: CreateBuffer('uint16',  1, 0xFFFF, true),
		xyz:   CreateBuffer('float32', 3, 0xFFFF)
	};

	backend.tessFns[SF.FACE] = TesselateFace;
	backend.tessFns[SF.FACEBATCH] = TesselateFaceBatch;
	// backend.tessFns[SF.GRID] = TesselateFace;
	backend.tessFns[SF.TRIANGLES] = TesselateFace;
	backend.tessFns[SF.MD3] = TesselateMd3;
	backend.tessFns[SF.MD3BATCH] = TesselateMd3Batch;
	backend.tessFns[SF.ENTITY] = TesselateEntity;
}

/**
 * RenderDrawSurfaces
 */
function RenderDrawSurfaces(firstDrawSurf, lastDrawSurf) {
	// Copy off frontend vars for us to work with.
	// NOTE: This is totally unneccesary. Our backend could just
	// as well access re.refdef, however, we're going to follow 
	// Q3's convention here, maybe one day we'll want SMP Q3 JS...
	re.refdef.clone(backend.refdef);
	re.viewParms.clone(backend.viewParms);

	var world = re.world;
	var shaders = world.shaders;
	var refdef = backend.refdef;
	var parms = backend.viewParms;
	var drawSurfs = backend.drawSurfs;
	var sortedShaders = re.sortedShaders;

	BeginDrawingView();

	//
	var oldBatch = null;
	var oldSort = -1;
	var oldShader = null;
	var oldEntityNum = -1;
	var modelMatrix;

	backend.currentEntity = null;

	// Save original time for entity shader offsets.
	var originalTime = backend.refdef.time;

	for (var i = firstDrawSurf; i < lastDrawSurf; i++) {
		var drawSurf = drawSurfs[i];
		var face = drawSurf.surface;

		// // Fast path, same as previous sort.
		// if (drawSurf.sort === oldSort) {
		// 	backend.tessFns[face.surfaceType] && backend.tessFns[face.surfaceType](face);
		// 	continue;
		// }
		// oldSort = drawSurf.sort;

		//var fogNum = (drawSurf.sort >> QSORT_FOGNUM_SHIFT) & 31;
		var shader = sortedShaders[(drawSurf.sort >> QSORT_SHADERNUM_SHIFT) % MAX_SHADERS];
		var entityNum = (drawSurf.sort >> QSORT_ENTITYNUM_SHIFT) % MAX_GENTITIES;
		//var dlightMap = drawSurf.sort & 3;

		// All polys should be mergable.
		// TODO Should refents have an entityMergable property as
		// well or is this appropriate?
		var entityMergable = shader.entityMergable || (backend.currentEntity && backend.currentEntity.reType === RT.POLY);

		// If the context is changing, end the current surface and start a new one.
		if (shader !== oldShader || (entityNum !== oldEntityNum && !entityMergable) || face.batch !== oldBatch) {
			if (oldShader) {
				EndSurface();
			}

			BeginSurface(shader);
			oldShader = shader;
			oldBatch = face.batch;
		}
		// Ignore surfaces from the last batch (they've already been rendered).
		else if (face.batch && face.batch === oldBatch) {
			continue;
		}

		if (oldEntityNum !== entityNum) {
			if (entityNum !== ENTITYNUM_WORLD) {
				backend.currentEntity = backend.refEnts[entityNum];
				backend.refdef.time = originalTime - backend.currentEntity.shaderTime;
				// We have to reset the shaderTime as well otherwise image animations
				// start from the wrong frame.
				backend.tess.shaderTime = backend.refdef.time;

				RotateForEntity(backend.currentEntity, backend.viewParms, backend.or);
			} else {
				backend.currentEntity = null;
				backend.refdef.time = originalTime;
				backend.tess.shaderTime = backend.refdef.time;
				parms.or.clone(backend.or);
			}

			oldEntityNum = entityNum;
		}

		if (face.batch) {
			backend.tessFns[face.batch.surfaceType](face.batch);
		} else {
			backend.tessFns[face.surfaceType](face);
		}
	}

	// Draw the contents of the last shader command.
	if (oldShader) {
		EndSurface();
	}

	// Draw view frustum if requested.
	if (r_showfrustum()) {
		DrawFrustum();
	}
}

/**
 * BeginDrawingView
 */
function BeginDrawingView() {
	// Set the window clipping.
	gl.viewport(0, 0, backend.viewParms.width, backend.viewParms.height);
	gl.scissor(0, 0, backend.viewParms.width, backend.viewParms.height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.enable(gl.CULL_FACE);

	// Clear back buffer but not color buffer (we expect the entire scene to be overwritten)
	gl.depthMask(true);
	gl.clear(gl.DEPTH_BUFFER_BIT);
	// gl.clear(gl.COLOR_BUFFER_BIT)

	// if ((backEnd.refdef.rdflags & RDF_HYPERSPACE)) {
	// 	RB_Hyperspace();
	// 	return;
	// } else {
	// 	backEnd.isHyperspace = qfalse;
	// }

	// TODO pass portalPlane to portal vertex program
	// and discard there.

	// Clip to the plane of the portal.
	// if (backEnd.viewParms.isPortal) {
	// 	float	plane[4];
	// 	double	plane2[4];

	// 	plane[0] = backEnd.viewParms.portalPlane.normal[0];
	// 	plane[1] = backEnd.viewParms.portalPlane.normal[1];
	// 	plane[2] = backEnd.viewParms.portalPlane.normal[2];
	// 	plane[3] = backEnd.viewParms.portalPlane.dist;

	// 	plane2[0] = DotProduct (backEnd.viewParms.or.axis[0], plane);
	// 	plane2[1] = DotProduct (backEnd.viewParms.or.axis[1], plane);
	// 	plane2[2] = DotProduct (backEnd.viewParms.or.axis[2], plane);
	// 	plane2[3] = DotProduct (plane, backEnd.viewParms.or.origin) - plane[3];

	// 	qglLoadMatrixf( s_flipMatrix );
	// 	qglClipPlane (GL_CLIP_PLANE0, plane2);
	// 	qglEnable (GL_CLIP_PLANE0);
	// } else {
	// 	qglDisable (GL_CLIP_PLANE0);
	// }
}

/**
 * RenderCollisionSurfaces
 */
function RenderCollisionSurfaces() {
	if (!backend.collisionBuffers) {
		return;
	}

	// Reset the modelview matrix.
	backend.currentEntity = null;
	backend.viewParms.or.clone(backend.or);

	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.FRONT);

	var index = backend.collisionBuffers.index;
	var xyz = backend.collisionBuffers.xyz;

	// Render!
	var shader = re.debugShader;
	var stage = shader.stages[0];
	BindBuffer(index);
	SetShaderStage(shader, stage);
	BindBuffer(xyz, stage.program.attrib.xyz);
	gl.drawElements(gl.LINE_LOOP, index.elementCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * BeginSurface
 */
function BeginSurface(shader) {
	var tess = backend.tess;

	tess.shader = shader;
	tess.shaderTime = backend.refdef.time;
	tess.indexOffset = 0;
	tess.indexCount = 0;

	// Reassign default buffers.
	tess.xyz = backend.scratchBuffers.xyz;
	tess.normal = backend.scratchBuffers.normal;
	tess.texCoord = backend.scratchBuffers.texCoord;
	tess.lightCoord = backend.scratchBuffers.lightCoord;
	tess.color = backend.scratchBuffers.color;
	tess.index = backend.scratchBuffers.index;

	// Reset counts on the scratch buffer.
	tess.xyz.offset = 0;
	tess.normal.offset = 0;
	tess.texCoord.offset = 0;
	tess.lightCoord.offset = 0;
	tess.color.offset = 0;
	tess.index.offset = 0;
}

/**
 * EndSurface
 */
function EndSurface() {
	var tess = backend.tess;
	var numIndexes = tess.elementCount || tess.index.elementCount;

	re.counts.shaders++;
	re.counts.vertexes += numIndexes / 3;
	re.counts.indexes += numIndexes;

	if (tess.shader.sky) {
		StageIteratorSky();
	} else {
		StageIteratorGeneric();
	}

	if (r_showtris()) {
		DrawTris();
	}
	
	if (r_shownormals()) {
		DrawNormals();
	}
}

/**
 * StageIteratorGeneric
 */
function StageIteratorGeneric() {
	var tess = backend.tess;
	var shader = tess.shader;
	var indexOffset = tess.indexOffset;
	var indexCount = tess.indexCount || tess.index.elementCount;

	// Bind the index buffer.
	BindBuffer(tess.index);

	// Setup gl params common to all stages.
	SetShader(shader);
	
	for (var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];

		// Bind the shader for this stage.
		SetShaderStage(shader, stage);

		// Bind buffers for shader attributes.
		if (tess.xyz.elementCount)        BindBuffer(tess.xyz,        stage.program.attrib.xyz);
		if (tess.normal.elementCount)     BindBuffer(tess.normal,     stage.program.attrib.normal);
		if (tess.texCoord.elementCount)   BindBuffer(tess.texCoord,   stage.program.attrib.texCoord);
		if (tess.lightCoord.elementCount) BindBuffer(tess.lightCoord, stage.program.attrib.lightCoord);
		if (tess.color.elementCount)      BindBuffer(tess.color,      stage.program.attrib.color);

		gl.drawElements(shader.mode, indexCount, gl.UNSIGNED_SHORT, indexOffset * 2);  // offset is in bytes

		// var error = gl.getError();
		// if (error !== gl.NO_ERROR) {
		// 	debugger;
		// }
	}
}

/**
 * DrawTris
 */
function DrawTris() {
	var tess = backend.tess;

	if (!tess.xyz) {
		com.Error(ERR.DROP, 'Can\'t draw triangles without xyz.');  // shouldn't happen
	}

	SetShaderStage(re.debugShader, re.debugShader.stages[0]);
	BindBuffer(tess.xyz, re.debugShader.stages[0]);

	gl.drawElements(gl.LINE_LOOP, tess.index.elementCount, gl.UNSIGNED_SHORT, 0);
}


/**
 * DrawNormals
 */
function DrawNormals() {
	var tess = backend.tess;

	if (!tess.xyz || !tess.normal) {
		com.Error(ERR.DROP, 'Can\'t draw normal without xyz and normal.');  // shouldn't happen
	}

	// Build up new index and vertex buffer.
	var tindex = tess.index;
	var txyz = tess.xyz;
	var tnormal = tess.normal;
	var bindex = backend.debugBuffers.index;
	var bxyz = backend.debugBuffers.xyz;

	var idx = 0;
	var xyz = [0, 0, 0];
	var normal = [0, 0, 0];
	
	for (var i = 0; i < numIndexes; i++) {
		// Read the index, xyz and normal from the last rendered tess buffers.
		idx = tindex.data[indexOffset + i];
		xyz[0] = txyz.data[idx * 3 + 0];
		xyz[1] = txyz.data[idx * 3 + 1];
		xyz[2] = txyz.data[idx * 3 + 2];
		normal[0] = tnormal.data[idx * 3 + 0];
		normal[1] = tnormal.data[idx * 3 + 1];
		normal[2] = tnormal.data[idx * 3 + 2];

		// Extrude out to render the normals.
		bxyz.data[bxyz.offset++] = xyz[0];
		bxyz.data[bxyz.offset++] = xyz[1];
		bxyz.data[bxyz.offset++] = xyz[2];
		bindex.data[bindex.offset++] = i*2;

		bxyz.data[bxyz.offset++] = xyz[0] + normal[0] * 2;
		bxyz.data[bxyz.offset++] = xyz[1] + normal[1] * 2;
		bxyz.data[bxyz.offset++] = xyz[2] + normal[2] * 2;
		bindex.data[bindex.offset++] = i*2+1;
	}

	bxyz.modified = true;
	bindex.modified = true;

	// Render!
	var shader = re.debugShader;
	var stage = shader.stages[0];
	BindBuffer(bindex);
	SetShaderStage(shader, stage);
	BindBuffer(bxyz, stage.program.attrib.xyz);
	gl.drawElements(gl.LINES, bindex.elementCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * DrawFrustum
 *
 * Sanity check the frustum planes.
 */
function DrawFrustum() {
	var parms = backend.viewParms;
	var index = backend.debugBuffers.index;
	var xyz = backend.debugBuffers.xyz;

	// Reset the buffer.
	xyz.offset = 0;
	index.offset = 0;

	// Make sure we're using the correct viewer orientation.
	parms.or.clone(backend.or);

	var origin = vec3.add(vec3.scale(backend.or.axis[0], 128, [0, 0, 0]), parms.or.origin);
	var normal = [0, 0, 0];
	var forward = [0, 0, 0];
	var up = [0, 0, 0];

	for (var i = 0; i < 4; i++) {
		var frustum = parms.frustum[i];

		// Validate frustum dist.
		var len = vec3.dot(parms.or.origin, frustum.normal);
		if (len !== frustum.dist) {
			error('Frustum plane distance is invalid.');
		}

		vec3.set(frustum.normal, normal);

		QMath.ProjectPointOnPlane(parms.or.axis[0], normal, forward);
		vec3.normalize(forward);

		vec3.cross(frustum.normal, forward, up);
		vec3.scale(up, 32);
		vec3.scale(forward, 512);

		var indexOffset = xyz.elementCount;

		xyz.data[xyz.offset++] = origin[0] - up[0];
		xyz.data[xyz.offset++] = origin[1] - up[1];
		xyz.data[xyz.offset++] = origin[2] - up[2];

		xyz.data[xyz.offset++] = origin[0] + up[0];
		xyz.data[xyz.offset++] = origin[1] + up[1];
		xyz.data[xyz.offset++] = origin[2] + up[2];

		xyz.data[xyz.offset++] = origin[0] + forward[0] + up[0];
		xyz.data[xyz.offset++] = origin[1] + forward[1] + up[1];
		xyz.data[xyz.offset++] = origin[2] + forward[2] + up[2];

		xyz.data[xyz.offset++] = origin[0] + forward[0] - up[0];
		xyz.data[xyz.offset++] = origin[1] + forward[1] - up[1];
		xyz.data[xyz.offset++] = origin[2] + forward[2] - up[2];

		index.data[index.offset++] = indexOffset + 0;
		index.data[index.offset++] = indexOffset + 1;
		index.data[index.offset++] = indexOffset + 2;
		index.data[index.offset++] = indexOffset + 3;
		index.data[index.offset++] = indexOffset + 0;
		index.data[index.offset++] = indexOffset + 2;
	}

	xyz.modified = true;
	index.modified = true;

	var shader = re.debugShader;
	var stage = shader.stages[0];

	SetShader(shader);
	BindBuffer(index);
	SetShaderStage(shader, stage);
	BindBuffer(xyz, stage.program.attrib.xyz);
	gl.drawElements(gl.LINE_STRIP, index.elementCount, gl.UNSIGNED_SHORT, 0);
}

/** 
 * CreateBuffer
 */
function CreateBuffer(dataType, elementSize, maxElements, isIndexBuffer) {
	var buf = new RenderBuffer();

	switch (dataType) {
		case 'float32':
			buf.ab = new ArrayBuffer(elementSize * maxElements * 4);
			buf.data = new Float32Array(buf.ab);
			buf.glElementType = gl.FLOAT;
			break;
		case 'uint8':
			buf.ab = new ArrayBuffer(elementSize * maxElements);
			buf.data = new Uint8Array(buf.ab);
			buf.glElementType = gl.UNSIGNED_BYTE;
			break;
		case 'uint16':
			buf.ab = new ArrayBuffer(elementSize * maxElements * 2);
			buf.data = new Uint16Array(buf.ab);
			buf.glElementType = gl.UNSIGNED_SHORT;
			break;
	}

	buf.elementSize = elementSize;
	buf.glBuffer = gl.createBuffer();
	buf.glBufferType = isIndexBuffer ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;

	return buf;
}

// AP - The performance hit isn't worth it.
// /**
//  * WriteBufferElement
//  */
// function WriteBufferElement(buf) {
// 	for (var i = 0; i < buf.elementSize; i++) {
// 		buf.data[buf.offset++] = arguments[1+i];  // offset by 1 to account for buf param
// 	}
// 	buf.modified = true;
// }

// /**
//  * ReadBufferElement
//  */
// function ReadBufferElement(buf, elementOffset, out) {
// 	elementOffset *= buf.elementSize;

// 	for (var i = 0; i < buf.elementSize; i++) {
// 		out[i] = buf.data[elementOffset+i];
// 	}
// }

/** 
 * BindBuffer
 *
 * Bind a buffer and update its data if it has been modified.
 * Additionally, if an attribute is specified, bind the attribute to this buffer.
 */
function BindBuffer(buf, attrId) {
	gl.bindBuffer(buf.glBufferType, buf.glBuffer);

	if (buf.modified) {
		// Create new views into the underlying array that represent the
		// much smaller subset of data we need to actually send to the GPU.
		var view = buf.data.subarray(0, buf.offset);
		gl.bufferData(buf.glBufferType, view, gl.DYNAMIC_DRAW);
		buf.modified = false;
	}

	if (attrId !== undefined) {
		gl.enableVertexAttribArray(attrId);
		gl.vertexAttribPointer(attrId, buf.elementSize, buf.glElementType, false, 0, 0);
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
	var tess = backend.tess;
	var program = stage.program;

	// Sanity check after being burned so many times by this.
	if (isNaN(tess.shaderTime)) {
		com.Error(ERR.DROP, 'Invalid time for shader');
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
	gl.uniform3fv(program.uniform.viewPosition, backend.or.viewOrigin);
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