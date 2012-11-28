/**
 * RenderScene
 */
function RenderScene(fd) {
	if (!re.world) {
		com.error(ERR.DROP, 'RenderScene: NULL worldmodel');
		return;
	}
	
	// Copy over render def.
	re.refdef.x = fd.x;
	re.refdef.y = fd.y;
	re.refdef.width = fd.width;
	re.refdef.height = fd.height;
	re.refdef.fovX = fd.fovX;
	re.refdef.fovY = fd.fovY;
	re.refdef.origin = fd.vieworg;
	re.refdef.viewaxis = fd.viewaxis;
	re.refdef.time = fd.time / 1000;

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

	re.counts.shaders = 0;
	re.counts.vertexes = 0;
	re.counts.indexes = 0;
	re.counts.culledFaces = 0;
	re.counts.culledModelOut = 0;
	re.counts.culledModelIn = 0;
	re.counts.culledModelClip = 0;

	re.refdef.numDrawSurfs = 0;

	RenderView(parms);

	re.refdef.numRefEntities = 0;
}

/**
 * AddRefEntityToScene
 */
function AddRefEntityToScene(refent) {
	if (refent.reType < 0 || refent.reType >= RT.MAX_REF_ENTITY_TYPE) {
		com.error(ERR.DROP, 'AddRefEntityToScene: bad reType ' + refent.reType);
	}

	var newRefent = re.refdef.refEntities[re.refdef.numRefEntities];
	refent.clone(newRefent);

	newRefent.index = re.refdef.numRefEntities;
	newRefent.lightingCalculated = false;

	re.refdef.numRefEntities++;
}

// /**
//  * AddPolyToScene
//  */
// function AddPolyToScene( qhandle_t hShader, int numVerts, const polyVert_t *verts, int numPolys ) {
// 	srfPoly_t	*poly;
// 	int			i, j;
// 	int			fogIndex;
// 	fog_t		*fog;
// 	vec3_t		bounds[2];

// 	if ( !tr.registered ) {
// 		return;
// 	}

// 	if ( !hShader ) {
// 		ri.Printf( PRINT_WARNING, "WARNING: RE_AddPolyToScene: NULL poly shader\n");
// 		return;
// 	}

// 	for ( j = 0; j < numPolys; j++ ) {
// 		if ( r_numpolyverts + numVerts > max_polyverts || r_numpolys >= max_polys ) {
//       /*
//       NOTE TTimo this was initially a PRINT_WARNING
//       but it happens a lot with high fighting scenes and particles
//       since we don't plan on changing the const and making for room for those effects
//       simply cut this message to developer only
//       */
// 			ri.Printf( PRINT_DEVELOPER, "WARNING: RE_AddPolyToScene: r_max_polys or r_max_polyverts reached\n");
// 			return;
// 		}

// 		poly = &backEndData[tr.smpFrame]->polys[r_numpolys];
// 		poly->surfaceType = SF_POLY;
// 		poly->hShader = hShader;
// 		poly->numVerts = numVerts;
// 		poly->verts = &backEndData[tr.smpFrame]->polyVerts[r_numpolyverts];
		
// 		Com_Memcpy( poly->verts, &verts[numVerts*j], numVerts * sizeof( *verts ) );

// 		if ( glConfig.hardwareType == GLHW_RAGEPRO ) {
// 			poly->verts->modulate[0] = 255;
// 			poly->verts->modulate[1] = 255;
// 			poly->verts->modulate[2] = 255;
// 			poly->verts->modulate[3] = 255;
// 		}
// 		// done.
// 		r_numpolys++;
// 		r_numpolyverts += numVerts;

// 		// if no world is loaded
// 		if ( tr.world == NULL ) {
// 			fogIndex = 0;
// 		}
// 		// see if it is in a fog volume
// 		else if ( tr.world->numfogs == 1 ) {
// 			fogIndex = 0;
// 		} else {
// 			// find which fog volume the poly is in
// 			VectorCopy( poly->verts[0].xyz, bounds[0] );
// 			VectorCopy( poly->verts[0].xyz, bounds[1] );
// 			for ( i = 1 ; i < poly->numVerts ; i++ ) {
// 				AddPointToBounds( poly->verts[i].xyz, bounds[0], bounds[1] );
// 			}
// 			for ( fogIndex = 1 ; fogIndex < tr.world->numfogs ; fogIndex++ ) {
// 				fog = &tr.world->fogs[fogIndex]; 
// 				if ( bounds[1][0] >= fog->bounds[0][0]
// 					&& bounds[1][1] >= fog->bounds[0][1]
// 					&& bounds[1][2] >= fog->bounds[0][2]
// 					&& bounds[0][0] <= fog->bounds[1][0]
// 					&& bounds[0][1] <= fog->bounds[1][1]
// 					&& bounds[0][2] <= fog->bounds[1][2] ) {
// 					break;
// 				}
// 			}
// 			if ( fogIndex == tr.world->numfogs ) {
// 				fogIndex = 0;
// 			}
// 		}
// 		poly->fogIndex = fogIndex;
// 	}
// }