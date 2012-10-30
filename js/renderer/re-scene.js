/**
 * RenderScene
 */
function RenderScene(fd) {
	if (!re.world) {
		//throw new Error('RenderScene: NULL worldmodel');
		return;
	}
	
	re.refdef.x = fd.x;
	re.refdef.y = fd.y;
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

	RenderView(parms);

	re.refdef.numRefEntities = 0;
}

/**
 * AddRefEntityToScene
 */
function AddRefEntityToScene(refent) {
	if (refent.reType < 0 || refent.reType >= RefEntityType.MAX_REF_ENTITY_TYPE) {
		throw new Error('AddRefEntityToScene: bad reType ' + ent.reType);
	}

	refent.index = re.refdef.numRefEntities;
	refent.clone(re.refdef.refEntities[re.refdef.numRefEntities]);

	re.refdef.numRefEntities++;
}
