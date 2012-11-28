var re;
var backend;
var gl;

var r_cull,
	r_subdivisions,
	r_znear,
	r_zproj,
	r_overBrightBits,
	r_mapOverBrightBits,
	r_ambientScale,
	r_directedScale,
	r_showtris,
	r_shownormals,
	r_showcollision,
	r_railCoreWidth;

var flipMatrix = mat4.create([
	0, 0, -1, 0,
	-1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 0, 1
]);

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'RE:');
	Function.apply.call(console.log, console, args);
}

/**
 * Init
 */
function Init() {
	log('Initializing');
	
	re      = new RenderLocals();
	backend = new BackendState();
	gl      = sys.GetGLContext();

	r_cull              = com.AddCvar('r_cull',              1);
	r_subdivisions      = com.AddCvar('r_subdivisions',      4);
	r_znear             = com.AddCvar('r_znear',             4);
	r_zproj             = com.AddCvar('r_zproj',             64);
	r_overBrightBits    = com.AddCvar('r_overBrightBits',    0, CVF.ARCHIVE);
	r_mapOverBrightBits = com.AddCvar('r_mapOverBrightBits', 2, CVF.ARCHIVE);
	r_ambientScale      = com.AddCvar('r_ambientScale',      0.6);
	r_directedScale     = com.AddCvar('r_directedScale',     1);
	r_showtris          = com.AddCvar('r_showtris',          0);
	r_shownormals       = com.AddCvar('r_shownormals',       0);
	r_showcollision     = com.AddCvar('r_showcollision',     0);
	r_railCoreWidth     = com.AddCvar('r_railCoreWidth',     6, CVF.ARCHIVE);

	com.AddCmd('showcluster', CmdShowCluster);

	InitImages();
	InitShaders();
	InitSkins();
	InitModels();
	InitBackend();
}

/**
 * Shutdown
 */
function Shutdown() {
	log('Shutting down');
	DeleteTextures();
}

/**
 * GetGLExtension
 */
var vendorPrefixes = ['', 'WEBKIT_', 'MOZ_'];
function GetGLExtension(name) {
	for (var i in vendorPrefixes) {
		var ext = gl.getExtension(vendorPrefixes[i] + name);
		if (ext) {
			return ext;
		}
	}
	return null;
}

/**
 * CullLocalBox
 *
 * Returns CULL_IN, CULL_CLIP, or CULL_OUT
 */
function CullLocalBox(bounds) {
	// if ( r_nocull->integer ) {
	// 	return CULL_CLIP;
	// }
	var or = re.or;

	// Transform into world space.
	var v = [0, 0, 0];
	var transformed = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];

	for (var i = 0; i < 8; i++) {
		v[0] = bounds[i&1][0];
		v[1] = bounds[(i>>1)&1][1];
		v[2] = bounds[(i>>2)&1][2];

		vec3.set(or.origin, transformed[i]);
		vec3.add(transformed[i], vec3.scale(or.axis[0], v[0], [0, 0, 0]));
		vec3.add(transformed[i], vec3.scale(or.axis[1], v[1], [0, 0, 0]));
		vec3.add(transformed[i], vec3.scale(or.axis[2], v[2], [0, 0, 0]));
	}

	// Check against frustum planes.
	var anyBack = 0;
	var dists = [0, 0, 0, 0, 0, 0, 0, 0];
	var parms = re.viewParms;

	for (var i = 0; i < 4; i++) {
		var frust = parms.frustum[i];
		var front = 0, back = 0;

		for (var j = 0; j < 8; j++) {
			dists[j] = vec3.dot(transformed[j], frust.normal);

			if (dists[j] > frust.dist) {
				front = 1;

				if (back) {
					break;  // a point is in front
				}
			} else {
				back = 1;
			}
		}

		if (!front) {			
			return Cull.OUT;  // all points were behind one of the planes
		}
		anyBack |= back;
	}

	if (!anyBack) {
		return Cull.IN;  // completely inside frustum
	}

	return Cull.CLIP;  // partially clipped
}

/**
 * CullLocalPointAndRadius
 */
function CullLocalPointAndRadius(pt, radius) {
	var or = re.or,
		x = pt[0],
		y = pt[1],
		z = pt[2],
		world = [0, 0, 0];

	world[0] = x * or.axis[0][0] + y * or.axis[1][0] + z * or.axis[2][0] + or.origin[0];
	world[1] = x * or.axis[0][1] + y * or.axis[1][1] + z * or.axis[2][1] + or.origin[1];
	world[2] = x * or.axis[0][2] + y * or.axis[1][2] + z * or.axis[2][2] + or.origin[2];

	return CullPointAndRadius(world, radius);
}

/**
 * CullPointAndRadius
 */
function CullPointAndRadius(pt, radius) {
	// if ( r_nocull->integer ) {
	// 	return CULL_CLIP;
	// }

	var parms = re.viewParms;
	var mightBeClipped = false;

	// Check against frustum planes.
	for (var i = 0; i < 4; i++) {
		var frust = parms.frustum[i];
		var dist = vec3.dot(pt, frust.normal) - frust.dist;

		if ( dist < -radius ) {
			return Cull.OUT;
		} else if ( dist <= radius ) {
			mightBeClipped = true;
		}
	}

	if (mightBeClipped) {
		return Cull.CLIP;
	}

	return Cull.IN; // completely inside frustum
}

/**
 * RotateForViewer
 */
function RotateForViewer(or) {
	// Create model view matrix.
	var modelMatrix = mat4.create();

	modelMatrix[0] = or.axis[0][0];
	modelMatrix[4] = or.axis[0][1];
	modelMatrix[8] = or.axis[0][2];
	modelMatrix[12] = -or.origin[0] * modelMatrix[0] + -or.origin[1] * modelMatrix[4] + -or.origin[2] * modelMatrix[8];

	modelMatrix[1] = or.axis[1][0];
	modelMatrix[5] = or.axis[1][1];
	modelMatrix[9] = or.axis[1][2];
	modelMatrix[13] = -or.origin[0] * modelMatrix[1] + -or.origin[1] * modelMatrix[5] + -or.origin[2] * modelMatrix[9];

	modelMatrix[2] = or.axis[2][0];
	modelMatrix[6] = or.axis[2][1];
	modelMatrix[10] = or.axis[2][2];
	modelMatrix[14] = -or.origin[0] * modelMatrix[2] + -or.origin[1] * modelMatrix[6] + -or.origin[2] * modelMatrix[10];

	modelMatrix[3] = 0;
	modelMatrix[7] = 0;
	modelMatrix[11] = 0;
	modelMatrix[15] = 1;

	// Convert from our coordinate system (looking down X)
	// to OpenGL's coordinate system (looking down -Z).
	mat4.multiply(flipMatrix, modelMatrix, or.modelMatrix);

	// View origin is the same as origin for the viewer.
	vec3.set(or.origin, or.viewOrigin);

	// Update global world orientiation info.
	// or.clone(re.viewParms.world);
}

/**
 * RotateForEntity
 */
function RotateForEntity(refent, or) {
	var viewParms = re.viewParms;

	if (refent.reType !== RT.MODEL) {
		viewParms.or.clone(or);
		return;
	}

	vec3.set(refent.origin, or.origin);
	vec3.set(refent.axis[0], or.axis[0]);
	vec3.set(refent.axis[1], or.axis[1]);
	vec3.set(refent.axis[2], or.axis[2]);
	
	var modelMatrix = or.modelMatrix;
	modelMatrix[0] = or.axis[0][0];
	modelMatrix[4] = or.axis[1][0];
	modelMatrix[8] = or.axis[2][0];
	modelMatrix[12] = or.origin[0];

	modelMatrix[1] = or.axis[0][1];
	modelMatrix[5] = or.axis[1][1];
	modelMatrix[9] = or.axis[2][1];
	modelMatrix[13] = or.origin[1];

	modelMatrix[2] = or.axis[0][2];
	modelMatrix[6] = or.axis[1][2];
	modelMatrix[10] = or.axis[2][2];
	modelMatrix[14] = or.origin[2];

	modelMatrix[3] = 0;
	modelMatrix[7] = 0;
	modelMatrix[11] = 0;
	modelMatrix[15] = 1;

	mat4.multiply(viewParms.or.modelMatrix, or.modelMatrix, or.modelMatrix);

	// Calculate the viewer origin in the model's space
	// needed for fog, specular, and environment mapping.
	var delta = vec3.subtract(viewParms.or.origin, or.origin, [0, 0, 0]);

	// Compensate for scale in the axes if necessary.
	// if ( ent->e.nonNormalizedAxes ) {
	// 	axisLength = VectorLength( ent->e.axis[0] );
	// 	if ( !axisLength ) {
	// 		axisLength = 0;
	// 	} else {
	// 		axisLength = 1.0f / axisLength;
	// 	}
	// } else {
	// 	axisLength = 1.0f;
	// }

	vec3.set(delta, or.viewOrigin);
	QMath.RotatePoint(delta, or.axis); // scale axis by axisLength
}

/**
 * SetupProjectionMatrix
 */
function SetupProjectionMatrix(zProj) {
	var parms = re.viewParms;

	var ymax = zProj * Math.tan(parms.fovY * Math.PI / 360);
	var ymin = -ymax;

	var xmax = zProj * Math.tan(parms.fovX * Math.PI / 360);
	var xmin = -xmax;

	var width = xmax - xmin;
	var height = ymax - ymin;

	parms.projectionMatrix[0] = 2 * zProj / width;
	parms.projectionMatrix[4] = 0;
	parms.projectionMatrix[8] = (xmax + xmin) / width;
	parms.projectionMatrix[12] = 0;

	parms.projectionMatrix[1] = 0;
	parms.projectionMatrix[5] = 2 * zProj / height;
	parms.projectionMatrix[9] = (ymax + ymin) / height; // normally 0
	parms.projectionMatrix[13] = 0;

	parms.projectionMatrix[3] = 0;
	parms.projectionMatrix[7] = 0;
	parms.projectionMatrix[11] = -1;
	parms.projectionMatrix[15] = 0;

	// Now that we have all the data for the projection matrix we can also setup the view frustum.
	SetupFrustum(parms, xmin, xmax, ymax, zProj);
}

/**
 * SetupFrustum
 * 
 * Set up the culling frustum planes for the current view using the results we got from computing the first two rows of 
 * the projection matrix.
 */
function SetupFrustum(parms, xmin, xmax, ymax, zProj) {
	var ofsorigin = vec3.set(parms.or.origin, [0, 0, 0]);

	var length = Math.sqrt(xmax * xmax + zProj * zProj);
	var oppleg = xmax / length;
	var adjleg = zProj / length;

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[0].normal);
	vec3.add(parms.frustum[0].normal, vec3.scale(parms.or.axis[1], adjleg, [0, 0, 0]));

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[1].normal);
	vec3.add(parms.frustum[1].normal, vec3.scale(parms.or.axis[1], -adjleg, [0, 0, 0]));

	length = Math.sqrt(ymax * ymax + zProj * zProj);
	oppleg = ymax / length;
	adjleg = zProj / length;

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[2].normal);
	vec3.add(parms.frustum[2].normal, vec3.scale(parms.or.axis[2], adjleg, [0, 0, 0]));

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[3].normal);
	vec3.add(parms.frustum[3].normal, vec3.scale(parms.or.axis[2], -adjleg, [0, 0, 0]));

	for (var i = 0; i < 4; i++) {
		parms.frustum[i].type = QMath.PLANE_NON_AXIAL;
		parms.frustum[i].dist = vec3.dot(ofsorigin, parms.frustum[i].normal);
		parms.frustum[i].signbits = QMath.GetPlaneSignbits(parms.frustum[i].normal);
	}
}

/**
 * SetFarClip
 */
function SetFarClip() {
	var parms = re.viewParms;

	// if not rendering the world (icons, menus, etc)
	// set a 2k far clip plane
	/*if (tr.refdef.rdflags & RDF_NOWORLDMODEL) {
		tr.viewParms.zFar = 2048;
		return;
	}*/

	// set far clipping planes dynamically
	var farthestCornerDistance = 0;
	for (var i = 0; i < 8; i++) {
		var v = [0, 0, 0];

		if ( i & 1 ) {
			v[0] = parms.visBounds[0][0];
		} else {
			v[0] = parms.visBounds[1][0];
		}

		if (i & 2) {
			v[1] = parms.visBounds[0][1];
		} else {
			v[1] = parms.visBounds[1][1];
		}

		if (i & 4) {
			v[2] = parms.visBounds[0][2];
		} else {
			v[2] = parms.visBounds[1][2];
		}

		var vecTo = vec3.subtract(v, re.viewParms.or.origin, [0, 0, 0]);
		var distance = vecTo[0] * vecTo[0] + vecTo[1] * vecTo[1] + vecTo[2] * vecTo[2];

		if (distance > farthestCornerDistance) {
			farthestCornerDistance = distance;
		}
	}

	re.viewParms.zFar = Math.sqrt(farthestCornerDistance);
}

/**
 * SetupProjectionZ
 *
 * Sets the z-component transformation part in the projection matrix.
 */
function SetupProjectionMatrixZ() {
	var parms = re.viewParms;

	var zNear = r_znear();
	var zFar = parms.zFar;
	var depth = zFar - zNear;

	parms.projectionMatrix[2] = 0;
	parms.projectionMatrix[6] = 0;
	parms.projectionMatrix[10] = -(zFar + zNear) / depth;
	parms.projectionMatrix[14] = -2 * zFar * zNear / depth;
}

/**
 * RenderView
 */
function RenderView(parms) {
	re.viewCount++;
	re.viewParms = parms;
	re.viewParms.frameCount = re.frameCount;
	re.viewCount++;

	RotateForViewer(re.viewParms.or);
	SetupProjectionMatrix(r_zproj());

	GenerateDrawSurfs();
	SortDrawSurfaces();

	RenderDrawSurfaces();
	if (r_showcollision()) {
		RenderCollisionSurfaces();
	}
}

/**
 * GenerateDrawSurfs
 */
function GenerateDrawSurfs() {
	AddWorldSurfaces();
	// AddPolygonSurfaces();
	AddEntitySurfaces();

	// AddWorldSurfaces will setup the min/max visibility bounds.
	SetFarClip();
	SetupProjectionMatrixZ();
}

/**
 * AddDrawSurf
 */
function AddDrawSurf(face, shader, entityNum/*, fogIndex, dlightMap*/) {
	// Instead of checking for overflow, we just mask the index so it wraps around.
	var index = re.refdef.numDrawSurfs % MAX_DRAWSURFS;
	// The sort data is packed into a single 32 bit value so it can be
	// compared quickly during the qsorting process.
	backend.drawSurfs[index].sort = (shader.sortedIndex << QSORT_SHADERNUM_SHIFT) | (entityNum << QSORT_ENTITYNUM_SHIFT);
	// | ( fogIndex << QSORT_FOGNUM_SHIFT ) | (int)dlightMap;
	backend.drawSurfs[index].surface = face;

	re.refdef.numDrawSurfs++;
}

/**
 * SortDrawSurfaces
 */
function SortDrawSurfaces() {
	QMath.RadixSort(backend.drawSurfs, 'sort', re.refdef.numDrawSurfs);
}

/**
 * AddEntitySurfaces
 */
var entitySurface = new EntitySurface();
function AddEntitySurfaces() {
	for (var i = 0; i < re.refdef.numRefEnts; i++) {
		var refent = backend.refEnts[i];

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
				com.error(ERR.DROP, 'AddEntitySurfaces: Bad reType');
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
			com.error(ERR.DROP, 'Invalid cull result');
	}
}