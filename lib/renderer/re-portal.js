/**
 * MirrorViewByGeometry
 *
 * Returns true if another view has been rendered.
 */
function RenderMirrorView(geo, entityNum) {
	// Don't recursively mirror.
	if (re.viewParms.isPortal) {
		log('WARNING: recursive mirror / portal found');
		return false;
	}

	// if (r_noportals.integer || (r_fastsky.integer == 1)) {
	// 	return qfalse;
	// }

	// Trivially reject portal/mirror.
	if (GeometryIsOffscreen(geo)) {
		return false;
	}

	// Save old viewParms so we can return to it after the mirror view.
	var oldParms = re.viewParms.clone();

	var newParms = re.viewParms;
	newParms.isPortal = true;

	var surface = new QShared.Orientation();
	var camera = new QShared.Orientation();

	if (!GetPortalOrientations(newParms, geo, entityNum, surface, camera)) {
		return false;  // bad portal, no portalentity
	}

	MirrorPoint(oldParms.or.origin, surface, camera, newParms.or.origin);

	vec3.subtract(QMath.vec3origin, camera.axis[0], newParms.portalPlane.normal);
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

/*
 * GeometryIsOffscreen
 *
 * Determines if a surface is completely offscreen.
 */
function GeometryIsOffscreen(geo) {
	var index = geo.attributes.index;
	var position = geo.attributes.position;
	var normal = geo.attributes.normal;

	// Determine if this surface is backfaced and also determine the distance
	// to the nearest vertex so we can cull based on portal range. Culling
	// based on vertex distance isn't 100% correct (we should be checking for
	// range to the surface), but it's good enough for the types of portals
	// we have in the game right now.
	var shortest = 100000000;
	var numTriangles = index.index / 3;
	var n = vec3.create();
	var pos = vec3.create();

	for (var i = 0; i < index.index; i += 3) {
		// Copy off the vert.
		var offset = index.array[i] * 3;
		pos[0] = position.array[offset+0];
		pos[1] = position.array[offset+1];
		pos[2] = position.array[offset+2];

		vec3.subtract(pos, re.viewParms.or.origin, n);

		var len = vec3.squaredLength(n);  // TODO lose the sqrt
		if (len < shortest) {
			shortest = len;
		}

		if (vec3.dot(n, normal.array[index.array[i]]) >= 0) {
			numTriangles--;
		}
	}

	if (!numTriangles) {
		return true;
	}

	// Mirrors can early out at this point, since we don't do a fade over distance
	// with them (although we could).
	if (re.viewParms.isMirror) {
		return false;
	}

	if (shortest > (geo.shader.portalRange * geo.shader.portalRange)) {
		return true;
	}

	return false;
}

/**
 * GetPortalOrientation
 *
 * entityNum is the entity that the portal surface is a part of, which may
 * be moving and rotating.
 *
 * Returns true if it should be mirrored.
 */
function GetPortalOrientations(viewParms, geo, entityNum, surface, camera) {
	// Create plane axis for the portal we are seeing.
	var plane;
	var originalPlane = PlaneForGeometry(geo);

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
		var refent = backend.refents[i];

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
			vec3.subtract(QMath.vec3origin, surface.axis[0], camera.axis[0]);
			vec3.set(surface.axis[1], camera.axis[1]);
			vec3.set(surface.axis[2], camera.axis[2]);

			viewParms.isMirror = true;
			return true;
		}

		// Project the origin onto the surface plane to get
		// an origin point we can rotate around.
		d = vec3.dot(refent.origin, plane.normal) - plane.dist;
		vec3.add(vec3.scale(surface.axis[0], -d, vec3.create()), refent.origin, surface.origin);

		// Now get the camera origin and orientation.
		vec3.set(refent.oldOrigin, camera.origin);
		QMath.AxisCopy(refent.axis, camera.axis);
		vec3.subtract(QMath.vec3origin, camera.axis[0], camera.axis[0]);
		vec3.subtract(QMath.vec3origin, camera.axis[1], camera.axis[1]);

		// Optionally rotate.
		var transformed = vec3.create();
		if (refent.oldFrame) {
			// If a speed is specified.
			if (refent.frame) {
				// Continuous rotate.
				var d = (re.refdef.time / 1000.0) * refent.frame;
				vec3.set(camera.axis[1], transformed);
				QMath.RotatePointAroundVector(transformed, camera.axis[0], d, camera.axis[1]);
				vec3.cross(camera.axis[0], camera.axis[1], camera.axis[2]);
			} else {
				// Bobbing rotate, with skinNum being the rotation offset.
				var d = Math.sin(re.refdef.time * 0.003);
				d = refent.skinNum + d * 4;
				vec3.set(camera.axis[1], transformed);
				QMath.RotatePointAroundVector(transformed, camera.axis[0], d, camera.axis[1]);
				vec3.cross(camera.axis[0], camera.axis[1], camera.axis[2]);
			}
		} else if (refent.skinNum) {
			var d = refent.skinNum;
			vec3.set(camera.axis[1], transformed);
			QMath.RotatePointAroundVector(transformed, camera.axis[0], d, camera.axis[1]);
			vec3.cross(camera.axis[0], camera.axis[1], camera.axis[2]);
		}
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
 * PlaneForGeometry
 */
function PlaneForGeometry(geo) {
	var index = geo.attributes.index;
	var position = geo.attributes.position;

	var idx1 = index.array[0]*3;
	var v1 = vec3.createFrom(
		position.array[idx1+0],
		position.array[idx1+1],
		position.array[idx1+2]
	);

	var idx2 = index.array[1]*3;
	var v2 = vec3.createFrom(
		position.array[idx2+0],
		position.array[idx2+1],
		position.array[idx2+2]
	);

	var idx3 = index.array[2]*3;
	var v3 = vec3.createFrom(
		position.array[idx3+0],
		position.array[idx3+1],
		position.array[idx3+2]
	);

	var plane = QMath.PlaneFromPoints(v1, v2, v3);

	return plane;
}

/**
 * MirrorPoint
 */
function MirrorPoint(src, surface, camera, dest) {
	var local = vec3.subtract(src, surface.origin, vec3.create());
	var transformed = vec3.create();

	for (var i = 0; i < 3; i++) {
		var d = vec3.dot(local, surface.axis[i]);
		vec3.add(transformed, vec3.scale(camera.axis[i], d, vec3.create()));
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
		vec3.add(dest, vec3.scale(camera.axis[i], d, vec3.create()));
	}
}