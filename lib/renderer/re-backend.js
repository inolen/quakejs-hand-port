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
		color:      CreateBuffer('float32', 4, SHADER_MAX_VERTEXES)
	};

	// Scratch debug vertex buffers.
	backend.debugBuffers = {
		index: CreateBuffer('uint16',  1, 0xFFFF, true),
		xyz:   CreateBuffer('float32', 3, 0xFFFF)
	};

	backend.tessFns[SF.FACE] = TesselateFace;
	backend.tessFns[SF.GRID] = TesselateFace;
	backend.tessFns[SF.MD3] = TesselateMd3;
	backend.tessFns[SF.ENTITY] = TesselateEntity;
}

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
		var entityNum = (drawSurf.sort >> QSORT_ENTITYNUM_SHIFT) % MAX_GENTITIES;
		//var dlightMap = drawSurf.sort & 3;

		if (drawSurfs.sort === oldSort) {
			// Fast path, same as previous sort.
			backend.tessFns[face.surfaceType](face);
			continue;
		}
		oldSort = drawSurf.sort;

		// Change the tess parameters if needed.
		if (shader !== oldShader || entityNum !== oldEntityNum) {
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
				RotateForEntity(backend.currentEntity, backend.or);
			} else {
				backend.currentEntity = null;
				parms.or.clone(backend.or);
			}

			oldEntityNum = entityNum;
		}

		backend.tessFns[face.surfaceType](face);

		// HACK - Normal faces are part of a static buffer pre-sorted by shader, 
		// we don't need to add any more faces for this shader.
		if (face.surfaceType === SF.FACE) {
			while (drawSurfs[i].sort === oldSort) {
				i++;
			}
			i--;
		}
	}

	// Draw the contents of the last shader batch.
	if (oldShader) {
		EndSurface();
	}
}

function RenderCollisionSurfaces() {
	if (!re.world.cmbuffers) {
		return;
	}

	// Reset the modelview matrix.
	backend.currentEntity = null;
	backend.viewParms.or.clone(backend.or);

	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.FRONT);

	var bindex = re.world.cmbuffers.index;
	var bxyz = re.world.cmbuffers.xyz;

	// Render!
	var shader = re.debugShader;
	var stage = shader.stages[0];
	BindBuffer(bindex);
	SetShaderStage(shader, stage);
	BindBuffer(bxyz, stage.program.attrib.xyz);
	gl.drawElements(gl.LINE_LOOP, bindex.elementCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * BeginSurface
 */
function BeginSurface(shader) {
	var tess = backend.tess;

	tess.shader = shader;
	tess.shaderTime = backend.refdef.time / 1000;

	tess.numIndexes = 0;
	tess.indexOffset = 0;

	if (tess.index)      ResetBuffer(tess.index);      tess.index = null;
	if (tess.xyz)        ResetBuffer(tess.xyz);        tess.xyz = null;
	if (tess.normal)     ResetBuffer(tess.normal);     tess.normal = null;
	if (tess.texCoord)   ResetBuffer(tess.texCoord);   tess.texCoord = null;
	if (tess.lightCoord) ResetBuffer(tess.lightCoord); tess.lightCoord = null;
	if (tess.color)      ResetBuffer(tess.color);      tess.color = null;
}

/**
 * EndSurface
 */
function EndSurface() {
	var tess = backend.tess;
	var shader = tess.shader;
	var numIndexes = tess.numIndexes || tess.index.elementCount;
	var indexOffset = tess.indexOffset;

	re.counts.shaders++;
	re.counts.vertexes += numIndexes / 3;
	re.counts.indexes += numIndexes;

	// Bind the index buffer.
	BindBuffer(tess.index);

	// Setup gl params common to all stages.
	SetShader(shader);
	
	for (var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];

		// Bind the shader for this stage.
		SetShaderStage(shader, stage);

		// Bind buffers for shader attributes.
		// NOTE: While we're binding for any buffer that exists, if the
		// associated shader doesn't use the attribute, it won't cause
		// any problems.
		if (tess.xyz)        BindBuffer(tess.xyz,        stage.program.attrib.xyz);
		if (tess.normal)     BindBuffer(tess.normal,     stage.program.attrib.normal);
		if (tess.texCoord)   BindBuffer(tess.texCoord,   stage.program.attrib.texCoord);
		if (tess.lightCoord) BindBuffer(tess.lightCoord, stage.program.attrib.lightCoord);
		if (tess.color)      BindBuffer(tess.color,      stage.program.attrib.color);

		gl.drawElements(shader.mode, numIndexes, gl.UNSIGNED_SHORT, indexOffset * 2); // offset is in bytes
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
	var tess = backend.tess;

	if (!tess.xyz) {
		imp.com_error(sh.Err.DROP, 'Can\'t draw triangles without xyz.');  // shouldn't happen
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
		imp.com_error(sh.Err.DROP, 'Can\'t draw normal without xyz and normal.');  // shouldn't happen
	}

	// Build up new index and vertex buffer.
	var tindex = tess.index;
	var txyz = tess.xyz;
	var tnormal = tess.normal;
	var bindex = backend.debugBuffers.index;
	var bxyz = backend.debugBuffers.xyz;
	var numIndexes = tess.numIndexes || tess.index.elementCount;
	var indexOffset = tess.indexOffset;

	ResetBuffer(bindex);
	ResetBuffer(bxyz);

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

/**
 * LockBuffer
 */
function LockBuffer(buf) {
	buf.locked = true;
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
 * ResetBuffer
 */
function ResetBuffer(buf) {
	if (!buf.locked) {
		buf.offset = 0;
	}
}

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
	if (!tess.shaderTime || isNaN(tess.shaderTime)) {
		imp.com_error(sh.Err.DROP, 'Invalid time for shader');
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
 * 
 * This function is a bit of a sham. We don't actually append each face to
 * any buffer as the world's index buffer is already pre-sorted. There is a
 * special case in the main render loop to only call this once per face.
 */
function TesselateFace(face) {
	var tess = backend.tess;
	var entry = re.world.shaderMap[tess.shader.index];

	tess.numIndexes = entry.elementCount;
	tess.indexOffset = entry.indexOffset;

	tess.index = re.world.buffers.index;
	tess.xyz = re.world.buffers.xyz;
	tess.normal = re.world.buffers.normal;
	tess.texCoord = re.world.buffers.texCoord;
	tess.lightCoord = re.world.buffers.lightCoord;
	tess.color = re.world.buffers.color;
}

/**
 * TesselateMd3
 */
function TesselateMd3(face) {
	var tess = backend.tess;
	var refent = backend.currentEntity;
	var backlerp = refent.oldFrame === refent.frame ? 0 : refent.backlerp;
	var numVerts = face.header.numVerts;
	var oldXyz = [0, 0, 0];
	var newXyz = [0, 0, 0];
	var oldNormal = [0, 0, 0];
	var newNormal = [0, 0, 0];
	var newColor = [0, 0, 0, 0];

	//
	// Update the scratch vertex buffers.
	//
	var bxyz = backend.scratchBuffers.xyz;
	var bnormal = backend.scratchBuffers.normal;
	var btexCoord = backend.scratchBuffers.texCoord;
	var bcolor = backend.scratchBuffers.color;
	var indexOffset = bxyz.elementCount;

	for (var i = 0; i < numVerts; i++) {
		var oldXyzNormal = face.xyzNormals[refent.oldFrame * numVerts + i];
		var newXyzNormal = face.xyzNormals[refent.frame * numVerts + i];

		// Lerp xyz / normal.
		vec3.scale(oldXyzNormal.xyz, MD3_XYZ_SCALE, oldXyz);
		vec3.set(oldXyzNormal.normal, oldNormal);

		vec3.scale(newXyzNormal.xyz, MD3_XYZ_SCALE, newXyz);
		vec3.set(newXyzNormal.normal, newNormal);

		if (backlerp !== 0.0) {
			for (var j = 0; j < 3; j++) {
				newXyz[j] = newXyz[j] + backlerp * (oldXyz[j] - newXyz[j]);
				newNormal[j] = newNormal[j] + backlerp * (oldNormal[j] - newNormal[j]);
			}
		}

		// 
		CalcDiffuseColor(refent, newNormal, newColor);

		bxyz.data[bxyz.offset++] = newXyz[0];
		bxyz.data[bxyz.offset++] = newXyz[1];
		bxyz.data[bxyz.offset++] = newXyz[2];

		bnormal.data[bnormal.offset++] = newNormal[0];
		bnormal.data[bnormal.offset++] = newNormal[1];
		bnormal.data[bnormal.offset++] = newNormal[2];

		btexCoord.data[btexCoord.offset++] = face.st[i].st[0];
		btexCoord.data[btexCoord.offset++] = face.st[i].st[1];

		bcolor.data[bcolor.offset++] = newColor[0];
		bcolor.data[bcolor.offset++] = newColor[1];
		bcolor.data[bcolor.offset++] = newColor[2];
		bcolor.data[bcolor.offset++] = newColor[3];
	}

	bxyz.modified = true;
	bnormal.modified = true;
	btexCoord.modified = true;
	bcolor.modified = true;

	//
	// Update the scratch index buffer.
	//
	var bindex = backend.scratchBuffers.index;

	for (var i = 0; i < face.triangles.length; i++) {
		var tri = face.triangles[i];

		bindex.data[bindex.offset++] = indexOffset + tri.indexes[0];
		bindex.data[bindex.offset++] = indexOffset + tri.indexes[1];
		bindex.data[bindex.offset++] = indexOffset + tri.indexes[2];
	}

	bindex.modified = true;

	tess.index = bindex;
	tess.xyz = bxyz;
	tess.normal = bnormal;
	tess.texCoord = btexCoord;
	tess.color = bcolor;
}

/**
 * TesselateEntity
 */
function TesselateEntity(face) {
	switch (backend.currentEntity.reType) {
		case RT.SPRITE:
			TesselateSprite();
			break;
	}
}

/**
 * TesselateSprite
 */
function TesselateSprite() {
	var tess = backend.tess;
	var refent = backend.currentEntity;
	var radius = refent.radius;
	var left = [0, 0, 0];
	var up = [0, 0, 0];

	// Calculate the xyz locations for the four corners
	if (refent.rotation === 0) {
		vec3.scale(backend.viewparms.or.axis[1], radius, left);
		vec3.scale(backend.viewParms.or.axis[2], radius, up);
	} else {
		var ang = Math.PI * refent.rotation / 180;
		var s = Math.sin(ang);
		var c = Math.cos(ang);

		vec3.scale(backend.viewParms.or.axis[1], c * radius, left);
		vec3.add(left, vec3.scale(backend.viewParms.or.axis[2], -s * radius, [0, 0, 0]), left);

		vec3.scale(backend.viewParms.or.axis[2], c * radius, up);
		vec3.add(up, vec3.scale(backend.viewParms.or.axis[1], s * radius, [0, 0, 0]), up);
	}

	// if (backend.viewParms.isMirror) {
	// 	vec3.negate(left);
	// }

	AddQuadStamp(refent.origin, left, up, refent.shaderRGBA);
	
	tess.index = backend.scratchBuffers.index;
	tess.xyz = backend.scratchBuffers.xyz;
	tess.normal = backend.scratchBuffers.normal;
	// tess.texCoord = btexCoord;
	// tess.color = bcolor;
}

/**
 * AddQuadStamp
 */
function AddQuadStamp(origin, left, up, color) {
	AddQuadStampExt(origin, left, up, color, 0, 0, 1, 1);
}


/**
 * AddQuadStampExt
 */
function AddQuadStampExt(origin, left, up, color, s1, t2, s2, t2) {
	var bindex = backend.scratchBuffers.index;
	var bxyz = backend.scratchBuffers.xyz;
	var bnormal = backend.scratchBuffers.normal;
	var btexCoord = backend.scratchBuffers.texCoord;
	var bcolor = backend.scratchBuffers.color;
	var indexOffset = bxyz.elementCount;

	// Triangle indexes for a simple quad.
	bindex.data[bindex.offset++] = indexOffset;
	bindex.data[bindex.offset++] = indexOffset + 1;
	bindex.data[bindex.offset++] = indexOffset + 3;

	bindex.data[bindex.offset++] = indexOffset + 3;
	bindex.data[bindex.offset++] = indexOffset + 1;
	bindex.data[bindex.offset++] = indexOffset + 2;

	bxyz.data[bxyz.offset++] = origin[0] + left[0] + up[0];
	bxyz.data[bxyz.offset++] = origin[1] + left[1] + up[1];
	bxyz.data[bxyz.offset++] = origin[2] + left[2] + up[2];

	bxyz.data[bxyz.offset++] = origin[0] - left[0] + up[0];
	bxyz.data[bxyz.offset++] = origin[1] - left[1] + up[1];
	bxyz.data[bxyz.offset++] = origin[2] - left[2] + up[2];

	bxyz.data[bxyz.offset++] = origin[0] - left[0] - up[0];
	bxyz.data[bxyz.offset++] = origin[1] - left[1] - up[1];
	bxyz.data[bxyz.offset++] = origin[2] - left[2] - up[2];

	bxyz.data[bxyz.offset++] = origin[0] + left[0] - up[0];
	bxyz.data[bxyz.offset++] = origin[1] + left[1] - up[1];
	bxyz.data[bxyz.offset++] = origin[2] + left[2] - up[2];

	// Constant normal all the way around.
	var normal = vec3.negate(backend.viewParms.or.axis[0], [0, 0, 0]);
	for (var i = 0; i < 4; i++) {
		bnormal.data[bnormal.offset++] = normal[0];
		bnormal.data[bnormal.offset++] = normal[1];
		bnormal.data[bnormal.offset++] = normal[2];
	}
	
	// Standard square texture coordinates.
	// tess.texCoords[ndx][0][0] = tess.texCoords[ndx][1][0] = s1;
	// tess.texCoords[ndx][0][1] = tess.texCoords[ndx][1][1] = t1;

	// tess.texCoords[ndx+1][0][0] = tess.texCoords[ndx+1][1][0] = s2;
	// tess.texCoords[ndx+1][0][1] = tess.texCoords[ndx+1][1][1] = t1;

	// tess.texCoords[ndx+2][0][0] = tess.texCoords[ndx+2][1][0] = s2;
	// tess.texCoords[ndx+2][0][1] = tess.texCoords[ndx+2][1][1] = t2;

	// tess.texCoords[ndx+3][0][0] = tess.texCoords[ndx+3][1][0] = s1;
	// tess.texCoords[ndx+3][0][1] = tess.texCoords[ndx+3][1][1] = t2;

	// Constant color all the way around.
	// * ( unsigned int * ) &tess.vertexColors[ndx] = 
	// * ( unsigned int * ) &tess.vertexColors[ndx+1] = 
	// * ( unsigned int * ) &tess.vertexColors[ndx+2] = 
	// * ( unsigned int * ) &tess.vertexColors[ndx+3] = 
	// 	* ( unsigned int * )color;

	bindex.modified = true;
	bxyz.modified = true;
	bnormal.modified = true;
}