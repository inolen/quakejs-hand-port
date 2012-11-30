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