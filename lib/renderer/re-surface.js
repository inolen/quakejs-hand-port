var entitySurface = new EntitySurface();

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
			case RT.SPRITE:
			case RT.RAIL_CORE:
				// Self blood sprites, talk balloons, etc should not be drawn in the primary
				// view. We can't just do this check for all entities, because md3
				// entities may still want to cast shadows from them.
				if ((refent.renderfx & RF.THIRD_PERSON)/* && !tr.viewParms.isPortal*/) {
					continue;
				}
				var shader = GetShaderByHandle(refent.customShader);
				AddDrawSurf(entitySurface, shader, refent.index);
				break;

			case RT.MODEL:
				// We must set up parts of tr.or for model culling.
				RotateForEntity(refent, re.or);
				AddModelSurfaces(refent);
				break;

			default:
				com.error(sh.Err.DROP, 'AddEntitySurfaces: Bad reType');
		}
	}
}

/**
 * AddModelSurfaces
 */
function AddModelSurfaces(refent) {
	var mod = GetModelByHandle(refent.hModel);

	if (mod.type === ModelType.BAD) {
		return;  // probably still async loading
	}

	// Don't add third_person objects if not in a portal.
	var personalModel = (refent.renderfx & RF.THIRD_PERSON);// && !tr.viewParms.isPortal;

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
	var lod = 0;
	var header = mod.md3[lod];

	// Cull the entire model if merged bounding box of both frames
	// is outside the view frustum.
	var cull = CullModel(header, refent);
	if (cull === Cull.OUT ) {
		return;
	}

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

			for (var j = 0; j < skin.surfaces.length; j++) {
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
 * CullModel
 */
function CullModel(md3, refent) {
	var newFrame = md3.frames[refent.frame];
	var oldFrame = md3.frames[refent.oldFrame];

	// Cull bounding sphere ONLY if this is not an upscaled entity.
	// if (!ent->e.nonNormalizedAxes) {
		if (refent.frame === refent.oldframe) {
			switch (CullLocalPointAndRadius(newFrame.localOrigin, newFrame.radius)) {
				case Cull.OUT:
					re.counts.culledModelOut++;
					return Cull.OUT;

				case Cull.IN:
					re.counts.culledModelIn++;
					return Cull.IN;

				case Cull.CLIP:
					re.counts.culledModelClip++;
					break;
			}
		} else {
			var sphereCull  = CullLocalPointAndRadius(newFrame.localOrigin, newFrame.radius);
			var sphereCullB;

			if ( newFrame === oldFrame ) {
				sphereCullB = sphereCull;
			} else {
				sphereCullB = CullLocalPointAndRadius(oldFrame.localOrigin, oldFrame.radius);
			}

			if (sphereCull === sphereCullB) {
				if (sphereCull === Cull.OUT) {
					re.counts.culledModelOut++;
					return Cull.OUT;
				} else if (sphereCull === Cull.IN) {
					re.counts.culledModelIn++;
					return Cull.IN;
				} else {
					re.counts.culledModelClip++;
				}
			}
		}
	// }
	
	// Calculate a bounding box in the current coordinate system.
	var bounds = [
		[0, 0, 0],
		[0, 0, 0]
	];

	for (var i = 0 ; i < 3 ; i++) {
		bounds[0][i] = oldFrame.bounds[0][i] < newFrame.bounds[0][i] ? oldFrame.bounds[0][i] : newFrame.bounds[0][i];
		bounds[1][i] = oldFrame.bounds[1][i] > newFrame.bounds[1][i] ? oldFrame.bounds[1][i] : newFrame.bounds[1][i];
	}

	switch (CullLocalBox(bounds)) {
		case Cull.OUT:
			re.counts.culledModelOut++;
			return Cull.OUT;
		case Cull.IN:
			re.counts.culledModelIn++;
			return Cull.IN;
		case Cull.CLIP:
			re.counts.culledModelClip++;
			return Cull.CLIP;
		default:
			com.error(sh.Err.DROP, 'Invalid cull result');
	}
}