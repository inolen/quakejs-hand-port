/**
 * UpdateWorldGeometry
 */
function UpdateWorldGeometry(geo) {
	backend.dlightBits |= geo.dlightBits;

	if (geo.attributes) {  // static
		return;
	}

	var verts = re.world.verts;
	var meshVerts = re.world.meshVerts;

	InitBuffers(geo, geo.numVerts, geo.numIndexes, {
		'index':      'uint',
		'position':   'vec3',
		'normal':     'vec3',
		'texCoord':   'vec2',
		'lightCoord': 'vec2',
		'color':      'vec4'
	});

	var index = geo.attributes.index;
	var position = geo.attributes.position;
	var normal = geo.attributes.normal;
	var texCoord = geo.attributes.texCoord;
	var lightCoord = geo.attributes.lightCoord;
	var color = geo.attributes.color;

	for (var i = 0; i < geo.faces.length; i++) {
		var face = geo.faces[i];
		var positionOffset = position.offset / position.size;

		for (var j = 0; j < face.vertCount; j++) {
			var vert = verts[face.vertex + j];

			position.array[position.offset++] = vert.pos[0];
			position.array[position.offset++] = vert.pos[1];
			position.array[position.offset++] = vert.pos[2];

			normal.array[normal.offset++] = vert.normal[0];
			normal.array[normal.offset++] = vert.normal[1];
			normal.array[normal.offset++] = vert.normal[2];

			texCoord.array[texCoord.offset++] = vert.texCoord[0];
			texCoord.array[texCoord.offset++] = vert.texCoord[1];

			lightCoord.array[lightCoord.offset++] = vert.lmCoord[0];
			lightCoord.array[lightCoord.offset++] = vert.lmCoord[1];

			color.array[color.offset++] = vert.color[0];
			color.array[color.offset++] = vert.color[1];
			color.array[color.offset++] = vert.color[2];
			color.array[color.offset++] = vert.color[3];
		}

		for (var j = 0; j < face.meshVertCount; j++) {
			index.array[index.offset++] = positionOffset + meshVerts[face.meshVert + j];
		}
	}

	// These are no longer needed, clear them off the heap.
	geo.faces = null;

	index.update = true;
	position.update = true;
	normal.update = true;
	texCoord.update = true;
	lightCoord.update = true;
	color.update = true;
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
	var refent = backend.currentEntity;
	var numVerts = surface.numVerts;
	var numIndexes = surface.indexes.length;
	var firstTime = !geo.attributes;

	if (firstTime) {
		InitBuffers(geo, numVerts, numIndexes, {
			'index':      'uint',
			'position':   'vec3',
			'normal':     'vec3',
			'texCoord':   'vec2'
		});
	}

	var index = geo.attributes.index;
	var position = geo.attributes.position;
	var normal = geo.attributes.normal;
	var texCoord = geo.attributes.texCoord;
	var color = geo.attributes.color;

	var positionOffset = position.offset / position.size;
	var oldXyz = vec3.create();
	var newXyz = vec3.create();
	var oldNormal = vec3.create();
	var newNormal = vec3.create();
	var newColor = [0, 0, 0, 0];

	// We try to avoid updating the vertice buffers as much as possible.
	var backlerp = refent.oldFrame === refent.frame ? 0 : refent.backlerp;
	var updateVertices = firstTime || backlerp !== geo.backlerp;

	// Reset the buffers.
	if (updateVertices) {
		position.offset = 0;
		normal.offset = 0;
	}

	// Don't update again until the backlerp has changed.
	geo.backlerp = backlerp;

	for (var i = 0; i < numVerts; i++) {
		vec3.set(surface.xyz[refent.frame * numVerts + i], newXyz);
		vec3.set(surface.normals[refent.frame * numVerts + i], newNormal);

		if (updateVertices) {
			// Lerp xyz / normal.
			if (backlerp !== 0.0) {
				vec3.set(surface.xyz[refent.oldFrame * numVerts + i], oldXyz);
				vec3.set(surface.normals[refent.oldFrame * numVerts + i], oldNormal);

				for (var j = 0; j < 3; j++) {
					newXyz[j] = newXyz[j] + backlerp * (oldXyz[j] - newXyz[j]);
					newNormal[j] = newNormal[j] + backlerp * (oldNormal[j] - newNormal[j]);
				}
			}

			position.array[position.offset++] = newXyz[0];
			position.array[position.offset++] = newXyz[1];
			position.array[position.offset++] = newXyz[2];

			normal.array[normal.offset++] = newNormal[0];
			normal.array[normal.offset++] = newNormal[1];
			normal.array[normal.offset++] = newNormal[2];
		}

		if (firstTime) {
			texCoord.array[texCoord.offset++] = surface.st[i][0];
			texCoord.array[texCoord.offset++] = surface.st[i][1];
		}
	}

	if (updateVertices) {
		position.update = true;
		normal.update = true;
	}

	if (firstTime) {
		for (var i = 0; i < surface.indexes.length; i++) {
			index.array[index.offset++] = positionOffset + surface.indexes[i];
		}

		index.update = true;
		texCoord.update = true;
	}
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
	var texCoord = geo.attributes.texCoord;
	var color = geo.attributes.color;

	var positionOffset = position.offset / position.size;
	var numPolyVerts = refent.polyVerts.length;

	// Fan triangles into the tess array.
	for (var i = 0; i < numPolyVerts; i++) {
		var p = refent.polyVerts[i];

		position.array[position.offset++] = p.xyz[0];
		position.array[position.offset++] = p.xyz[1];
		position.array[position.offset++] = p.xyz[2];

		texCoord.array[texCoord.offset++] = p.st[0];
		texCoord.array[texCoord.offset++] = p.st[1];

		color.array[color.offset++] = p.modulate[0];
		color.array[color.offset++] = p.modulate[1];
		color.array[color.offset++] = p.modulate[2];
		color.array[color.offset++] = p.modulate[3];
	}

	// Generate fan indexes into the tess array.
	for (var i = 0; i < numPolyVerts - 2; i++) {
		index.array[index.offset++] = positionOffset + 0;
		index.array[index.offset++] = positionOffset + i + 1;
		index.array[index.offset++] = positionOffset + i + 2;
	}

	index.update = true;
	position.update = true;
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
	var positionOffset = position.offset / position.size;

	// Triangle indexes for a simple quad.
	index.array[index.offset++] = positionOffset;
	index.array[index.offset++] = positionOffset + 1;
	index.array[index.offset++] = positionOffset + 3;

	index.array[index.offset++] = positionOffset + 3;
	index.array[index.offset++] = positionOffset + 1;
	index.array[index.offset++] = positionOffset + 2;

	position.array[position.offset++] = origin[0] + left[0] + up[0];
	position.array[position.offset++] = origin[1] + left[1] + up[1];
	position.array[position.offset++] = origin[2] + left[2] + up[2];

	position.array[position.offset++] = origin[0] - left[0] + up[0];
	position.array[position.offset++] = origin[1] - left[1] + up[1];
	position.array[position.offset++] = origin[2] - left[2] + up[2];

	position.array[position.offset++] = origin[0] - left[0] - up[0];
	position.array[position.offset++] = origin[1] - left[1] - up[1];
	position.array[position.offset++] = origin[2] - left[2] - up[2];

	position.array[position.offset++] = origin[0] + left[0] - up[0];
	position.array[position.offset++] = origin[1] + left[1] - up[1];
	position.array[position.offset++] = origin[2] + left[2] - up[2];

	// Constant normal all the way around.
	var norm = vec3.negate(backend.viewParms.or.axis[0], vec3.create());

	normal.array[normal.offset++] = norm[0];
	normal.array[normal.offset++] = norm[1];
	normal.array[normal.offset++] = norm[2];

	normal.array[normal.offset++] = norm[0];
	normal.array[normal.offset++] = norm[1];
	normal.array[normal.offset++] = norm[2];

	normal.array[normal.offset++] = norm[0];
	normal.array[normal.offset++] = norm[1];
	normal.array[normal.offset++] = norm[2];

	normal.array[normal.offset++] = norm[0];
	normal.array[normal.offset++] = norm[1];
	normal.array[normal.offset++] = norm[2];

	// Standard square texture coordinates.
	texCoord.array[texCoord.offset++] = s1;
	texCoord.array[texCoord.offset++] = t1;

	texCoord.array[texCoord.offset++] = s2;
	texCoord.array[texCoord.offset++] = t1;

	texCoord.array[texCoord.offset++] = s2;
	texCoord.array[texCoord.offset++] = t2;

	texCoord.array[texCoord.offset++] = s1;
	texCoord.array[texCoord.offset++] = t2;

	// Constant color all the way around.
	color.array[color.offset++] = modulate[0];
	color.array[color.offset++] = modulate[1];
	color.array[color.offset++] = modulate[2];
	color.array[color.offset++] = modulate[3];

	color.array[color.offset++] = modulate[0];
	color.array[color.offset++] = modulate[1];
	color.array[color.offset++] = modulate[2];
	color.array[color.offset++] = modulate[3];

	color.array[color.offset++] = modulate[0];
	color.array[color.offset++] = modulate[1];
	color.array[color.offset++] = modulate[2];
	color.array[color.offset++] = modulate[3];

	color.array[color.offset++] = modulate[0];
	color.array[color.offset++] = modulate[1];
	color.array[color.offset++] = modulate[2];
	color.array[color.offset++] = modulate[3];

	index.update = true;
	position.update = true;
	normal.update = true;
	texCoord.update = true;
	color.update = true;
}
