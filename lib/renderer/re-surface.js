/**
 * TesselateFace
 *
 * Called both by the backend and re-world when
 * pre-compiling the faces.
 */
function TesselateFace(face) {
	var tess = backend.tess;
	var verts = re.world.verts;
	var meshVerts = re.world.meshVerts;

	var xyz = tess.xyz;
	var normal = tess.normal;
	var texCoord = tess.texCoord;
	var lightCoord = tess.lightCoord;
	var color = tess.color;
	var index = tess.index;
	var xyzOffset = xyz.elementCount;

	for (var i = 0; i < face.vertCount; i++) {
		var vert = verts[face.vertex + i];

		xyz.data[xyz.offset++] = vert.pos[0];
		xyz.data[xyz.offset++] = vert.pos[1];
		xyz.data[xyz.offset++] = vert.pos[2];

		normal.data[normal.offset++] = vert.normal[0];
		normal.data[normal.offset++] = vert.normal[1];
		normal.data[normal.offset++] = vert.normal[2];

		texCoord.data[texCoord.offset++] = vert.texCoord[0];
		texCoord.data[texCoord.offset++] = vert.texCoord[1];

		lightCoord.data[lightCoord.offset++] = vert.lmCoord[0];
		lightCoord.data[lightCoord.offset++] = vert.lmCoord[1];

		color.data[color.offset++] = vert.color[0];
		color.data[color.offset++] = vert.color[1];
		color.data[color.offset++] = vert.color[2];
		color.data[color.offset++] = vert.color[3];
	}

	for (var k = 0; k < face.meshVertCount; k++) {
		index.data[index.offset++] = xyzOffset + meshVerts[face.meshVert + k];
	}

	xyz.modified = true;
	normal.modified = true;
	texCoord.modified = true;
	lightCoord.modified = true;
	color.modified = true;
	index.modified = true;
}

/**
 * TesselateFaceBatch
 */
function TesselateFaceBatch(compiled) {
	var tess = backend.tess;
	var cmd = compiled.cmd;

	if (tess.indexCount) {
		error('A batch tess function should always be called from a reset state');
	}

	//
	// Overwrite default buffers.
	//
	tess.xyz = cmd.xyz;
	tess.normal = cmd.normal;
	tess.texCoord = cmd.texCoord;
	tess.lightCoord = cmd.lightCoord;
	tess.color = cmd.color;
	tess.index = cmd.index;

	tess.indexOffset = cmd.indexOffset;
	tess.indexCount = cmd.indexCount;
}

/**
 * TesselateMd3
 *
 * This is called by both the backend, and the model code
 * when caching single-frame models. For that reason, refent
 * may not be valid, and in that case, we can assume this is
 * a single-frame model being precompiled.
 */
function TesselateMd3(face) {
	var tess = backend.tess;
	var refent = backend.currentEntity;
	var precompiling = !refent;
	var oldXyz = [0, 0, 0];
	var newXyz = [0, 0, 0];
	var oldNormal = [0, 0, 0];
	var newNormal = [0, 0, 0];
	var newColor = [0, 0, 0, 0];

	//
	// Update the scratch vertex buffers.
	//
	var xyz = tess.xyz;
	var normal = tess.normal;
	var texCoord = tess.texCoord;
	var color = tess.color;
	var index = tess.index;

	var numVerts = face.header.numVerts;
	var backlerp = 0;
	if (!precompiling) {
		backlerp = refent.oldFrame === refent.frame ? 0 : refent.backlerp;
	}
	var xyzOffset = xyz.elementCount;
	var oldXyzNormal;
	var newXyzNormal;

	for (var i = 0; i < numVerts; i++) {
		if (precompiling) {
			newXyzNormal = face.xyzNormals[i];

			vec3.set(newXyzNormal.xyz, newXyz);
			vec3.set(newXyzNormal.normal, newNormal);
		} else {
			oldXyzNormal = face.xyzNormals[refent.oldFrame * numVerts + i];
			newXyzNormal = face.xyzNormals[refent.frame * numVerts + i];

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

			CalcDiffuseColor(refent, newNormal, newColor);
		}

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
	for (var i = 0; i < face.triangles.length; i++) {
		var tri = face.triangles[i];

		index.data[index.offset++] = xyzOffset + tri.indexes[0];
		index.data[index.offset++] = xyzOffset + tri.indexes[1];
		index.data[index.offset++] = xyzOffset + tri.indexes[2];
	}

	xyz.modified = true;
	normal.modified = true;
	texCoord.modified = true;
	color.modified = true;
	index.modified = true;
}

/**
 * TesselateMd3Batch
 */
function TesselateMd3Batch(compiled) {
	var tess = backend.tess;
	var refent = backend.currentEntity;
	var cmd = compiled.cmd;

	if (tess.indexCount) {
		error('A batch tess function should always be called from a reset state');
	}

	//
	// Overwrite default buffers.
	//
	tess.xyz = cmd.xyz;
	tess.normal = cmd.normal;
	tess.texCoord = cmd.texCoord;
	tess.color = cmd.color;
	tess.index = cmd.index;

	tess.indexOffset = cmd.indexOffset;
	tess.indexCount = cmd.indexCount;

	//
	// Update the color buffers.
	//
	var color = tess.color;
	var newColor = [0, 0, 0, 0];
	var numVerts = compiled.header.numVerts;

	// Use the original color offset so we match up with the index buffer.
	var offset = compiled.colorOffset;

	for (var i = 0; i < numVerts; i++) {
		var xyzNormal = compiled.xyzNormals[i];
		CalcDiffuseColor(refent, xyzNormal.normal, newColor);
		color.data[offset++] = newColor[0];
		color.data[offset++] = newColor[1];
		color.data[offset++] = newColor[2];
		color.data[offset++] = newColor[3];
	}

	// Update the buffer's internal offset to grow it if necessary.
	if (offset > color.offset) {
		color.offset = offset;
	}

	color.modified = true;
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

		case RT.LIGHTNING:
			TesselateLightningBolt();
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

	var numPolyVerts = refent.polyVerts.length;

	// Fan triangles into the tess array.
	for (var i = 0; i < numPolyVerts; i++) {
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
	for (var i = 0; i < numPolyVerts - 2; i++) {
		index.data[index.offset++] = indexOffset + 0;
		index.data[index.offset++] = indexOffset + i + 1;
		index.data[index.offset++] = indexOffset + i + 2;
	}

	index.modified = true;
	xyz.modified = true;
	texCoord.modified = true;
	color.modified = true;
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
}

/**
 * TesselateLightningBolt
 */
function TesselateLightningBolt() {
	var refent = backend.currentEntity;

	var start = vec3.set(refent.origin, [0, 0, 0]);
	var end = vec3.set(refent.oldOrigin, [0, 0, 0]);

	var forward = vec3.subtract(end, start, [0, 0, 0]);
	vec3.normalize(forward);

	// Compute side vector.
	var v1 = vec3.subtract(start, backend.viewParms.or.origin, [0, 0, 0]);
	vec3.normalize(v1);
	var v2 = vec3.subtract(end, backend.viewParms.or.origin, [0, 0, 0]);
	vec3.normalize(v2);
	var right = vec3.cross(v1, v2, [0, 0, 0]);
	vec3.normalize(right);

	for (var i = 0; i < 4; i++) {
		DoRailCore(start, end, right, 8, refent.shaderRGBA);
		QMath.RotatePointAroundVector(right, forward, 45);
	}
}

/**
 * TesselateRailCore
 */
function TesselateRailCore() {
	var refent = backend.currentEntity;

	var start = vec3.set(refent.origin, [0, 0, 0]);
	var end = vec3.set(refent.oldOrigin, [0, 0, 0]);

	// Compute side vector.
	var v1 = vec3.subtract(start, backend.viewParms.or.origin, [0, 0, 0]);
	vec3.normalize(v1);
	var v2 = vec3.subtract(end, backend.viewParms.or.origin, [0, 0, 0]);
	vec3.normalize(v2);
	var right = vec3.cross(v1, v2, [0, 0, 0]);
	vec3.normalize(right);

	DoRailCore(start, end, right, r_railCoreWidth(), refent.shaderRGBA);
}

/**
 * DoRailCore
 */
function DoRailCore(start, end, right, spanWidth, modulate) {
	var dir = vec3.subtract(end, start, [0, 0, 0]);
	var len = vec3.length(dir);

	var t = len / 256;

	// This is a bit odd, the up vector for the quad
	// describes the narrow part of the rail.
	var left = vec3.scale(dir, -0.5, [0, 0, 0]);
	var up = vec3.scale(right, spanWidth, [0, 0, 0]);
	var center = vec3.subtract(start, left);

	AddQuadStampExt(center, left, up, modulate, 0, 0, t, 1);
}

/**
 * AddQuadStamp
 */
function AddQuadStamp(origin, left, up, modulate) {
	AddQuadStampExt(origin, left, up, modulate, 0, 0, 1, 1);
}

/**
 * AddQuadStampExt
 */
function AddQuadStampExt(origin, left, up, modulate, s1, t1, s2, t2) {
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
	color.data[color.offset++] = modulate[0];
	color.data[color.offset++] = modulate[1];
	color.data[color.offset++] = modulate[2];
	color.data[color.offset++] = modulate[3];

	color.data[color.offset++] = modulate[0];
	color.data[color.offset++] = modulate[1];
	color.data[color.offset++] = modulate[2];
	color.data[color.offset++] = modulate[3];

	color.data[color.offset++] = modulate[0];
	color.data[color.offset++] = modulate[1];
	color.data[color.offset++] = modulate[2];
	color.data[color.offset++] = modulate[3];

	color.data[color.offset++] = modulate[0];
	color.data[color.offset++] = modulate[1];
	color.data[color.offset++] = modulate[2];
	color.data[color.offset++] = modulate[3];

	index.modified = true;
	xyz.modified = true;
	normal.modified = true;
	texCoord.modified = true;
	color.modified = true;
}
