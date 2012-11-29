/**
 * TesselateFace
 *
 * All of our world surfaces are already grouped by shader,
 * meaning this function will only ever be called once
 * before EndSurface().
 */
function TesselateFace(worldSurface) {
	var tess = backend.tess;

	tess.numIndexes = worldSurface.elementCount;
	tess.indexOffset = worldSurface.indexOffset;

	tess.index = backend.worldBuffers.index;
	tess.xyz = backend.worldBuffers.xyz;
	tess.normal = backend.worldBuffers.normal;
	tess.texCoord = backend.worldBuffers.texCoord;
	tess.lightCoord = backend.worldBuffers.lightCoord;
	tess.color = backend.worldBuffers.color;
}

/**
 * TesselateMd3
 * 
 * Single-frame (static) models are pushed to the backend.modelBuffers
 * array on load. Since the same md3 surface is never be rendered twice
 * for the same entity, we can assume that this function will only be called
 * once before EndSurface().
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
	var xyz;
	var normal;
	var texCoord;
	var color;
	var index;

	//
	// If this model is in the static buffer array, let's make this fast.
	//
	if (face.elementCount !== 0) {
		xyz = backend.modelBuffers.xyz;
		normal = backend.modelBuffers.normal;
		texCoord = backend.modelBuffers.texCoord;
		color = backend.modelBuffers.color;
		index = backend.modelBuffers.index;

		// We always have to update the color buffer.
		color.offset = face.colorOffset;

		for (var i = 0; i < numVerts; i++) {
			var xyzNormal = face.xyzNormals[i];
			CalcDiffuseColor(refent, xyzNormal.normal, newColor);

			color.data[color.offset++] = newColor[0];
			color.data[color.offset++] = newColor[1];
			color.data[color.offset++] = newColor[2];
			color.data[color.offset++] = newColor[3];
		}

		color.modified = true;

		tess.numIndexes = face.elementCount;
		tess.indexOffset = face.indexOffset;
	} else {
		//
		// Update the scratch vertex buffers.
		//
		xyz = backend.scratchBuffers.xyz;
		normal = backend.scratchBuffers.normal;
		texCoord = backend.scratchBuffers.texCoord;
		color = backend.scratchBuffers.color;

		var indexOffset = xyz.elementCount;

		for (var i = 0; i < numVerts; i++) {
			var oldXyzNormal = face.xyzNormals[refent.oldFrame * numVerts + i];
			var newXyzNormal = face.xyzNormals[refent.frame * numVerts + i];

			// Lerp xyz / normal.
			vec3.set(oldXyzNormal.xyz, oldXyz);
			vec3.set(oldXyzNormal.normal, oldNormal);

			vec3.set(newXyzNormal.xyz, newXyz);
			vec3.set(newXyzNormal.normal, newNormal);

			if (backlerp !== 0.0) {
				for (var j = 0; j < 3; j++) {
					newXyz[j] = newXyz[j] + backlerp * (oldXyz[j] - newXyz[j]);
					newNormal[j] = newNormal[j] + backlerp * (oldNormal[j] - newNormal[j]);
				}
			}

			// 
			CalcDiffuseColor(refent, newNormal, newColor);

			xyz.data[xyz.offset++] = newXyz[0];
			xyz.data[xyz.offset++] = newXyz[1];
			xyz.data[xyz.offset++] = newXyz[2];

			normal.data[normal.offset++] = newNormal[0];
			normal.data[normal.offset++] = newNormal[1];
			normal.data[normal.offset++] = newNormal[2];

			texCoord.data[texCoord.offset++] = face.st[i].st[0];
			texCoord.data[texCoord.offset++] = face.st[i].st[1];

			color.data[color.offset++] = newColor[0];
			color.data[color.offset++] = newColor[1];
			color.data[color.offset++] = newColor[2];
			color.data[color.offset++] = newColor[3];
		}

		//
		// Update the scratch index buffer.
		//
		index = backend.scratchBuffers.index;

		for (var i = 0; i < face.triangles.length; i++) {
			var tri = face.triangles[i];

			index.data[index.offset++] = indexOffset + tri.indexes[0];
			index.data[index.offset++] = indexOffset + tri.indexes[1];
			index.data[index.offset++] = indexOffset + tri.indexes[2];
		}

		xyz.modified = true;
		normal.modified = true;
		texCoord.modified = true;
		color.modified = true;
		index.modified = true;
	}

	tess.xyz = xyz;
	tess.normal = normal;
	tess.texCoord = texCoord;
	tess.color = color;
	tess.index = index;
}

/**
 * TesselateEntity
 */
function TesselateEntity(face) {
	switch (backend.currentEntity.reType) {
		case RT.POLY:
			TesselatePoly();
			break;

		case RT.SPRITE:
			TesselateSprite();
			break;

		case RT.RAIL_CORE:
			TesselateRailCore();
			break;
	}
}

/**
 * TesselatePoly
 */
function TesselatePoly() {
	var tess = backend.tess;
	var refent = backend.currentEntity;
	var index = backend.scratchBuffers.index;
	var xyz = backend.scratchBuffers.xyz;
	var texCoord = backend.scratchBuffers.texCoord;
	var color = backend.scratchBuffers.color;
	var indexOffset = xyz.elementCount;

	// Fan triangles into the tess array.
	for (var i = 0; i < refent.numPolyVerts; i++) {
		var p = refent.polyVerts[i];

		xyz.data[xyz.offset++] = p.xyz[0];
		xyz.data[xyz.offset++] = p.xyz[1];
		xyz.data[xyz.offset++] = p.xyz[2];

		texCoord.data[texCoord.offset++] = p.st[0];
		texCoord.data[texCoord.offset++] = p.st[1];

		color.data[color.offset++] = p.modulate[0];
		color.data[color.offset++] = p.modulate[1];
		color.data[color.offset++] = p.modulate[2];
		color.data[color.offset++] = p.modulate[3];
	}

	// Generate fan indexes into the tess array.
	for (var i = 0; i < refent.numPolyVerts-2; i++) {
		index.data[index.offset++] = indexOffset + 0;
		index.data[index.offset++] = indexOffset + i + 1;
		index.data[index.offset++] = indexOffset + i + 2;
	}

	index.modified = true;
	xyz.modified = true;
	texCoord.modified = true;
	color.modified = true;

	tess.index = backend.scratchBuffers.index;
	tess.xyz = backend.scratchBuffers.xyz;
	tess.texCoord = backend.scratchBuffers.texCoord;
	tess.color = backend.scratchBuffers.color;
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
	var index = backend.scratchBuffers.index;
	var xyz = backend.scratchBuffers.xyz;
	var normal = backend.scratchBuffers.normal;
	var texCoord = backend.scratchBuffers.texCoord;
	var color = backend.scratchBuffers.color;
	var indexOffset = xyz.elementCount;

	// Triangle indexes for a simple quad.
	index.data[index.offset++] = indexOffset;
	index.data[index.offset++] = indexOffset + 1;
	index.data[index.offset++] = indexOffset + 3;

	index.data[index.offset++] = indexOffset + 3;
	index.data[index.offset++] = indexOffset + 1;
	index.data[index.offset++] = indexOffset + 2;

	xyz.data[xyz.offset++] = origin[0] + left[0] + up[0];
	xyz.data[xyz.offset++] = origin[1] + left[1] + up[1];
	xyz.data[xyz.offset++] = origin[2] + left[2] + up[2];

	xyz.data[xyz.offset++] = origin[0] - left[0] + up[0];
	xyz.data[xyz.offset++] = origin[1] - left[1] + up[1];
	xyz.data[xyz.offset++] = origin[2] - left[2] + up[2];

	xyz.data[xyz.offset++] = origin[0] - left[0] - up[0];
	xyz.data[xyz.offset++] = origin[1] - left[1] - up[1];
	xyz.data[xyz.offset++] = origin[2] - left[2] - up[2];

	xyz.data[xyz.offset++] = origin[0] + left[0] - up[0];
	xyz.data[xyz.offset++] = origin[1] + left[1] - up[1];
	xyz.data[xyz.offset++] = origin[2] + left[2] - up[2];

	// Constant normal all the way around.
	var norm = vec3.negate(backend.viewParms.or.axis[0], [0, 0, 0]);

	normal.data[normal.offset++] = norm[0];
	normal.data[normal.offset++] = norm[1];
	normal.data[normal.offset++] = norm[2];

	normal.data[normal.offset++] = norm[0];
	normal.data[normal.offset++] = norm[1];
	normal.data[normal.offset++] = norm[2];

	normal.data[normal.offset++] = norm[0];
	normal.data[normal.offset++] = norm[1];
	normal.data[normal.offset++] = norm[2];

	normal.data[normal.offset++] = norm[0];
	normal.data[normal.offset++] = norm[1];
	normal.data[normal.offset++] = norm[2];

	// Standard square texture coordinates.
	texCoord.data[texCoord.offset++] = s1;
	texCoord.data[texCoord.offset++] = t1;

	texCoord.data[texCoord.offset++] = s2;
	texCoord.data[texCoord.offset++] = t1;

	texCoord.data[texCoord.offset++] = s2;
	texCoord.data[texCoord.offset++] = t2;

	texCoord.data[texCoord.offset++] = s1;
	texCoord.data[texCoord.offset++] = t2;

	// Constant color all the way around.
	color.data[color.offset++] = color[0] / 255;
	color.data[color.offset++] = color[1] / 255;
	color.data[color.offset++] = color[2] / 255;
	color.data[color.offset++] = color[3] / 255;

	color.data[color.offset++] = color[0] / 255;
	color.data[color.offset++] = color[1] / 255;
	color.data[color.offset++] = color[2] / 255;
	color.data[color.offset++] = color[3] / 255;

	color.data[color.offset++] = color[0] / 255;
	color.data[color.offset++] = color[1] / 255;
	color.data[color.offset++] = color[2] / 255;
	color.data[color.offset++] = color[3] / 255;

	color.data[color.offset++] = color[0] / 255;
	color.data[color.offset++] = color[1] / 255;
	color.data[color.offset++] = color[2] / 255;
	color.data[color.offset++] = color[3] / 255;

	index.modified = true;
	xyz.modified = true;
	normal.modified = true;
	texCoord.modified = true;
	color.modified = true;
}