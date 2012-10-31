/**
 * AddEntitySurfaces
 */
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
				AddMd3Surfaces(refent);
				break;
			default:
				throw new Error('AddEntitySurfaces: Bad reType');
		}
	}
}

/**
 * AddBboxSurfaces
 */
function AddBboxSurfaces(refent) {
	var face = re.bboxSurfaces[re.bboxSurfaceNum++ % MAX_BBOX_SURFACES];

	face.shader = FindShader('debugGreenShader');
	face.refent = refent;

	AddDrawSurf(face, face.shader, refent.index);
}

/**
 * AddMd3Surfaces
 */
function AddMd3Surfaces(refent) {
	var model = GetModelByHandle(refent.hModel);

	// Don't add third_person objects if not in a portal.
	var personalModel = (refent.renderfx & RenderFx.THIRD_PERSON);// && !tr.viewParms.isPortal;

	/*if (ent->e.renderfx & RF_WRAP_FRAMES) {
		ent->e.frame %= tr.currentModel->md3[0]->numFrames;
		ent->e.oldframe %= tr.currentModel->md3[0]->numFrames;
	}*/

	// Validate the frames so there is no chance of a crash.
	// This will write directly into the entity structure, so
	// when the surfaces are rendered, they don't need to be
	// range checked again.
	/*if ((ent->e.frame >= tr.currentModel->md3[0]->numFrames) 
		|| (ent->e.frame < 0)
		|| (ent->e.oldframe >= tr.currentModel->md3[0]->numFrames)
		|| (ent->e.oldframe < 0)) {
			ri.Printf( PRINT_DEVELOPER, "R_AddMD3Surfaces: no such frame %d to %d for '%s'\n",
				ent->e.oldframe, ent->e.frame,
				tr.currentModel->name );
			ent->e.frame = 0;
			ent->e.oldframe = 0;
	}*/

	// compute LOD
	//lod = R_ComputeLOD( ent );

	// cull the entire model if merged bounding box of both frames
	// is outside the view frustum.
	/*cull = R_CullModel ( header, ent );
	if ( cull == CULL_OUT ) {
		return;
	}*/

	// set up lighting now that we know we aren't culled
	/*if ( !personalModel || r_shadows->integer > 1 ) {
		R_SetupEntityLighting( &tr.refdef, ent );
	}*/

	// see if we are in a fog volume
	//fogNum = R_ComputeFogNum( header, ent );

	//
	// draw all surfaces
	//
	var md3 = model.md3[0];

	// not loaded yet
	if (!md3) {
		return;
	}

	for (var i = 0; i < md3.surfaces.length; i++) {
		var face = md3.surfaces[i];

		var shader;

		if (refent.customShader) {
			shader = GetShaderByHandle(refent.customShader);
		} else if (refent.customSkin) {
			var skin = GetSkinByHandle(refent.customSkin);

			// Match the surface name to something in the skin file.
			shader = re.defaultShader;

			for (var j = 0 ; j < skin.surfaces.length; j++) {
				// The names have both been lowercased.
				if (skin.surfaces[j].name === face.name) {
					shader = skin.surfaces[j].shader;
					break;
				}
			}
		} else if (face.shaders.length <= 0) {
			shader = re.defaultShader;
		} else {
			shader = face.shaders[refent.skinNum % face.shaders.length].shader;
		}
		
		// we will add shadows even if the main object isn't visible in the view

		// stencil shadows can't do personal models unless I polyhedron clip
		/*if ( !personalModel
			&& r_shadows->integer == 2 
			&& fogNum == 0
			&& !(ent->e.renderfx & ( RF_NOSHADOW | RF_DEPTHHACK ) ) 
			&& shader->sort == SS_OPAQUE ) {
			R_AddDrawSurf( (void *)surface, tr.shadowShader, 0, qfalse );
		}

		// projection shadows work fine with personal models
		if ( r_shadows->integer == 3
			&& fogNum == 0
			&& (ent->e.renderfx & RF_SHADOW_PLANE )
			&& shader->sort == SS_OPAQUE ) {
			R_AddDrawSurf( (void *)surface, tr.projectionShadowShader, 0, qfalse );
		}*/

		// Don't add third_person objects if not viewing through a portal.
		if (!personalModel) {
			AddDrawSurf(face, shader, refent.index);
		}
	}
}

/**
 * TesselateFace
 *
 * Stubbed out, we render straight from the pre-compiled static VBO.
 */
var worldAttrs = {
	xyz:        [3,  0],
	xyz2:       [3,  0],
	norm:       [3, 12],
	norm2:      [3, 12],
	texCoord:   [2, 24],
	lightCoord: [2, 32],
	color:      [4, 40]
};

function TesselateFace(tess, face) {
	// var verts = re.world.verts;
	// var meshVerts = re.world.meshVerts;
	// var vertexOffset = tess.numVertexes * 14;
	// var indexOffset = tess.numVertexes;

	// for (var i = 0; i < face.vertCount; i++) {
	// 	var vert = verts[face.vertex + i];

	// 	tess.vertexes[vertexOffset++] = vert.pos[0];
	// 	tess.vertexes[vertexOffset++] = vert.pos[1];
	// 	tess.vertexes[vertexOffset++] = vert.pos[2];

	// 	tess.vertexes[vertexOffset++] = vert.normal[0];
	// 	tess.vertexes[vertexOffset++] = vert.normal[1];
	// 	tess.vertexes[vertexOffset++] = vert.normal[2];

	// 	tess.vertexes[vertexOffset++] = vert.texCoord[0];
	// 	tess.vertexes[vertexOffset++] = vert.texCoord[1];

	// 	tess.vertexes[vertexOffset++] = vert.lmCoord[0];
	// 	tess.vertexes[vertexOffset++] = vert.lmCoord[1];

	// 	tess.vertexes[vertexOffset++] = vert.color[0];
	// 	tess.vertexes[vertexOffset++] = vert.color[1];
	// 	tess.vertexes[vertexOffset++] = vert.color[2];
	// 	tess.vertexes[vertexOffset++] = vert.color[3];

	// 	tess.numVertexes++;
	// }

	// for (var i = 0; i < face.meshVertCount; i++) {
	// 	var meshVert = meshVerts[face.meshVert + i];
	// 	tess.indexes[tess.numIndexes++] = indexOffset + meshVert;
	// }

	var shader = tess.shader;
	var entry = re.worldShaderMap[shader.index];

	tess.stride = 56;
	tess.attrs = worldAttrs;
	tess.activeVertexBuffer = re.worldVertexBuffer;
	tess.activeIndexBuffer = re.worldIndexBuffer;
	tess.numIndexes = entry.elementCount;
	tess.indexOffset = entry.indexOffset;
}

/**
 * TesselateMd3
 */
var meshAttrs = {
	xyz:        [3,  0],
	xyz2:       [3, 12],
	norm:       [3, 24],
	norm2:      [3, 36],
	texCoord:   [2, 48],
	lightCoord: [2, 56],
	color:      [4, 64]
};

function TesselateMd3(tess, face) {
	var vertexOffset = tess.numVertexes * 20;
	var indexOffset = tess.numVertexes;
	var numVerts = face.header.numVerts;

	var oldNormal = [0, 0, 0];
	var newNormal = [0, 0, 0];

	for (var i = 0; i < numVerts; i++) {
		var oldXyz = face.xyzNormals[re.currentEntity.oldFrame * numVerts + i];
		var newXyz = face.xyzNormals[re.currentEntity.frame * numVerts + i];

		var lat = (oldXyz.normal >> 8) & 0xff;
		var lng = (oldXyz.normal & 0xff);
		oldNormal[0] = Math.cos(lng) * Math.sin(lat);
		oldNormal[1] = Math.sin(lng) * Math.sin(lat);
		oldNormal[2] = Math.cos(lat);
		vec3.normalize(oldNormal);

		lat = (newXyz.normal >> 8) & 0xff;
		lng = (newXyz.normal & 0xff);
		newNormal[0] = Math.cos(lng) * Math.sin(lat);
		newNormal[1] = Math.sin(lng) * Math.sin(lat);
		newNormal[2] = Math.cos(lat);
		vec3.normalize(newNormal);

		tess.vertexes[vertexOffset++] = newXyz.xyz[0] * MD3_XYZ_SCALE;
		tess.vertexes[vertexOffset++] = newXyz.xyz[1] * MD3_XYZ_SCALE;
		tess.vertexes[vertexOffset++] = newXyz.xyz[2] * MD3_XYZ_SCALE;

		tess.vertexes[vertexOffset++] = oldXyz.xyz[0] * MD3_XYZ_SCALE;
		tess.vertexes[vertexOffset++] = oldXyz.xyz[1] * MD3_XYZ_SCALE;
		tess.vertexes[vertexOffset++] = oldXyz.xyz[2] * MD3_XYZ_SCALE;

		tess.vertexes[vertexOffset++] = newNormal[0];
		tess.vertexes[vertexOffset++] = newNormal[1];
		tess.vertexes[vertexOffset++] = newNormal[2];

		tess.vertexes[vertexOffset++] = oldNormal[0];
		tess.vertexes[vertexOffset++] = oldNormal[1];
		tess.vertexes[vertexOffset++] = oldNormal[2];

		tess.vertexes[vertexOffset++] = face.st[i].st[0];
		tess.vertexes[vertexOffset++] = face.st[i].st[1];

		tess.vertexes[vertexOffset++] = 0;
		tess.vertexes[vertexOffset++] = 0;

		tess.vertexes[vertexOffset++] = 0;
		tess.vertexes[vertexOffset++] = 0;
		tess.vertexes[vertexOffset++] = 0;
		tess.vertexes[vertexOffset++] = 0;

		tess.numVertexes++;
	}

	for (var i = 0; i < face.triangles.length; i++) {
		var tri = face.triangles[i];

		tess.indexes[tess.numIndexes++] = indexOffset + tri.indexes[0];
		tess.indexes[tess.numIndexes++] = indexOffset + tri.indexes[1];
		tess.indexes[tess.numIndexes++] = indexOffset + tri.indexes[2];
	}

	tess.stride = 80;
	tess.attrs = meshAttrs;
}

// Setup debug vertex/index buffer.
var bboxVerts = [
	// Front face
	-15.0, -15.0,  15.0,
	15.0, -15.0,  15.0,
	15.0,  15.0,  15.0,
	-15.0,  15.0,  15.0,
	// Back face
	-15.0, -15.0, -15.0,
	-15.0,  15.0, -15.0,
	15.0,  15.0, -15.0,
	15.0, -15.0, -15.0,
	// Top face
	-15.0,  15.0, -15.0,
	-15.0,  15.0,  15.0,
	15.0,  15.0,  15.0,
	15.0,  15.0, -15.0,
	// Bottom face
	-15.0, -15.0, -15.0,
	15.0, -15.0, -15.0,
	15.0, -15.0,  15.0,
	-15.0, -15.0,  15.0,
	// Right face
	15.0, -15.0, -15.0,
	15.0,  15.0, -15.0,
	15.0,  15.0,  15.0,
	15.0, -15.0,  15.0,
	// Left face
	-15.0, -15.0, -15.0,
	-15.0, -15.0,  15.0,
	-15.0,  15.0,  15.0,
	-15.0,  15.0, -15.0
];

var bboxIndexes = [
	0,  1,  2,      0,  2,  3,    // front
	4,  5,  6,      4,  6,  7,    // back
	8,  9,  10,     8,  10, 11,   // top
	12, 13, 14,     12, 14, 15,   // bottom
	16, 17, 18,     16, 18, 19,   // right
	20, 21, 22,     20, 22, 23    // left
];

/**
 * TesselateBbox
 */
function TesselateBbox(face) {
	var vertexOffset = tess.numVertexes * 14;
	var indexOffset = tess.numVertexes;

	for (var i = 0; i < bboxVerts.length; i += 3) {
		tess.vertexes[vertexOffset++] = bboxVerts[i+0];
		tess.vertexes[vertexOffset++] = bboxVerts[i+1];
		tess.vertexes[vertexOffset++] = bboxVerts[i+2];

		tess.vertexes[vertexOffset++] = 0;
		tess.vertexes[vertexOffset++] = 0;

		tess.vertexes[vertexOffset++] = 0;
		tess.vertexes[vertexOffset++] = 0;

		tess.vertexes[vertexOffset++] = 0;
		tess.vertexes[vertexOffset++] = 0;
		tess.vertexes[vertexOffset++] = 0;

		tess.vertexes[vertexOffset++] = 0;
		tess.vertexes[vertexOffset++] = 0;
		tess.vertexes[vertexOffset++] = 0;
		tess.vertexes[vertexOffset++] = 0;

		tess.numVertexes++;
	}

	for (var i = 0; i < bboxIndexes.length; i++) {
		tess.indexes[tess.numIndexes++] = indexOffset + bboxIndexes[i];
	}

	tess.stride = 56;
	tess.attrs = worldAttrs;
}