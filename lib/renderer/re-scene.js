/**
 * RenderScene
 */
function RenderScene(fd) {
	if (!re.world) {
		com.Error(ERR.DROP, 'RenderScene: NULL worldmodel');
		return;
	}

	var refdef = re.refdef;
	
	// Copy over render def.
	fd.clone(refdef);
	
	refdef.timeSecs = refdef.time / 1000.0;
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

	// // Copy the areamask data over and note if it has changed, which
	// // will force a reset of the visible leafs even if the view hasn't moved.
	// // tr.refdef.areamaskModified = qfalse;
	// if (!(tr.refdef.rdflags & RDF_NOWORLDMODEL)) {
	// 	int		areaDiff;
	// 	int		i;

	// 	// compare the area bits
	// 	areaDiff = 0;
	// 	for (i = 0 ; i < MAX_MAP_AREA_BYTES/4 ; i++) {
	// 		areaDiff |= ((int *)tr.refdef.areamask)[i] ^ ((int *)fd->areamask)[i];
	// 		((int *)tr.refdef.areamask)[i] = ((int *)fd->areamask)[i];
	// 	}

	// 	if (areaDiff) {
	// 		// a door just opened or something
	// 		tr.refdef.areamaskModified = qtrue;
	// 	}
	// }

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
		com.Error(ERR.DROP, 'AddRefEntityToScene: bad reType ' + refent.reType);
	}

	var newRefent = backend.refEnts[re.numRefEnts];
	refent.clone(newRefent);

	newRefent.index = re.numRefEnts;
	newRefent.lightingCalculated = false;

	re.numRefEnts++;
}