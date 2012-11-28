/**
 * RenderScene
 */
function RenderScene(fd) {
	if (!re.world) {
		com.error(ERR.DROP, 'RenderScene: NULL worldmodel');
		return;
	}

	var refdef = re.refdef;
	
	// Copy over render def.
	refdef.x = fd.x;
	refdef.y = fd.y;
	refdef.width = fd.width;
	refdef.height = fd.height;
	refdef.fovX = fd.fovX;
	refdef.fovY = fd.fovY;
	refdef.origin = fd.vieworg;
	refdef.viewaxis = fd.viewaxis;
	refdef.time = fd.time / 1000;

	refdef.numDrawSurfs = 0;
	refdef.numRefEnts = re.numRefEnts;  // already added to scene before RenderScene

	// Create view parms from render def.
	var parms = new ViewParms();
	parms.x = fd.x;
	parms.y = fd.y;
	parms.width = fd.width;
	parms.height = fd.height;
	parms.fovX = fd.fovX;
	parms.fovY = fd.fovY;
	vec3.set(fd.vieworg, parms.or.origin);
	vec3.set(fd.viewaxis[0], parms.or.axis[0]);
	vec3.set(fd.viewaxis[1], parms.or.axis[1]);
	vec3.set(fd.viewaxis[2], parms.or.axis[2]);
	vec3.set(fd.vieworg, parms.pvsOrigin);

	// Reset counts.
	re.counts.shaders = 0;
	re.counts.vertexes = 0;
	re.counts.indexes = 0;
	re.counts.culledFaces = 0;
	re.counts.culledModelOut = 0;
	re.counts.culledModelIn = 0;
	re.counts.culledModelClip = 0;

	RenderView(parms);

	// Clear after the frame.
	re.numRefEnts = 0;
}

/**
 * AddRefEntityToScene
 */
function AddRefEntityToScene(refent) {
	if (refent.reType < 0 || refent.reType >= RT.MAX_REF_ENTITY_TYPE) {
		com.error(ERR.DROP, 'AddRefEntityToScene: bad reType ' + refent.reType);
	}

	var newRefent = backend.refEnts[re.numRefEnts];
	refent.clone(newRefent);

	newRefent.index = re.numRefEnts;
	newRefent.lightingCalculated = false;

	re.numRefEnts++;
}

// /**
//  * AddPolyToScene
//  */
// function AddPolyToScene(hShader, numVerts, verts, numPolys) {
// 	srfPoly_t	*poly;
// 	int			i, j;
// 	int			fogIndex;
// 	fog_t		*fog;
// 	vec3_t		bounds[2];

// 	if (!hShader) {
// 		log(/*PRINT_WARNING,*/'WARNING: AddPolyToScene: NULL poly shader');
// 		return;
// 	}

// 	for (j = 0; j < numPolys; j++) {
// 		if (r_numpolyverts + numVerts > max_polyverts || r_numpolys >= max_polys) {
// 			// NOTE TTimo this was initially a PRINT_WARNING
// 			// but it happens a lot with high fighting scenes and particles
// 			// since we don't plan on changing the const and making for room for those effects
// 			// simply cut this message to developer only
// 			// log(/*PRINT_DEVELOPER,*/'WARNING: RE_AddPolyToScene: r_max_polys or r_max_polyverts reached');
// 			return;
// 		}

// 		poly = &backEndData[tr.smpFrame].polys[r_numpolys];
// 		poly.surfaceType = SF_POLY;
// 		poly.hShader = hShader;
// 		poly.numVerts = numVerts;
// 		poly.verts = &backEndData[tr.smpFrame].polyVerts[r_numpolyverts];
		
// 		Com_Memcpy( poly.verts, &verts[numVerts*j], numVerts * sizeof(*verts));

// 		// done.
// 		r_numpolys++;
// 		r_numpolyverts += numVerts;

// 		// // If no world is loaded.
// 		// if (tr.world == NULL) {
// 		// 	fogIndex = 0;
// 		// }
// 		// // See if it is in a fog volume.
// 		// else if (tr.world.numfogs === 1) {
// 		// 	fogIndex = 0;
// 		// }
// 		// else {
// 		// 	// Find which fog volume the poly is in.
// 		// 	VectorCopy( poly.verts[0].xyz, bounds[0] );
// 		// 	VectorCopy( poly.verts[0].xyz, bounds[1] );
// 		// 	for (i = 1; i < poly.numVerts; i++) {
// 		// 		AddPointToBounds(poly.verts[i].xyz, bounds[0], bounds[1] );
// 		// 	}
// 		// 	for (fogIndex = 1 ; fogIndex < tr.world.numfogs ; fogIndex++ ) {
// 		// 		fog = &tr.world.fogs[fogIndex]; 
// 		// 		if (bounds[1][0] >= fog.bounds[0][0] &&
// 		// 			bounds[1][1] >= fog.bounds[0][1] &&
// 		// 			bounds[1][2] >= fog.bounds[0][2] &&
// 		// 			bounds[0][0] <= fog.bounds[1][0] &&
// 		// 			bounds[0][1] <= fog.bounds[1][1] &&
// 		// 			bounds[0][2] <= fog.bounds[1][2] ) {
// 		// 			break;
// 		// 		}
// 		// 	}
// 		// 	if (fogIndex === tr.world.numfogs) {
// 		// 		fogIndex = 0;
// 		// 	}
// 		// }
// 		// poly.fogIndex = fogIndex;
// 	}
// }