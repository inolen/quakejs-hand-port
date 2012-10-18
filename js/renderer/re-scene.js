function RenderScene(fd) {
	if (!re.world) {
		//throw new Error('RenderScene: NULL worldmodel');
		return;
	}

	re.refdef.x = fd.x;
	re.refdef.y = fd.y
	re.refdef.width = fd.width;
	re.refdef.height = fd.height;
	re.refdef.fovX = fd.fovX;
	re.refdef.fovY = fd.fovY;
	re.refdef.origin = fd.vieworg;
	re.refdef.viewaxis = fd.viewaxis;
	re.refdef.time = fd.time;

	re.refdef.numDrawSurfs = 0;

	var parms = new ViewParms();
	parms.x = fd.x;
	parms.y = fd.y
	parms.width = fd.width;
	parms.height = fd.height;
	parms.fovX = fd.fovX;
	parms.fovY = fd.fovY;
	vec3.set(fd.vieworg, parms.or.origin);
	vec3.set(fd.viewaxis[0], parms.or.axis[0]);
	vec3.set(fd.viewaxis[1], parms.or.axis[1]);
	vec3.set(fd.viewaxis[2], parms.or.axis[2]);
	vec3.set(fd.vieworg, parms.pvsOrigin);

	RenderView(parms);

	re.refdef.numRefEntities = 0;
}

function AddRefEntityToScene(refent) {
	if (refent.reType < 0 || refent.reType >= RefEntityType.MAX_REF_ENTITY_TYPE) {
		throw new Error('AddRefEntityToScene: bad reType ' + ent.reType);
	}

	refent.index = re.refdef.numRefEntities;
	refent.clone(re.refdef.refEntities[re.refdef.numRefEntities]);

	re.refdef.numRefEntities++;
}

function AddEntitySurfaces() {
	for (var i = 0; i < re.refdef.numRefEntities; i++) {
		var refent = re.refdef.refEntities[i];

		// preshift the value we are going to OR into the drawsurf sort
		//tr.shiftedEntityNum = tr.currentEntityNum << QSORT_ENTITYNUM_SHIFT;

		//
		// the weapon model must be handled special --
		// we don't want the hacked weapon position showing in 
		// mirrors, because the true body position will already be drawn
		//
		/*if ( (ent->e.renderfx & RF_FIRST_PERSON) && tr.viewParms.isPortal) {
			continue;
		}*/

		// simple generated models, like sprites and beams, are not culled
		switch (refent.reType) {
			case RefEntityType.BBOX:
				AddBboxSurfaces(refent);
				break;

			case RefEntityType.MODEL:
				//var model = GetModelByHandle(ent.hModel);
				//AddMd3Surfaces(refent);
				/*// we must set up parts of tr.or for model culling
				RotateModelMatrixForEntity(ent, &tr.viewParms, &tr.or);

				tr.currentModel = GetModelByHandle( ent->e.hModel );

				if (!tr.currentModel) {
					R_AddDrawSurf( &entitySurface, tr.defaultShader, 0, 0 );
				} else {
					switch ( tr.currentModel->type ) {
					case MOD_MESH:
						R_AddMD3Surfaces( ent );
						break;
					// case MOD_BRUSH:
					// 	R_AddBrushModelSurfaces( ent );
					// 	break;
					default:
						throw new Error('AddEntitySurfaces: Bad modeltype');
						break;
					}
				}*/
				break;
			default:
				throw new Error('AddEntitySurfaces: Bad reType');
		}
	}
}

function AddBboxSurfaces(refent) {
	AddDrawSurf(re.debugBboxSurface, re.debugBboxSurface.shader, refent.index);
}

function RenderDrawSurfaces() {
	var world = re.world;
	var parms = re.viewParms;
	var refdef = re.refdef;
	var drawSurfs = refdef.drawSurfs;
	var shaders = world.shaders;

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.enable(gl.CULL_FACE);
	gl.depthMask(true);

	// Seconds passed since map was initialized.
	var time = refdef.time / 1000.0;

	// If we have a skybox, render it first.
	if (skyShader) {
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
		gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);

		SetShader(skyShader);
		for(var j = 0; j < skyShader.stages.length; j++) {
			var stage = skyShader.stages[j];

			SetShaderStage(skyShader, stage, time);
			BindSkyAttribs(stage.program, parms.or.modelMatrix, parms.projectionMatrix);

			// Draw all geometry that uses this textures
			gl.drawElements(gl.TRIANGLES, skyboxIndexCount, gl.UNSIGNED_SHORT, 0);
		}
	}

	// Map Geometry buffers
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, re.worldIndexBuffer);
	gl.bindBuffer(gl.ARRAY_BUFFER, re.worldVertexBuffer);

	//
	var oldEnt;
	var modelMatrix;

	for (var i = 0; i < refdef.numDrawSurfs;) {
		var drawSurf = drawSurfs[i];
		var face = drawSurf.surface;

		//var fogNum = (drawSurf.sort >> QSORT_FOGNUM_SHIFT) & 31;
		var shader = re.sortedShaders[(drawSurf.sort >> QSORT_SHADERNUM_SHIFT) % MAX_SHADERS];
		var entityNum = (drawSurf.sort >> QSORT_ENTITYNUM_SHIFT) % MAX_ENTITIES;
		//var dlightMap = drawSurf.sort & 3;

		// Find the next unique surface.
		for (var next = i+1; next < refdef.numDrawSurfs; next++) {
			if (drawSurfs[next].sort !== drawSurf.sort) {
				break;
			}
		}

		// Update model view matrix for entity.
		if (oldEnt !== entityNum) {
			if (entityNum !== ENTITYNUM_WORLD) {
				var or = new Orientation();
				RotateModelMatrixForEntity(refdef.refEntities[entityNum], or);
				modelMatrix = or.modelMatrix;

				gl.bindBuffer(gl.ARRAY_BUFFER, re.debugVertexBuffer);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, re.debugIndexBuffer);
			} else {
				modelMatrix = parms.or.modelMatrix;

				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, re.worldIndexBuffer);
				gl.bindBuffer(gl.ARRAY_BUFFER, re.worldVertexBuffer);
			}
		}

		// Bind the surface shader
		SetShader(shader);
		
		for (var j = 0; j < shader.stages.length; j++) {
			var stage = shader.stages[j];

			SetShaderStage(shader, stage, time);

			if (entityNum !== ENTITYNUM_WORLD) {
				BindShaderAttribs(stage.program, modelMatrix, parms.projectionMatrix, 12);
			} else {
				BindShaderAttribs(stage.program, modelMatrix, parms.projectionMatrix, re.worldVertexStride);
			}

			// Render all surfaces with this same shader.
			for (var k = i; k < next; k++) {
				var face2 = drawSurfs[k].surface;

				if (entityNum !== ENTITYNUM_WORLD) {
					gl.drawElements(gl.LINE_LOOP, face2.indexCount, gl.UNSIGNED_SHORT, face2.firstIndex * 2);
				} else {
					gl.drawElements(gl.TRIANGLES, face2.meshVertCount, gl.UNSIGNED_SHORT, face2.indexOffset);
				}
			}
		}

		// Move on to the next shader.
		i += next - i;
		oldEnt = entityNum;
	}
}

/*function RenderModels() {
	var shard = shardmd3 ? shardmd3.md3[0] : null;

	if (!debugRefEntVertBuffer && shard) {
		debugRefEntVertBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, debugRefEntVertBuffer);
		var verts = [];
		var offset = 0;
		for (var i = 0; i < shard.surfaces.length; i++) {
			var surface = shard.surfaces[i];

			for (var j = 0; j < surface.header.numFrames * surface.header.numVerts; j++) {
				var k = j % surface.header.numVerts;

				verts[offset++] = surface.xyzNormals[j].xyz[0] * MD3_XYZ_SCALE;
				verts[offset++] = surface.xyzNormals[j].xyz[1] * MD3_XYZ_SCALE;
				verts[offset++] = surface.xyzNormals[j].xyz[2] * MD3_XYZ_SCALE;

				verts[offset++] = surface.st[k].st[0];
				verts[offset++] = surface.st[k].st[1];

				verts[offset++] = 0;
				verts[offset++] = 0;

				verts[offset++] = surface.xyzNormals[j].normal[0];
				verts[offset++] = surface.xyzNormals[j].normal[1];
				verts[offset++] = surface.xyzNormals[j].normal[2];

				verts[offset++] = 0;
				verts[offset++] = 0;
				verts[offset++] = 0;
				verts[offset++] = 0;
			}
		}
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

		debugRefEntIndexBuffer = gl.createBuffer();
		var indexes = [];
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, debugRefEntIndexBuffer);
		for (var i = 0; i < shard.surfaces.length; i++) {
			var surface = shard.surfaces[i];

			for (var j = 0; j < surface.triangles.length; j++) {
				indexes.push(surface.triangles[j].indexes[0]);
				indexes.push(surface.triangles[j].indexes[1]);
				indexes.push(surface.triangles[j].indexes[2]);
			}
		}
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexes), gl.STATIC_DRAW);
	}

	if (!debugRefEntVertBuffer) {
		return;
	}

	var time = re.refdef.time / 1000.0;

	gl.bindBuffer(gl.ARRAY_BUFFER, debugRefEntVertBuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, debugRefEntIndexBuffer);

	for (var i = 0; i < re.refdef.numRefEntities; i++) {
		var refent = re.refdef.refEntities[i];

		// Update model view matrix for entity.
		var or = new Orientation();
		RotateModelMatrixForEntity(refent, or);

		for (var j = 0; j < shard.surfaces.length; j++) {
			var surface = shard.surfaces[j];

			for (var k = 0; k < surface.shaders.length; k++) {
				var shader = surface.shaders[k].shader;

				SetShader(shader);

				for (var l = 0; l < shader.stages.length; l++) {
					var stage = shader.stages[l];

					SetShaderStage(shader, stage, time);
					BindShaderAttribs(stage.program, or.modelMatrix, re.viewParms.projectionMatrix);

					gl.drawElements(gl.TRIANGLES, surface.triangles.length * 3, gl.UNSIGNED_SHORT, 0);
				}
			}
		}
	}
}

function RenderRefEntities() {
	gl.disable(gl.BLEND);

	var time = re.refdef.time / 1000.0;

	if (!debugRefEntVertBuffer) {
		debugRefEntVertBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, debugRefEntVertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(debugRefEntVerts), gl.STATIC_DRAW);

		debugRefEntIndexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, debugRefEntIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(debugRefEntIndexes), gl.STATIC_DRAW);
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, debugRefEntVertBuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, debugRefEntIndexBuffer);

	// Bind the debug green shader.
	var program = re.debugGreenShader.stages[0].program;
	SetShader(re.debugGreenShader);
	SetShaderStage(re.debugGreenShader, re.debugGreenShader.stages[0], time);

	// Setup shader attributes.
	gl.uniformMatrix4fv(program.uniform.projectionMat, false, re.viewParms.projectionMatrix);

	gl.enableVertexAttribArray(program.attrib.position);
	gl.vertexAttribPointer(program.attrib.position, 3, gl.FLOAT, false, 12, 0);

	for (var i = 0; i < re.refdef.numRefEntities; i++) {
		var refent = re.refdef.refEntities[i];

		// Update model view matrix for entity.
		var or = new Orientation();
		RotateModelMatrixForEntity(refent, or);
		gl.uniformMatrix4fv(program.uniform.modelViewMat, false, or.modelMatrix);

		gl.drawElements(gl.LINE_LOOP, 36, gl.UNSIGNED_SHORT, 0);
	}
}*/