/**
 * InitBackend
 */
function InitBackend() {
	// backend.scratchBuffers = {
	// 	index:      CreateBuffer('uint16',  1, SHADER_MAX_INDEXES, true),
	// 	xyz:        CreateBuffer('float32', 3, SHADER_MAX_VERTEXES),
	// 	normal:     CreateBuffer('float32', 3, SHADER_MAX_VERTEXES),
	// 	texCoord:   CreateBuffer('float32', 2, SHADER_MAX_VERTEXES),
	// 	lightCoord: CreateBuffer('float32', 2, SHADER_MAX_VERTEXES),
	// 	color:      CreateBuffer('uint8',   4, SHADER_MAX_VERTEXES)
	// };

	// backend.debugBuffers = {
	// 	index: CreateBuffer('uint16',  1, 0xFFFF, true),
	// 	xyz:   CreateBuffer('float32', 3, 0xFFFF)
	// };
}

/**
 * RenderDrawGeometry
 */
function RenderDrawGeometry(first, last) {
	// Copy off frontend vars for us to work with.
	// NOTE: This is totally unneccesary. Our backend could just
	// as well access re.refdef, however, we're going to follow
	// ioquake3's convention here, maybe one day we'll want SMP.
	re.refdef.clone(backend.refdef);
	re.viewParms.clone(backend.viewParms);

	var world = re.world;
	var shaders = world.shaders;
	var refdef = backend.refdef;
	var parms = backend.viewParms;
	var drawGeom = backend.drawGeom;
	var sortedShaders = re.sortedShaders;

	// Setup the GL context.
	BeginDrawingView();

	//
	UpdateDlights();

	//
	var oldShader = null;
	var oldEntityNum = -1;
	var modelMatrix;

	backend.currentEntity = null;

	// Save original time for entity shader offsets.
	var originalTime = backend.refdef.timeSecs;

	for (var i = first; i < last; i++) {
		var draw = drawGeom[i];
		var geo = draw.geo;

		var shader = sortedShaders[(draw.sort >> QSORT_SHADERNUM_SHIFT) % MAX_SHADERS];
		var entityNum = (draw.sort >> QSORT_ENTITYNUM_SHIFT) % MAX_GENTITIES;
		// var fogNum = (draw.sort >> QSORT_FOGNUM_SHIFT) & 31;

		// NOTE: We should really only be honoring shader.entityMergable,
		// but I haven't seen an animated poly where this would bother them.
		var entityMergable = shader.entityMergable ||
			(backend.currentEntity && backend.currentEntity.reType === RT.POLY);

		// We start a new batch for each geo, unless the shader hasn't changed
		// and the entity is mergable.
		var mergable = entityMergable && shader === oldShader;

		if (!mergable) {
			if (oldEntityNum !== -1) {
				EndBatch();
			}

			BeginBatch(shader, geo);

			oldShader = shader;
		}

		// Change our backend orientation used by the shader uniforms.
		if (oldEntityNum !== entityNum) {
			if (entityNum !== ENTITYNUM_WORLD) {
				backend.currentEntity = backend.refents[entityNum];
				backend.refdef.timeSecs = originalTime - backend.currentEntity.shaderTime;
				// We have to reset the shaderTime as well otherwise image animations
				// start from the wrong frame.
				backend.shaderTime = backend.refdef.timeSecs;

				RotateForEntity(backend.currentEntity, backend.viewParms, backend.or);
			} else {
				backend.currentEntity = null;
				backend.refdef.timeSecs = originalTime;
				backend.shaderTime = backend.refdef.timeSecs;
				parms.or.clone(backend.or);
			}

			oldEntityNum = entityNum;
		}

		if (geo instanceof WorldGeometry) {
			UpdateWorldGeometry(geo);
		} else if (geo instanceof Md3Geometry) {
			UpdateMd3Geometry(geo);
		} else if (geo instanceof EntityGeometry) {
			UpdateEntityGeometry(geo);
		} else if (geo instanceof SkydomeGeometry) {
			UpdateSkydomeGeometry(geo);
		}
	}

	// Draw the contents of the last batch.
	if (oldEntityNum !== -1) {
		EndBatch();
	}

	// Draw the collison bounds.
	if (r_showCollision()) {
		RenderCollisionSurfaces();
	}

	// Draw view frustum.
	if (r_showFrustum()) {
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

	// Clear back buffer but not color buffer (we expect the entire scene to be overwritten).
	gl.enable(gl.DEPTH_TEST);
	gl.depthMask(true);
	gl.clear(gl.DEPTH_BUFFER_BIT);

	// gl.clear(gl.COLOR_BUFFER_BIT);

	if ((backend.refdef.rdflags & RDF.HYPERSPACE)) {
		Hyperspace();
		return;
	}

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
 * Hyperspace
 *
 * A player has predicted a teleport, but hasn't arrived yet.
 */
function Hyperspace() {
	var c = (backend.refdef.time % 256) / 255.0;
	gl.clearColor(c, c, c, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
}

/**
 * RenderCollisionSurfaces
 */
function RenderCollisionSurfaces() {
	// if (!backend.collisionBuffers) {
	// 	BuildCollisionBuffers();
	// }

	// // Reset the modelview matrix.
	// backend.currentEntity = null;
	// backend.viewParms.or.clone(backend.or);

	// gl.enable(gl.CULL_FACE);
	// gl.cullFace(gl.FRONT);

	// var index = backend.collisionBuffers.index;
	// var xyz = backend.collisionBuffers.xyz;

	// // Render!
	// var shader = FindShaderByName('<debug>');
	// BindShader(shader);
	// BindUniforms();
	// BindBuffer(index);
	// BindBuffer(xyz, shader.program.attrib.position);
	// gl.drawElements(gl.LINE_LOOP, index.elementCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * UpdateDlights
 *
 * TODO Pack into a texture once per frame instead
 * of passing in as a uniform each pass.
 */
function UpdateDlights() {
	var buffer = backend.dlightsBuffer;

	for (var i = 0; i < backend.refdef.numDlights; i++) {
		var dl = backend.dlights[i];

		buffer[i * 8 + 0] = dl.origin[0];
		buffer[i * 8 + 1] = dl.origin[1];
		buffer[i * 8 + 2] = dl.origin[2];
		buffer[i * 8 + 3] = 0;
		buffer[i * 8 + 4] = dl.color[0];
		buffer[i * 8 + 5] = dl.color[1];
		buffer[i * 8 + 6] = dl.color[2];
		buffer[i * 8 + 7] = dl.radius;

		// Hide the light.
		if (r_activeDlight() >= 0 && r_activeDlight() !== i) {
			for (var j = 0; j < 8; j++) {
				buffer[i * 8 + j] = 0.0;
			}
		}
	}
}

/**
 * BeginBatch
 */
function BeginBatch(shader, geo) {
	backend.currentShader = shader;
	backend.currentGeo = geo;
	backend.shaderTime = backend.refdef.timeSecs;
	backend.dlightBits = 0;
}

/**
 * EndBatch
 */
function EndBatch() {
	var shader = backend.currentShader;
	var geo = backend.currentGeo;
	var program = shader.program;
	var indexCount = geo.attributes.index.offset;

	re.counts.shaders++;
	re.counts.indexes += indexCount;

	// TODO We should be able to get rid of a lot of bindBuffer() calls
	// in the case of the shader + model being the same, but the entity
	// has changed (diff position).
	BindShader(shader);
	BindUniforms(shader);
	BindBuffers(geo, shader);
	gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);

	// var error = gl.getError();
	// if (error !== gl.NO_ERROR) {
	// 	debugger;
	// }

	if (r_showTris()) {
		DrawTris();
	}

	if (r_showNormals()) {
		DrawNormals();
	}

	ResetBuffers(geo);
}

/**
 * DrawTris
 */
function DrawTris() {
	var tess = backend.tess;
	var indexOffset = tess.indexOffset;
	var indexCount = tess.indexCount || tess.index.elementCount;

	if (!tess.xyz) {
		error('Can\'t draw triangles without xyz.');  // shouldn't happen
		return;
	}

	// Create a new index buffer for gl.LINES.
	var oindex = tess.index;
	var index = backend.debugBuffers.index;

	index.offset = 0;

	for (var i = 0; i < indexCount; i += 3) {
		index.data[index.offset++] = oindex.data[indexOffset + i + 0];
		index.data[index.offset++] = oindex.data[indexOffset + i + 1];
		index.data[index.offset++] = oindex.data[indexOffset + i + 1];
		index.data[index.offset++] = oindex.data[indexOffset + i + 2];
		index.data[index.offset++] = oindex.data[indexOffset + i + 2];
		index.data[index.offset++] = oindex.data[indexOffset + i + 0];
	}

	index.modified = true;

	// Bind the debug shader.
	var shader = FindShaderByName('<debug>');
	BindShader(shader);
	BindUniforms(shader);
	BindBuffer(index);
	BindBuffer(tess.xyz, shader.program.attrib.position);
	gl.drawElements(gl.LINES, index.offset, gl.UNSIGNED_SHORT, 0);
}

/**
 * DrawNormals
 */
function DrawNormals() {
	var tess = backend.tess;
	var indexCount = tess.indexCount || tess.index.elementCount;
	var indexOffset = tess.indexOffset;

	if (!tess.xyz || !tess.normal) {
		error('Can\'t draw normal without xyz and normal.');  // shouldn't happen
		return;
	}

	// Build up new index and vertex buffer.
	var index = tess.index;
	var xyz = tess.xyz;
	var normal = tess.normal;
	var dindex = backend.debugBuffers.index;
	var dxyz = backend.debugBuffers.xyz;

	// Reset debug buffers.
	dindex.offset = 0;
	dxyz.offset = 0;

	var idx = 0;
	var origin = vec3.create();
	var norm = vec3.create();

	for (var i = 0; i < indexCount; i++) {
		// Read the index, xyz and normal from the last rendered tess buffers.
		idx = index.data[indexOffset + i];
		origin[0] = xyz.data[idx * 3 + 0];
		origin[1] = xyz.data[idx * 3 + 1];
		origin[2] = xyz.data[idx * 3 + 2];
		norm[0] = normal.data[idx * 3 + 0];
		norm[1] = normal.data[idx * 3 + 1];
		norm[2] = normal.data[idx * 3 + 2];

		// Extrude out to render the normals.
		dxyz.data[dxyz.offset++] = origin[0];
		dxyz.data[dxyz.offset++] = origin[1];
		dxyz.data[dxyz.offset++] = origin[2];
		dindex.data[dindex.offset++] = i*2;

		dxyz.data[dxyz.offset++] = origin[0] + norm[0] * 2;
		dxyz.data[dxyz.offset++] = origin[1] + norm[1] * 2;
		dxyz.data[dxyz.offset++] = origin[2] + norm[2] * 2;
		dindex.data[dindex.offset++] = i*2+1;
	}

	dxyz.modified = true;
	dindex.modified = true;

	// Render!
	var shader = FindShaderByName('<debug>');
	BindShader(shader);
	BindUniforms(shader);
	BindBuffer(dindex);
	BindBuffer(dxyz, shader.program.attrib.position);
	gl.drawElements(gl.LINES, dindex.elementCount, gl.UNSIGNED_SHORT, 0);
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

	var origin = vec3.add(vec3.scale(backend.or.axis[0], 128, vec3.create()), parms.or.origin);
	var normal = vec3.create();
	var forward = vec3.create();
	var up = vec3.create();

	for (var i = 0; i < 4; i++) {
		var frustum = parms.frustum[i];

		// Validate frustum dist.
		var len = vec3.dot(parms.or.origin, frustum.normal);
		if (len !== frustum.dist) {
			error('Frustum plane distance is invalid.');
			return;
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

	var shader = FindShaderByName('<debug>');
	BindShader(shader);
	BindUniforms(shader);
	BindBuffer(index);
	BindBuffer(xyz, shader.program.attrib.position);
	gl.drawElements(gl.LINE_STRIP, index.elementCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * InitBuffers
 */
function InitBuffers(geo, numVerts, numIndexes, descriptions) {
	var attributes = geo.attributes = {};

	for (var name in descriptions) {
		if (!descriptions.hasOwnProperty(name)) {
			continue;
		}

		var attribute = attributes[name] = {
			type: 0,
			array: null,
			offset: 0,
			buffer: null,
			update: false
		};

		if (name === 'index') {
			attribute.type = gl.ELEMENT_ARRAY_BUFFER;
		} else {
			attribute.type = gl.ARRAY_BUFFER;
		}

		switch (descriptions[name]) {
			case 'uint':
				attribute.array = new Uint16Array(numIndexes);
				attribute.size  = 1;
				attribute.dataType = gl.UNSIGNED_SHORT;
				break;

			case 'vec2':
				attribute.array = new Float32Array(numVerts * 2);
				attribute.size  = 2;
				attribute.dataType = gl.FLOAT;
				break;

			case 'vec3':
				attribute.array = new Float32Array(numVerts * 3);
				attribute.size  = 3;
				attribute.dataType = gl.FLOAT;
				break;

			case 'vec4':
				attribute.array = new Float32Array(numVerts * 4);
				attribute.size  = 4;
				attribute.dataType = gl.FLOAT;
				break;
		}

		attribute.buffer = gl.createBuffer();
	}
}

/**
 * BindBuffers
 */
function BindBuffers(geo, shader) {
	var attributes = geo.attributes;
	var program = shader.program;

	for (var name in attributes) {
		if (!attributes.hasOwnProperty(name)) {
			continue;
		}

		var attribute = attributes[name];

		// We always want to bind the index buffer, otherwise,
		// if the attribute isn't referenced by the shader,
		// ignore it.
		if (attribute.type === gl.ARRAY_BUFFER &&
			typeof(program.attrib[name]) === 'undefined') {
			continue;
		}

		gl.bindBuffer(attribute.type, attribute.buffer);

		// Update the buffer if it's dirty.
		if (attribute.update) {
			// Use subarray() to create a new view representing a much
			// smaller subset of data we need to actually send to the GPU.
			var view = attribute.array.subarray(0, attribute.offset);

			gl.bufferData(attribute.type, view, gl.DYNAMIC_DRAW);

			attribute.update = false;
		}

		if (attribute.type === gl.ARRAY_BUFFER) {
			gl.enableVertexAttribArray(program.attrib[name]);
			gl.vertexAttribPointer(program.attrib[name], attribute.size, attribute.dataType, false, 0, 0);
		}
	}
}

/**
 * ResetBuffers
 */
function ResetBuffers(geo) {
	if (!geo.dynamic) {
		return;
	}

	var attributes = geo.attributes;

	for (var name in attributes) {
		if (!attributes.hasOwnProperty(name)) {
			continue;
		}

		var attribute = attributes[name];
		attribute.offset = 0;
	}

}

/**
 * BindShader
 *
 * If we're binding to the same shader, only rebind
 * animated textures.
 */
var lastShader = null;

function BindShader(shader) {
	var tess = backend.tess;
	var program = shader.program;

	//
	// Setup GL state.
	//
	if (shader !== lastShader) {
		if (shader.cull) {
			gl.enable(gl.CULL_FACE);
			gl.cullFace(shader.cull);
		} else {
			gl.disable(gl.CULL_FACE);
		}

		if (shader.hasBlendFunc) {
			gl.enable(gl.BLEND);
			gl.blendFunc(shader.blendSrc, shader.blendDest);
		} else {
			gl.disable(gl.BLEND);
		}

		if (shader.depthWrite) {
			gl.depthMask(true);
			gl.depthFunc(shader.depthFunc);
		} else {
			gl.depthMask(false);
		}

		if (shader.polygonOffset) {
			gl.enable(gl.POLYGON_OFFSET_FILL);
			gl.polygonOffset(-1, -2);
			// r_offsetFactor = ri.Cvar_Get( "r_offsetfactor", "-1", CVAR_CHEAT );
			// r_offsetUnits = ri.Cvar_Get( "r_offsetunits", "-2", CVAR_CHEAT );
		} else {
			gl.disable(gl.POLYGON_OFFSET_FILL);
		}
	}

	//
	// Bind the program.
	//
	if (shader !== lastShader) {
		gl.useProgram(program);
	}

	// Bind textures.
	for (var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];
		var texture = stage.textures[0];

		if (shader === lastShader && !stage.animFreq) {
			continue;
		}

		if (stage.animFreq) {
			var animFrame = Math.floor(backend.shaderTime * stage.animFreq) % stage.textures.length;
			texture = stage.textures[animFrame];
		}

		gl.activeTexture(gl.TEXTURE0 + i);
		gl.uniform1i(program.uniform['texSampler' + i], i);
		gl.bindTexture(gl.TEXTURE_2D, texture.texnum);
	}

	lastShader = shader;
}

/**
 * BindUniforms
 */
function BindUniforms(shader) {
	var program = shader.program;

	gl.uniformMatrix4fv(program.uniform.modelViewMatrix, false, backend.or.modelMatrix);
	gl.uniformMatrix4fv(program.uniform.projectionMatrix, false, backend.viewParms.projectionMatrix);

	if (program.uniform.viewPosition !== undefined) {
		gl.uniform3fv(program.uniform.viewPosition, backend.or.viewOrigin);  // used by tcGen environment
	}

	if (backend.currentEntity !== null && program.uniform.entityColor !== undefined) {
		gl.uniform4fv(program.uniform.entityColor, backend.currentEntity.shaderRGBA);
	}

	if (backend.currentEntity !== null && program.uniform.lightDir !== undefined) {
		gl.uniform3fv(program.uniform.lightDir, backend.currentEntity.lightDir);
	}

	if (backend.currentEntity !== null && program.uniform.ambientLight !== undefined) {
		gl.uniform3fv(program.uniform.ambientLight, backend.currentEntity.ambientLight);
	}

	if (backend.currentEntity !== null && program.uniform.directedLight !== undefined) {
		gl.uniform3fv(program.uniform.directedLight, backend.currentEntity.directedLight);
	}

	if (program.uniform.time !== undefined) {
		gl.uniform1f(program.uniform.time, backend.shaderTime);
	}

	if (program.uniform.dlightCount !== undefined) {
		gl.uniform4fv(program.uniform['dlights[0]'], backend.dlightsBuffer);
		gl.uniform1i(program.uniform.dlightCount, backend.refdef.numDlights);
		gl.uniform1i(program.uniform.dlightBits, backend.dlightBits);
	}
}