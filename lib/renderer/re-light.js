/**
 * SetupEntityLightingGrid
 */
function SetupEntityLightingGrid(refent) {
	var world = re.world;
	var data = world.lightGridData;
	var lightOrigin = vec3.create();
	var pos = vec3.create();
	var frac = vec3.create();

	if (!data) {
		return;
	}

	if (refent.renderfx & RF.LIGHTING_ORIGIN) {
		// Seperate lightOrigins are needed so an object that is
		// sinking into the ground can still be lit, and so
		// multi-part models can be lit identically.
		vec3.set(refent.lightingOrigin, lightOrigin);
	} else {
		vec3.set(refent.origin, lightOrigin);
	}

	vec3.subtract(lightOrigin, world.lightGridOrigin);

	for (var i = 0; i < 3; i++) {
		var v = lightOrigin[i] * world.lightGridInverseSize[i];
		pos[i] = Math.floor(v);
		frac[i] = v - pos[i];

		if (pos[i] < 0) {
			pos[i] = 0;
		} else if (pos[i] >= world.lightGridBounds[i] - 1) {
			pos[i] = world.lightGridBounds[i] - 1;
		}
	}

	refent.ambientLight = vec3.create();
	refent.directedLight = vec3.create();

	// assert( tr.world->lightGridData ); // NULL with -nolight maps

	// Trilerp the light value.
	var gridStep    = [8,
	                   8 * world.lightGridBounds[0],
	                   8 * world.lightGridBounds[0] * world.lightGridBounds[1]];
	var gridOffset  = pos[0] * gridStep[0] + pos[1] * gridStep[1] + pos[2] * gridStep[2];
	var normal      = vec3.create();
	var direction   = vec3.create();
	var totalFactor = 0;

	for (var i = 0; i < 8; i++) {
		var factor = 1;
		var offset = gridOffset;

		for (var j = 0; j < 3; j++) {
			if (i & (1 << j)) {
				factor *= frac[j];
				offset += gridStep[j];
			} else {
				factor *= (1.0 - frac[j]);
			}
		}

		if ((data[offset]+data[offset+1]+data[offset+2]) === 0) {
			continue;  // ignore samples in walls
		}

		totalFactor += factor;

		refent.ambientLight[0] += factor * data[offset+0];
		refent.ambientLight[1] += factor * data[offset+1];
		refent.ambientLight[2] += factor * data[offset+2];

		refent.directedLight[0] += factor * data[offset+3];
		refent.directedLight[1] += factor * data[offset+4];
		refent.directedLight[2] += factor * data[offset+5];

		var zenith = data[offset+7];
		var azimuth = data[offset+6];

		var lat = zenith * (2 * Math.PI) / 255;
		var lng = azimuth * (2 * Math.PI) / 255;

		normal[0] = Math.cos(lat) * Math.sin(lng);
		normal[1] = Math.sin(lat) * Math.sin(lng);
		normal[2] = Math.cos(lng);

		vec3.add(direction, vec3.scale(normal, factor, vec3.create()));
	}

	if (totalFactor > 0 && totalFactor < 0.99) {
		totalFactor = 1 / totalFactor;
		vec3.scale(refent.ambientLight, totalFactor);
		vec3.scale(refent.directedLight, totalFactor);
	}

	vec3.scale(refent.ambientLight, r_ambientScale());
	vec3.scale(refent.directedLight, r_directedScale());

	vec3.normalize(direction, refent.lightDir);
}

/**
 * SetupEntityLighting
 */
function SetupEntityLighting(refent) {
	var lightOrigin = vec3.create();

	// Lighting calculations.
	if (refent.lightingCalculated) {
		return;
	}
	refent.lightingCalculated = true;

	//
	// Trace a sample point down to find ambient light.
	//
	if (refent.renderfx & RF.LIGHTING_ORIGIN) {
		// Seperate lightOrigins are needed so an object that is
		// sinking into the ground can still be lit, and so
		// multi-part models can be lit identically.
		vec3.set(refent.lightingOrigin, lightOrigin);
	} else {
		vec3.set(refent.origin, lightOrigin);
	}

	// if NOWORLDMODEL, only use dynamic lights (menu system, etc)
	// if ( !(refdef->rdflags & RDF_NOWORLDMODEL )
	// 	&& tr.world->lightGridData ) {
		SetupEntityLightingGrid(refent);
	// } else {
	// 	refent.ambientLight[0] = refent.ambientLight[1] =
	// 		refent.ambientLight[2] = re.identityLight * 150;
	// 	refent.directedLight[0] = refent.directedLight[1] =
	// 		refent.directedLight[2] = re.identityLight * 150;
	// 	vec3.set(re.sunDirection, refent.lightDir);
	// }

	// Give everything a minimum light add
	refent.ambientLight[0] += re.identityLight * 32;
	refent.ambientLight[1] += re.identityLight * 32;
	refent.ambientLight[2] += re.identityLight * 32;

	//
	// Modify the light by dynamic lights.
	//
	var lightDir = vec3.create();
	var d = vec3.length(refent.directedLight);
	vec3.scale(refent.lightDir, d, lightDir);
	vec3.normalize(lightDir);

	// Clamp ambient.
	for (var i = 0; i < 3; i++) {
		if (refent.ambientLight[i] > re.identityLightByte) {
			refent.ambientLight[i] = re.identityLightByte;
		}
	}

	// Transform the direction to local space.
	refent.lightDir[0] = vec3.dot(lightDir, refent.axis[0]);
	refent.lightDir[1] = vec3.dot(lightDir, refent.axis[1]);
	refent.lightDir[2] = vec3.dot(lightDir, refent.axis[2]);

	// Scale to 0 - 1.
	// FIXME: We should update the above logic and
	// instead scale these on load in re-world.
	vec3.scale(refent.ambientLight, 1 / 255.0);
	vec3.scale(refent.directedLight, 1 / 255.0);
}