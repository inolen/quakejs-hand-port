/**
 * TesselateFace
 */
function TesselateFace(worldSurface) {
	var tess = backend.tess;

	tess.numIndexes = worldSurface.elementCount;
	tess.indexOffset = worldSurface.indexOffset;

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

		case RT.RAIL_CORE:
			TesselateRailCore();
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
		vec3.scale(backend.viewParms.or.axis[1], radius, left);
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
	tess.texCoord = backend.scratchBuffers.texCoord;
	tess.color = backend.scratchBuffers.color;
}

/**
 * TesselateRailCore
 */
function TesselateRailCore() {
	var tess = backend.tess;
	var refent = backend.currentEntity;

	var start = vec3.set(refent.oldOrigin, [0, 0, 0]);
	var end = vec3.set(refent.origin, [0, 0, 0]);

	// Compute side vector.
	var v1 = vec3.subtract(start, backend.viewParms.or.origin, [0, 0, 0]);
	vec3.normalize(v1);
	var v2 = vec3.subtract(end, backend.viewParms.or.origin, [0, 0, 0]);
	vec3.normalize(v2);
	var right = vec3.cross(v1, v2, [0, 0, 0]);
	vec3.normalize(right);

	DoRailCore(start, end, right, r_railCoreWidth(), refent.shaderRGBA);

	tess.index = backend.scratchBuffers.index;
	tess.xyz = backend.scratchBuffers.xyz;
	tess.normal = backend.scratchBuffers.normal;
	tess.texCoord = backend.scratchBuffers.texCoord;
	tess.color = backend.scratchBuffers.color;
}

function DoRailCore(start, end, right, spanWidth, color) {
	var left = vec3.scale(right, spanWidth, [0, 0, 0]);
	var up = vec3.subtract(end, start, [0, 0, 0]);
	var t = vec3.length(up) / 256;
	AddQuadStampExt(start, left, up, color, 0, 0, t, 1);

	// float		spanWidth2;
	// int			vbase;
	// float		t = len / 256.0f;

	// vbase = tess.numVertexes;

	// spanWidth2 = -spanWidth;

	// // FIXME: use quad stamp?
	// VectorMA( start, spanWidth, up, tess.xyz[tess.numVertexes] );
	// tess.texCoords[tess.numVertexes][0][0] = 0;
	// tess.texCoords[tess.numVertexes][0][1] = 0;
	// tess.vertexColors[tess.numVertexes][0] = backEnd.currentEntity->e.shaderRGBA[0] * 0.25;
	// tess.vertexColors[tess.numVertexes][1] = backEnd.currentEntity->e.shaderRGBA[1] * 0.25;
	// tess.vertexColors[tess.numVertexes][2] = backEnd.currentEntity->e.shaderRGBA[2] * 0.25;
	// tess.numVertexes++;

	// VectorMA( start, spanWidth2, up, tess.xyz[tess.numVertexes] );
	// tess.texCoords[tess.numVertexes][0][0] = 0;
	// tess.texCoords[tess.numVertexes][0][1] = 1;
	// tess.vertexColors[tess.numVertexes][0] = backEnd.currentEntity->e.shaderRGBA[0];
	// tess.vertexColors[tess.numVertexes][1] = backEnd.currentEntity->e.shaderRGBA[1];
	// tess.vertexColors[tess.numVertexes][2] = backEnd.currentEntity->e.shaderRGBA[2];
	// tess.numVertexes++;

	// VectorMA( end, spanWidth, up, tess.xyz[tess.numVertexes] );

	// tess.texCoords[tess.numVertexes][0][0] = t;
	// tess.texCoords[tess.numVertexes][0][1] = 0;
	// tess.vertexColors[tess.numVertexes][0] = backEnd.currentEntity->e.shaderRGBA[0];
	// tess.vertexColors[tess.numVertexes][1] = backEnd.currentEntity->e.shaderRGBA[1];
	// tess.vertexColors[tess.numVertexes][2] = backEnd.currentEntity->e.shaderRGBA[2];
	// tess.numVertexes++;

	// VectorMA( end, spanWidth2, up, tess.xyz[tess.numVertexes] );
	// tess.texCoords[tess.numVertexes][0][0] = t;
	// tess.texCoords[tess.numVertexes][0][1] = 1;
	// tess.vertexColors[tess.numVertexes][0] = backEnd.currentEntity->e.shaderRGBA[0];
	// tess.vertexColors[tess.numVertexes][1] = backEnd.currentEntity->e.shaderRGBA[1];
	// tess.vertexColors[tess.numVertexes][2] = backEnd.currentEntity->e.shaderRGBA[2];
	// tess.numVertexes++;

	// tess.indexes[tess.numIndexes++] = vbase;
	// tess.indexes[tess.numIndexes++] = vbase + 1;
	// tess.indexes[tess.numIndexes++] = vbase + 2;

	// tess.indexes[tess.numIndexes++] = vbase + 2;
	// tess.indexes[tess.numIndexes++] = vbase + 1;
	// tess.indexes[tess.numIndexes++] = vbase + 3;
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
function AddQuadStampExt(origin, left, up, color, s1, t1, s2, t2) {
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

	bnormal.data[bnormal.offset++] = normal[0];
	bnormal.data[bnormal.offset++] = normal[1];
	bnormal.data[bnormal.offset++] = normal[2];

	bnormal.data[bnormal.offset++] = normal[0];
	bnormal.data[bnormal.offset++] = normal[1];
	bnormal.data[bnormal.offset++] = normal[2];

	bnormal.data[bnormal.offset++] = normal[0];
	bnormal.data[bnormal.offset++] = normal[1];
	bnormal.data[bnormal.offset++] = normal[2];

	bnormal.data[bnormal.offset++] = normal[0];
	bnormal.data[bnormal.offset++] = normal[1];
	bnormal.data[bnormal.offset++] = normal[2];

	// Standard square texture coordinates.
	btexCoord.data[btexCoord.offset++] = s1;
	btexCoord.data[btexCoord.offset++] = t1;

	btexCoord.data[btexCoord.offset++] = s2;
	btexCoord.data[btexCoord.offset++] = t1;

	btexCoord.data[btexCoord.offset++] = s2;
	btexCoord.data[btexCoord.offset++] = t2;

	btexCoord.data[btexCoord.offset++] = s1;
	btexCoord.data[btexCoord.offset++] = t2;

	// Constant color all the way around.
	bcolor.data[bcolor.offset++] = color[0] / 255;
	bcolor.data[bcolor.offset++] = color[1] / 255;
	bcolor.data[bcolor.offset++] = color[2] / 255;
	bcolor.data[bcolor.offset++] = color[3] / 255;

	bcolor.data[bcolor.offset++] = color[0] / 255;
	bcolor.data[bcolor.offset++] = color[1] / 255;
	bcolor.data[bcolor.offset++] = color[2] / 255;
	bcolor.data[bcolor.offset++] = color[3] / 255;

	bcolor.data[bcolor.offset++] = color[0] / 255;
	bcolor.data[bcolor.offset++] = color[1] / 255;
	bcolor.data[bcolor.offset++] = color[2] / 255;
	bcolor.data[bcolor.offset++] = color[3] / 255;

	bcolor.data[bcolor.offset++] = color[0] / 255;
	bcolor.data[bcolor.offset++] = color[1] / 255;
	bcolor.data[bcolor.offset++] = color[2] / 255;
	bcolor.data[bcolor.offset++] = color[3] / 255;

	bindex.modified = true;
	bxyz.modified = true;
	bnormal.modified = true;
	btexCoord.modified = true;
	bcolor.modified = true;
}