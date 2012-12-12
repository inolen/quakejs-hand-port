/**
 * MirrorViewBySurface
 * 
 * Returns true if another view has been rendered.
 */
function MirrorViewBySurface(face, entityNum) {
	// vec4_t			clipDest[128];
	// viewParms_t		newParms;
	// viewParms_t		oldParms;
	// orientation_t	surface, camera;

	// Don't recursively mirror.
	if (re.viewParms.isPortal) {
		log('WARNING: recursive mirror / portal found');
		return false;
	}

	// if (r_noportals->integer || (r_fastsky->integer == 1)) {
	// 	return qfalse;
	// }

	// Trivially reject portal/mirror.
	// if (SurfIsOffscreen( drawSurf, clipDest)) {
	// 	return false;
	// }

	// Save old viewParms so we can return to it after the mirror view
	var oldParms = re.viewParms.clone();
	var newParms = re.viewParms;
	newParms.isPortal = true;

	var surface = new sh.Orientation();
	var camera = new sh.Orientation();

	if (!GetPortalOrientations(newParms, face, entityNum, surface, camera)) {
		return false;  // bad portal, no portalentity
	}

	MirrorPoint(oldParms.or.origin, surface, camera, newParms.or.origin);

	vec3.subtract(QMath.vec3_origin, camera.axis[0], newParms.portalPlane.normal);
	newParms.portalPlane.dist = vec3.dot(camera.origin, newParms.portalPlane.normal);
	
	MirrorVector(oldParms.or.axis[0], surface, camera, newParms.or.axis[0]);
	MirrorVector(oldParms.or.axis[1], surface, camera, newParms.or.axis[1]);
	MirrorVector(oldParms.or.axis[2], surface, camera, newParms.or.axis[2]);

	// OPTIMIZE: restrict the viewport on the mirrored view

	// Render the mirror view.
	RenderView(newParms);

	oldParms.clone(re.viewParms);

	return true;
}

/**
 * GetPortalOrientation
 * 
 * entityNum is the entity that the portal surface is a part of, which may
 * be moving and rotating.
 * 
 * Returns true if it should be mirrored.
 */
function GetPortalOrientations(viewParms, face, entityNum, surface, camera, mirror) {
	// Create plane axis for the portal we are seeing.
	var plane;
	var originalPlane = PlaneForSurface(face);

	// Rotate the plane if necessary
	if (entityNum !== ENTITYNUM_WORLD) {
		var refent = re.refents[entityNum];

		// Get the orientation of the entity.
		RotateForEntity(refent, re.viewParms, re.or);

		// Rotate the plane, but keep the non-rotated version for matching
		// against the portalSurface entities.
		LocalNormalToWorld(originalPlane.normal, plane.normal);
		plane.dist = originalPlane.dist + vec3.dot(plane.normal, re.or.origin);

		// Translate the original plane.
		originalPlane.dist = originalPlane.dist + vec3.dot(originalPlane.normal, re.or.origin);
	} else {
		plane = originalPlane;
	}

	vec3.set(plane.normal, surface.axis[0]);
	QMath.PerpendicularVector(surface.axis[0], surface.axis[1]);
	vec3.cross(surface.axis[0], surface.axis[1], surface.axis[2]);

	// Locate the portal entity closest to this plane.
	// origin will be the origin of the portal, origin2 will be
	// the origin of the camera.
	for (var i = 0; i < re.refdef.numRefEnts; i++) {
		var refent = backend.refEnts[i];

		if (refent.reType !== RT.PORTALSURFACE) {
			continue;
		}

		var d = vec3.dot(refent.origin, originalPlane.normal) - originalPlane.dist;
		if (d > 64 || d < -64) {
			continue;
		}

		// Get the pvsOrigin from the entity.
		vec3.set(refent.oldOrigin, viewParms.pvsOrigin);

		// If the entity is just a mirror, don't use as a camera point.
		if (refent.oldOrigin[0] == refent.origin[0] && 
			refent.oldOrigin[1] == refent.origin[1] && 
			refent.oldOrigin[2] == refent.origin[2]) {
			vec3.scale(plane.normal, plane.dist, surface.origin);
			vec3.set(surface.origin, camera.origin);
			vec3.subtract(QMath.vec3_origin, surface.axis[0], camera.axis[0]);
			vec3.set(surface.axis[1], camera.axis[1]);
			vec3.set(surface.axis[2], camera.axis[2]);

			viewParms.isMirror = true;
			return true;
		}

		// Project the origin onto the surface plane to get
		// an origin point we can rotate around.
		d = vec3.dot(refent.origin, plane.normal) - plane.dist;
		vec3.add(vec3.scale(surface.axis[0], -d, [0, 0, 0]), refent.origin, surface.origin);

		// Now get the camera origin and orientation.
		vec3.set(refent.oldOrigin, camera.origin);
		QMath.AxisCopy(refent.axis, camera.axis);
		vec3.subtract(QMath.vec3_origin, camera.axis[0], camera.axis[0]);
		vec3.subtract(QMath.vec3_origin, camera.axis[1], camera.axis[1]);

		// Optionally rotate.
		// var transformed = [0, 0, 0];
		// if (e->e.oldframe) {
		// 	// If a speed is specified.
		// 	if (e->e.frame) {
		// 		// Continuous rotate.
		// 		d = (tr.refdef.time/1000.0f) * e->e.frame;
		// 		VectorCopy( camera->axis[1], transformed );
		// 		RotatePointAroundVector( camera->axis[1], camera->axis[0], transformed, d );
		// 		CrossProduct( camera->axis[0], camera->axis[1], camera->axis[2] );
		// 	} else {
		// 		// Bobbing rotate, with skinNum being the rotation offset.
		// 		d = sin( tr.refdef.time * 0.003f );
		// 		d = e->e.skinNum + d * 4;
		// 		VectorCopy( camera->axis[1], transformed );
		// 		RotatePointAroundVector( camera->axis[1], camera->axis[0], transformed, d );
		// 		CrossProduct( camera->axis[0], camera->axis[1], camera->axis[2] );
		// 	}
		// }
		// else if (e->e.skinNum) {
		// 	d = e->e.skinNum;
		// 	VectorCopy( camera->axis[1], transformed );
		// 	RotatePointAroundVector( camera->axis[1], camera->axis[0], transformed, d );
		// 	CrossProduct( camera->axis[0], camera->axis[1], camera->axis[2] );
		// }
		viewParms.isMirror = false;
		return true;
	}

	// If we didn't locate a portal entity, don't render anything.
	// We don't want to just treat it as a mirror, because without a
	// portal entity the server won't have communicated a proper entity set
	// in the snapshot.

	// Unfortunately, with local movement prediction it is easily possible
	// to see a surface before the server has communicated the matching
	// portal surface entity, so we don't want to print anything here...

	// ri.Printf( PRINT_ALL, "Portal surface without a portal entity\n" );

	return false;
}

/**
 * PlaneForSurface
 */
function PlaneForSurface(face) {
	var verts = re.world.verts;
	var meshVerts = re.world.meshVerts;

	var plane;

	switch (face.surfaceType) {
		case SF.FACE:
			plane = face.plane;
			break;

		case SF.TRIANGLES:
			// TODO Cache these vertex values!
			var v1 = verts[face.vertex + meshVerts[face.meshVert + 0]].pos;
			var v2 = verts[face.vertex + meshVerts[face.meshVert + 1]].pos;
			var v3 = verts[face.vertex + meshVerts[face.meshVert + 2]].pos;
			plane = QMath.PlaneFromPoints(v1, v2, v3);
			break;

		// Our polys are rendered through the refent system... is this necessary?
		// case SF_POLY:
		// 	PlaneFromPoints( plane4, poly->verts[0].xyz, poly->verts[1].xyz, poly->verts[2].xyz );
		// 	VectorCopy( plane4, plane->normal ); 
		// 	plane->dist = plane4[3];
		// 	break;

		default:
			plane = new QMath.Plane();
			plane.normal[0] = 1;
			break;
	}

	return plane;
}

/**
 * MirrorPoint
 */
function MirrorPoint(src, surface, camera, dest) {
	var local = vec3.subtract(src, surface.origin, [0, 0, 0]);
	var transformed = [0, 0, 0];

	for (var i = 0; i < 3; i++) {
		var d = vec3.dot(local, surface.axis[i]);
		vec3.add(transformed, vec3.scale(camera.axis[i], d, [0, 0, 0]));
	}

	vec3.add(transformed, camera.origin, dest);
}

/**
 * MirrorVector
 */
function MirrorVector(src, surface, camera, dest) {
	dest[0] = dest[1] = dest[2] = 0;

	for (var i = 0; i < 3; i++) {
		var d = vec3.dot(src, surface.axis[i]);
		vec3.add(dest, vec3.scale(camera.axis[i], d, [0, 0, 0]));
	}
}

