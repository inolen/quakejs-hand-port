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

function AddBboxSurfaces(refent) {
	var face = re.bboxSurfaces[re.bboxSurfaceNum++ % MAX_BBOX_SURFACES];

	face.shader = FindShader('debugGreenShader');
	face.refent = refent;

	AddDrawSurf(face, face.shader, refent.index);
}

function AddMd3Surfaces(refent) {
	var model = GetModelByHandle(refent.hModel);

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

	for (var i = 0 ; i < md3.surfaces.length; i++) {
		var face = md3.surfaces[i];

		/*if ( ent->e.customShader ) {
			shader = R_GetShaderByHandle( ent->e.customShader );
		} else if ( ent->e.customSkin > 0 && ent->e.customSkin < tr.numSkins ) {
			skin_t *skin;
			int		j;

			skin = R_GetSkinByHandle( ent->e.customSkin );

			// match the surface name to something in the skin file
			shader = tr.defaultShader;
			for ( j = 0 ; j < skin->numSurfaces ; j++ ) {
				// the names have both been lowercased
				if ( !strcmp( skin->surfaces[j]->name, surface->name ) ) {
					shader = skin->surfaces[j]->shader;
					break;
				}
			}
			if (shader == tr.defaultShader) {
				ri.Printf( PRINT_DEVELOPER, "WARNING: no shader for surface %s in skin %s\n", surface->name, skin->name);
			}
			else if (shader->defaultShader) {
				ri.Printf( PRINT_DEVELOPER, "WARNING: shader %s in skin %s not found\n", shader->name, skin->name);
			}
		} else if ( surface->numShaders <= 0 ) {
			shader = tr.defaultShader;
		} else {
			md3Shader = (md3Shader_t *) ( (byte *)surface + surface->ofsShaders );
			md3Shader += ent->e.skinNum % surface->numShaders;
			shader = tr.shaders[ md3Shader->shaderIndex ];
		}*/


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

		// don't add third_person objects if not viewing through a portal
		//if ( !personalModel ) {
			AddDrawSurf(face, face.shaders[0].shader, refent.index);
		//}
	}
}

function TesselateFace(tess, face) {
	var verts = re.world.verts;
	var meshVerts = re.world.meshVerts;
	var offset = tess.numVertexes;

	for (var i = 0; i < face.vertCount; i++) {
		var vert = verts[face.vertex + i];

		tess.xyz[tess.numVertexes*3+0] = vert.pos[0];
		tess.xyz[tess.numVertexes*3+1] = vert.pos[1];
		tess.xyz[tess.numVertexes*3+2] = vert.pos[2];

		tess.texCoords[tess.numVertexes*2+0] = vert.texCoord[0];
		tess.texCoords[tess.numVertexes*2+1] = vert.texCoord[1];

		tess.lmCoords[tess.numVertexes*2+0] = vert.lmCoord[0];
		tess.lmCoords[tess.numVertexes*2+1] = vert.lmCoord[1];

		tess.normals[tess.numVertexes*3+0] = vert.normal[0];
		tess.normals[tess.numVertexes*3+1] = vert.normal[1];
		tess.normals[tess.numVertexes*3+2] = vert.normal[2];

		tess.colors[tess.numVertexes*4+0] = vert.color[0];
		tess.colors[tess.numVertexes*4+1] = vert.color[1];
		tess.colors[tess.numVertexes*4+2] = vert.color[2];
		tess.colors[tess.numVertexes*4+3] = vert.color[3];

		tess.numVertexes++;
	}

	for (var i = 0; i < face.meshVertCount; i++) {
		var meshVert = meshVerts[face.meshVert + i];
		tess.indexes[tess.numIndexes++] = offset + meshVert;
	}
}

function TesselateMd3(tess, face) {
	/*if (  backEnd.currentEntity->e.oldframe == backEnd.currentEntity->e.frame ) {
		backlerp = 0;
	} else  {
		backlerp = backEnd.currentEntity->e.backlerp;
	}
	RB_CHECKOVERFLOW( surface->numVerts, surface->numTriangles*3 );
	LerpMeshVertexes (surface, backlerp);*/

	var offset = tess.numVertexes;

	for (var i = 0; i < face.header.numVerts; i++) {
		tess.xyz[tess.numVertexes*3+0] = face.xyzNormals[i].xyz[0] * MD3_XYZ_SCALE;
		tess.xyz[tess.numVertexes*3+1] = face.xyzNormals[i].xyz[1] * MD3_XYZ_SCALE;
		tess.xyz[tess.numVertexes*3+2] = face.xyzNormals[i].xyz[2] * MD3_XYZ_SCALE;

		tess.texCoords[tess.numVertexes*2+0] = face.st[i].st[0];
		tess.texCoords[tess.numVertexes*2+1] = face.st[i].st[1];

		tess.lmCoords[tess.numVertexes*2+0] = 0;
		tess.lmCoords[tess.numVertexes*2+1] = 0;

		tess.normals[tess.numVertexes*3+0] = face.xyzNormals[i].normal[0];
		tess.normals[tess.numVertexes*3+1] = face.xyzNormals[i].normal[1];
		tess.normals[tess.numVertexes*3+2] = face.xyzNormals[i].normal[2];

		tess.colors[tess.numVertexes*4+0] = 0;
		tess.colors[tess.numVertexes*4+1] = 0;
		tess.colors[tess.numVertexes*4+2] = 0;
		tess.colors[tess.numVertexes*4+3] = 0;

		tess.numVertexes++;
	}

	for (var i = 0; i < face.triangles.length; i++) {
		var tri = face.triangles[i];

		tess.indexes[tess.numIndexes++] = offset + tri.indexes[0];
		tess.indexes[tess.numIndexes++] = offset + tri.indexes[1];
		tess.indexes[tess.numIndexes++] = offset + tri.indexes[2];
	}
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

function TesselateBbox(face) {
	var offset = tess.numVertexes;

	for (var i = 0; i < bboxVerts.length; i += 3) {
		tess.xyz[tess.numVertexes+3+0] = bboxVerts[i+0];
		tess.xyz[tess.numVertexes+3+1] = bboxVerts[i+1];
		tess.xyz[tess.numVertexes+3+2] = bboxVerts[i+2];
		tess.numVertexes++;
	}

	for (var i = 0; i < bboxIndexes.length; i++) {
		tess.indexes[tess.numIndexes++] = offset + bboxIndexes[i];
	}
}