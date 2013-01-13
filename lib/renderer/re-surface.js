/**
 * UpdateWorldGeometry
 */
function UpdateWorldGeometry(geo) {
	backend.dlightBits |= geo.dlightBits;

	if (geo.initialized) {  // static
		return;
	}

	var verts = re.world.verts;
	var meshVerts = re.world.meshVerts;

	var index      = geo.attributes.index      = CreateBuffer('index',      geo.numIndexes, 'uint');
	var position   = geo.attributes.position   = CreateBuffer('position',   geo.numVerts,   'vec3');
	var normal     = geo.attributes.normal     = CreateBuffer('normal',     geo.numVerts,   'vec3');
	var texCoord   = geo.attributes.texCoord   = CreateBuffer('texCoord',   geo.numVerts,   'vec2');
	var lightCoord = geo.attributes.lightCoord = CreateBuffer('lightCoord', geo.numVerts,   'vec2');
	var color      = geo.attributes.color      = CreateBuffer('color',      geo.numVerts,   'vec4');

	for (var i = 0; i < geo.faces.length; i++) {
		var face = geo.faces[i];
		var positionOffset = position.index / position.size;

		for (var j = 0; j < face.vertCount; j++) {
			var vert = verts[face.vertex + j];

			position.array[position.index++] = vert.pos[0];
			position.array[position.index++] = vert.pos[1];
			position.array[position.index++] = vert.pos[2];

			normal.array[normal.index++] = vert.normal[0];
			normal.array[normal.index++] = vert.normal[1];
			normal.array[normal.index++] = vert.normal[2];

			texCoord.array[texCoord.index++] = vert.texCoord[0];
			texCoord.array[texCoord.index++] = vert.texCoord[1];

			lightCoord.array[lightCoord.index++] = vert.lmCoord[0];
			lightCoord.array[lightCoord.index++] = vert.lmCoord[1];

			color.array[color.index++] = vert.color[0];
			color.array[color.index++] = vert.color[1];
			color.array[color.index++] = vert.color[2];
			color.array[color.index++] = vert.color[3];
		}

		for (var j = 0; j < face.meshVertCount; j++) {
			index.array[index.index++] = positionOffset + meshVerts[face.meshVert + j];
		}
	}

	index.update = true;
	position.update = true;
	normal.update = true;
	texCoord.update = true;
	lightCoord.update = true;
	color.update = true;

	geo.initialized = true;
	// These are no longer needed, clear them off the heap.
	geo.faces = null;
}

/**
 * UpdateMd3Geometry
 *
 * This is called by both the backend, and the model code
 * when caching single-frame models. For that reason, refent
 * may not be valid, and in that case, we can assume this is
 * a single-frame model being precompiled.
 */
function UpdateMd3Geometry(geo) {
	var surface = geo.surface;
	var numFrames = surface.numFrames;
	var numVerts = surface.numVerts;
	var refent = backend.currentEntity;

	if (geo.initialized) {
		// Just update the frame offsets.
		geo.attributes.position.offset  = refent.frame * numVerts * 3;
		geo.attributes.normal.offset    = geo.attributes.position.offset;

		geo.attributes.position2.offset = refent.oldFrame * numVerts * 3;
		geo.attributes.normal2.offset   = geo.attributes.position2.offset;
		return;
	}

	var numIndexes = surface.indexes.length;

	var index     = geo.attributes.index     = CreateBuffer('index',    numIndexes,             'uint');
	var position  = geo.attributes.position  = CreateBuffer('position', numFrames * numVerts,   'vec3');
	var position2 = geo.attributes.position2 = position.clone();
	var normal    = geo.attributes.normal    = CreateBuffer('normal',   numFrames * numVerts,   'vec3');
	var normal2   = geo.attributes.normal2   = normal.clone();
	var texCoord  = geo.attributes.texCoord  = CreateBuffer('texCoord', numVerts,               'vec2');

	for (var i = 0; i < numFrames; i++) {
		for (var j = 0; j < numVerts; j++) {
			var idx = i * numVerts + j;

			position.array[position.index++] = surface.xyz[idx][0];
			position.array[position.index++] = surface.xyz[idx][1];
			position.array[position.index++] = surface.xyz[idx][2];

			normal.array[normal.index++] = surface.normals[idx][0];
			normal.array[normal.index++] = surface.normals[idx][1];
			normal.array[normal.index++] = surface.normals[idx][2];

			if (i === 0) {
				texCoord.array[texCoord.index++] = surface.st[j][0];
				texCoord.array[texCoord.index++] = surface.st[j][1];
			}
		}
	}

	for (var i = 0; i < surface.indexes.length; i++) {
		index.array[index.index++] = surface.indexes[i];
	}

	// We interpolate animation frames in the VP, so we'll share the
	// same VBOs for position2 and normal2, just changing the offset
	// for each frame.
	geo.attributes.position.offset  = refent.frame * numVerts * 3;

	geo.attributes.normal.offset    = refent.frame * numVerts * 3;

	geo.attributes.position2.index  = geo.attributes.position.index;
	geo.attributes.position2.offset = refent.oldFrame * numVerts * 3;

	geo.attributes.normal2.index    = geo.attributes.normal.index;
	geo.attributes.normal2.offset   = refent.oldFrame * numVerts * 3;

	position.update = true;
	position2.update = true;
	normal.update = true;
	normal2.update = true;
	texCoord.update = true;
	index.update = true;

	geo.initialized = true;
}

/**
 * UpdateEntityGeometry
 */
function UpdateEntityGeometry(geo) {
	switch (backend.currentEntity.reType) {
		case RT.POLY:
			UpdatePoly(geo);
			break;

		case RT.SPRITE:
			UpdateSprite(geo);
			break;

		case RT.RAIL_CORE:
			UpdateRailCore(geo);
			break;

		case RT.LIGHTNING:
			UpdateLightningBolt(geo);
			break;
	}
}

/**
 * UpdatePoly
 */
function UpdatePoly(geo) {
	var refent = backend.currentEntity;
	var index = geo.attributes.index;
	var position = geo.attributes.position;
	var normal = geo.attributes.normal;
	var texCoord = geo.attributes.texCoord;
	var color = geo.attributes.color;

	var positionOffset = position.index / position.size;
	var numPolyVerts = refent.polyVerts.length;

	// Fan triangles into the tess array.
	for (var i = 0; i < numPolyVerts; i++) {
		var p = refent.polyVerts[i];

		position.array[position.index++] = p.xyz[0];
		position.array[position.index++] = p.xyz[1];
		position.array[position.index++] = p.xyz[2];

		normal.array[normal.index++] = 0;
		normal.array[normal.index++] = 0;
		normal.array[normal.index++] = 0;

		texCoord.array[texCoord.index++] = p.st[0];
		texCoord.array[texCoord.index++] = p.st[1];

		color.array[color.index++] = p.modulate[0];
		color.array[color.index++] = p.modulate[1];
		color.array[color.index++] = p.modulate[2];
		color.array[color.index++] = p.modulate[3];
	}

	// Generate fan indexes into the tess array.
	for (var i = 0; i < numPolyVerts - 2; i++) {
		index.array[index.index++] = positionOffset + 0;
		index.array[index.index++] = positionOffset + i + 1;
		index.array[index.index++] = positionOffset + i + 2;
	}

	index.update = true;
	position.update = true;
	normal.update = true;
	texCoord.update = true;
	color.update = true;
}

/**
 * UpdateSprite
 */
function UpdateSprite(geo) {
	var refent = backend.currentEntity;
	var radius = refent.radius;
	var left = vec3.create();
	var up = vec3.create();

	// Calculate the xyz locations for the four corners
	if (refent.rotation === 0) {
		vec3.scale(backend.viewParms.or.axis[1], radius, left);
		vec3.scale(backend.viewParms.or.axis[2], radius, up);
	} else {
		var ang = Math.PI * refent.rotation / 180;
		var s = Math.sin(ang);
		var c = Math.cos(ang);

		vec3.scale(backend.viewParms.or.axis[1], c * radius, left);
		vec3.add(left, vec3.scale(backend.viewParms.or.axis[2], -s * radius, vec3.create()), left);

		vec3.scale(backend.viewParms.or.axis[2], c * radius, up);
		vec3.add(up, vec3.scale(backend.viewParms.or.axis[1], s * radius, vec3.create()), up);
	}

	// if (backend.viewParms.isMirror) {
	// 	vec3.negate(left);
	// }

	AddQuadStamp(geo, refent.origin, left, up, refent.shaderRGBA);
}

/**
 * UpdateLightningBolt
 */
function UpdateLightningBolt(geo) {
	var refent = backend.currentEntity;

	var start = vec3.create(refent.origin);
	var end = vec3.create(refent.oldOrigin);

	var forward = vec3.subtract(end, start, vec3.create());
	vec3.normalize(forward);

	// Compute side vector.
	var v1 = vec3.subtract(start, backend.viewParms.or.origin, vec3.create());
	vec3.normalize(v1);
	var v2 = vec3.subtract(end, backend.viewParms.or.origin, vec3.create());
	vec3.normalize(v2);
	var right = vec3.cross(v1, v2, vec3.create());
	vec3.normalize(right);

	for (var i = 0; i < 4; i++) {
		DoRailCore(geo, start, end, right, 8, refent.shaderRGBA);
		QMath.RotatePointAroundVector(right, forward, 45);
	}
}

/**
 * UpdateRailCore
 */
function UpdateRailCore(geo) {
	var refent = backend.currentEntity;

	var start = vec3.create(refent.origin);
	var end = vec3.create(refent.oldOrigin);

	// Compute side vector.
	var v1 = vec3.subtract(start, backend.viewParms.or.origin, vec3.create());
	vec3.normalize(v1);
	var v2 = vec3.subtract(end, backend.viewParms.or.origin, vec3.create());
	vec3.normalize(v2);
	var right = vec3.cross(v1, v2, vec3.create());
	vec3.normalize(right);

	DoRailCore(geo, start, end, right, r_railCoreWidth(), refent.shaderRGBA);
}

/**
 * DoRailCore
 */
function DoRailCore(geo, start, end, right, spanWidth, modulate) {
	var dir = vec3.subtract(end, start, vec3.create());
	var len = vec3.length(dir);

	var t = len / 256;

	// This is a bit odd, the up vector for the quad
	// describes the narrow part of the rail.
	var left = vec3.scale(dir, -0.5, vec3.create());
	var up = vec3.scale(right, spanWidth, vec3.create());
	var center = vec3.subtract(start, left);

	AddQuadStampExt(geo, center, left, up, modulate, 0, 0, t, 1);
}

/**
 * AddQuadStamp
 */
function AddQuadStamp(geo, origin, left, up, modulate) {
	AddQuadStampExt(geo, origin, left, up, modulate, 0, 0, 1, 1);
}

/**
 * AddQuadStampExt
 */
function AddQuadStampExt(geo, origin, left, up, modulate, s1, t1, s2, t2) {
	var index = geo.attributes.index;
	var position = geo.attributes.position;
	var normal = geo.attributes.normal;
	var texCoord = geo.attributes.texCoord;
	var color = geo.attributes.color;
	var positionOffset = position.index / position.size;

	// Triangle indexes for a simple quad.
	index.array[index.index++] = positionOffset;
	index.array[index.index++] = positionOffset + 1;
	index.array[index.index++] = positionOffset + 3;

	index.array[index.index++] = positionOffset + 3;
	index.array[index.index++] = positionOffset + 1;
	index.array[index.index++] = positionOffset + 2;

	position.array[position.index++] = origin[0] + left[0] + up[0];
	position.array[position.index++] = origin[1] + left[1] + up[1];
	position.array[position.index++] = origin[2] + left[2] + up[2];

	position.array[position.index++] = origin[0] - left[0] + up[0];
	position.array[position.index++] = origin[1] - left[1] + up[1];
	position.array[position.index++] = origin[2] - left[2] + up[2];

	position.array[position.index++] = origin[0] - left[0] - up[0];
	position.array[position.index++] = origin[1] - left[1] - up[1];
	position.array[position.index++] = origin[2] - left[2] - up[2];

	position.array[position.index++] = origin[0] + left[0] - up[0];
	position.array[position.index++] = origin[1] + left[1] - up[1];
	position.array[position.index++] = origin[2] + left[2] - up[2];

	// Constant normal all the way around.
	var norm = vec3.negate(backend.viewParms.or.axis[0], vec3.create());

	normal.array[normal.index++] = norm[0];
	normal.array[normal.index++] = norm[1];
	normal.array[normal.index++] = norm[2];

	normal.array[normal.index++] = norm[0];
	normal.array[normal.index++] = norm[1];
	normal.array[normal.index++] = norm[2];

	normal.array[normal.index++] = norm[0];
	normal.array[normal.index++] = norm[1];
	normal.array[normal.index++] = norm[2];

	normal.array[normal.index++] = norm[0];
	normal.array[normal.index++] = norm[1];
	normal.array[normal.index++] = norm[2];

	// Standard square texture coordinates.
	texCoord.array[texCoord.index++] = s1;
	texCoord.array[texCoord.index++] = t1;

	texCoord.array[texCoord.index++] = s2;
	texCoord.array[texCoord.index++] = t1;

	texCoord.array[texCoord.index++] = s2;
	texCoord.array[texCoord.index++] = t2;

	texCoord.array[texCoord.index++] = s1;
	texCoord.array[texCoord.index++] = t2;

	// Constant color all the way around.
	color.array[color.index++] = modulate[0];
	color.array[color.index++] = modulate[1];
	color.array[color.index++] = modulate[2];
	color.array[color.index++] = modulate[3];

	color.array[color.index++] = modulate[0];
	color.array[color.index++] = modulate[1];
	color.array[color.index++] = modulate[2];
	color.array[color.index++] = modulate[3];

	color.array[color.index++] = modulate[0];
	color.array[color.index++] = modulate[1];
	color.array[color.index++] = modulate[2];
	color.array[color.index++] = modulate[3];

	color.array[color.index++] = modulate[0];
	color.array[color.index++] = modulate[1];
	color.array[color.index++] = modulate[2];
	color.array[color.index++] = modulate[3];

	index.update = true;
	position.update = true;
	normal.update = true;
	texCoord.update = true;
	color.update = true;
}
