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
				//AddBboxSurfaces(refent);
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

	face.shader = re.debugShader;
	face.refent = refent;

	AddDrawSurf(face, face.shader, refent.index);
}

/**
 * AddMd3Surfaces
 */
function AddMd3Surfaces(refent) {
	var mod = GetModelByHandle(refent.hModel);

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
	if (!personalModel) {
		SetupEntityLighting(refent);
	}

	// see if we are in a fog volume
	//fogNum = R_ComputeFogNum( header, ent );

	//
	// draw all surfaces
	//
	var md3 = mod.md3[0];

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