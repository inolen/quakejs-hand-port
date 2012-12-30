/**
 * MarkFragments
 */
function MarkFragments(points, projection) {
	// TODO Store this info in the actual surface, it's lame to have
	// to reference these.
	var verts = re.world.verts;
	var meshVerts = re.world.meshVerts;

	// Increment view count for double check prevention.
	re.viewCount++;

	//
	var projectionDir = vec3.normalize(projection, [0, 0, 0]);
	var mins = [0, 0, 0];
	var maxs = [0, 0, 0];

	//
	// Find all the brushes that are to be considered.
	//
	var temp = [0, 0, 0];

	QMath.ClearBounds(mins, maxs);

	for (var i = 0; i < points.length; i++) {
		QMath.AddPointToBounds(points[i], mins, maxs);

		vec3.add(points[i], projection, temp);
		QMath.AddPointToBounds(temp, mins, maxs);

		// Make sure we get all the leafs (also the one(s) in front of the hit surface).
		vec3.add(points[i], vec3.scale(projectionDir, -20, [0, 0, 0]), temp);
		QMath.AddPointToBounds(temp, mins, maxs);
	}

	//
	// Create the bounding planes for the to be projected polygon.
	//
	var v1 = [0, 0, 0];
	var v2 = [0, 0, 0];
	var numPoints = points.length;
	var planes = new Array(numPoints + 2);
	for (var i = 0; i < planes.length; i++) {
		planes[i] = new QMath.Plane();
	}

	for (var i = 0; i < numPoints; i++) {
		var plane = planes[i];

		vec3.subtract(points[(i + 1) % numPoints], points[i], v1);
		vec3.add(points[i], projection, v2);
		vec3.subtract(points[i], v2, v2);

		vec3.cross(v1, v2, plane.normal);
		vec3.normalize(plane.normal);

		plane.dist = vec3.dot(plane.normal, points[i]);
	}

	// Add near and far clipping planes for projection.
	var np = planes[numPoints];
	vec3.set(projectionDir, np.normal);
	np.dist = vec3.dot(np.normal, points[0]) - 32;

	var fp = planes[numPoints + 1];
	vec3.negate(projectionDir, fp.normal);
	fp.dist = vec3.dot(fp.normal, points[0]) - 20;

	//
	// Find the surfaces in the bounding box.
	//
	var surfaces = [];
	BoxSurfaces_r(re.world.nodes[0], mins, maxs, projectionDir, surfaces);

	//
	// Build fragments from each face.
	//
	var fragments = [];

	for (var i = 0; i < surfaces.length; i++) {
		var face = surfaces[i];
		var clipPoints = [];

		// if (face.surfaceType === SF.GRID) {
		// 	for (var m = 0; m < face.patchHeight - 1; m++) {
		// 		for (var n = 0; n < face.patchWidth - 1; n++) {
		// 			// We triangulate the grid and chop all triangles within
		// 			// the bounding planes of the to be projected polygon.
		// 			// LOD is not taken into account, not such a big deal though.
		// 			//
		// 			// It's probably much nicer to chop the grid itself and deal
		// 			// with this grid as a normal SF_GRID surface so LOD will
		// 			// be applied. However the LOD of that chopped grid must
		// 			// be synced with the LOD of the original curve.
		// 			// One way to do this; the chopped grid shares vertices with
		// 			// the original curve. When LOD is applied to the original
		// 			// curve the unused vertices are flagged. Now the chopped curve
		// 			// should skip the flagged vertices. This still leaves the
		// 			// problems with the vertices at the chopped grid edges.
		// 			//
		// 			// To avoid issues when LOD applied to "hollow curves" (like
		// 			// the ones around many jump pads) we now just add a 2 unit
		// 			// offset to the triangle vertices.
		// 			// The offset is added in the vertex normal vector direction
		// 			// so all triangles will still fit together.
		// 			// The 2 unit offset should avoid pretty much all LOD problems.

		// 			dv = cv->verts + m * cv->width + n;

		// 			VectorCopy(dv[0].xyz, clipPoints[0][0]);
		// 			VectorMA(clipPoints[0][0], MARKER_OFFSET, dv[0].normal, clipPoints[0][0]);
		// 			VectorCopy(dv[cv->width].xyz, clipPoints[0][1]);
		// 			VectorMA(clipPoints[0][1], MARKER_OFFSET, dv[cv->width].normal, clipPoints[0][1]);
		// 			VectorCopy(dv[1].xyz, clipPoints[0][2]);
		// 			VectorMA(clipPoints[0][2], MARKER_OFFSET, dv[1].normal, clipPoints[0][2]);
		// 			// Check the normal of this triangle.
		// 			VectorSubtract(clipPoints[0][0], clipPoints[0][1], v1);
		// 			VectorSubtract(clipPoints[0][2], clipPoints[0][1], v2);
		// 			CrossProduct(v1, v2, normal);
		// 			VectorNormalizeFast(normal);
		// 			if (vec3.dot(normal, projectionDir) < -0.1) {
		// 				// Add the fragments of this triangle.
		// 				AddMarkFragments(clipPoints, planes, fragments);
		// 			}

		// 			VectorCopy(dv[1].xyz, clipPoints[0][0]);
		// 			VectorMA(clipPoints[0][0], MARKER_OFFSET, dv[1].normal, clipPoints[0][0]);
		// 			VectorCopy(dv[cv->width].xyz, clipPoints[0][1]);
		// 			VectorMA(clipPoints[0][1], MARKER_OFFSET, dv[cv->width].normal, clipPoints[0][1]);
		// 			VectorCopy(dv[cv->width+1].xyz, clipPoints[0][2]);
		// 			VectorMA(clipPoints[0][2], MARKER_OFFSET, dv[cv->width+1].normal, clipPoints[0][2]);
		// 			// Check the normal of this triangle.
		// 			VectorSubtract(clipPoints[0][0], clipPoints[0][1], v1);
		// 			VectorSubtract(clipPoints[0][2], clipPoints[0][1], v2);
		// 			CrossProduct(v1, v2, normal);
		// 			VectorNormalizeFast(normal);
		// 			if (vec3.dot(normal, projectionDir) < -0.05) {
		// 				// Add the fragments of this triangle.
		// 				AddMarkFragments(clipPoints, planes, fragments);
		// 			}
		// 		}
		// 	}
		// }
		if (face.surfaceType === SF.FACE) {
			// Check the normal of this face.
			if (vec3.dot(face.plane.normal, projectionDir) > -0.5) {
				continue;
			}

			for (var j = 0; j < face.meshVertCount; j += 3) {
				for (var k = 0; k < 3 ; k++) {
					var v = verts[face.vertex + meshVerts[face.meshVert + j + k]];
					clipPoints[k] = vec3.set(v.pos, [0, 0, 0]);
				}

				// Add the fragments of this face.
				AddMarkFragments(clipPoints, planes, fragments);
			}
		}
// 	AP - Not used in VQ3.
// 		else if(*surfaces[i] == SF_TRIANGLES && r_marksOnTriangleMeshes->integer) {

// 			srfTriangles_t *surf = (srfTriangles_t *) surfaces[i];

// 			for (k = 0; k < surf->numIndexes; k += 3)
// 			{
// 				for(j = 0; j < 3; j++)
// 				{
// 					v = surf->verts[surf->indexes[k + j]].xyz;
// 					VectorMA(v, MARKER_OFFSET, surf->verts[surf->indexes[k + j]].normal, clipPoints[0][j]);
// 				}

// 				// add the fragments of this face
// 				R_AddMarkFragments(3, clipPoints,
// 								   numPlanes, normals, dists,
// 								   maxPoints, pointBuffer,
// 								   maxFragments, fragmentBuffer, &returnedPoints, &returnedFragments, mins, maxs);
// 				if(returnedFragments == maxFragments)
// 				{
// 					return returnedFragments;	// not enough space for more fragments
// 				}
// 			}
// 		}
	}

	return fragments;
}

/**
 * BoxSurfaces_r
 */
function BoxSurfaces_r(node, mins, maxs, dir, list) {
	// Do the tail recursion in a loop.
	while (node.children) {
		var s = QMath.BoxOnPlaneSide(mins, maxs, node.plane);
		if (s === 1) {
			node = node.children[0];
		} else if (s === 2) {
			node = node.children[1];
		} else {
			BoxSurfaces_r(node.children[0], mins, maxs, dir, list);
			node = node.children[1];
		}
	}

	// Add the individual surfaces.
	var faces = re.world.faces;
	var leafSurfaces = re.world.leafSurfaces;

	for (var i = 0; i < node.numLeafSurfaces; i++) {
		var face = faces[leafSurfaces[node.firstLeafSurface + i]];

		// Check if the surface has NOIMPACT or NOMARKS set.
		if ((face.shader.surfaceFlags & (SURF.NOIMPACT | SURF.NOMARKS)) ||
			(face.shader.contentFlags & CONTENTS.FOG)) {
			face.viewCount = re.viewCount;
		}
		// Extra check for surfaces to avoid list overflows
		else if (face.surfaceType === SF.FACE) {
			// The face plane should go through the box.
			var s = QMath.BoxOnPlaneSide(mins, maxs, face.plane);
			if (s === 1 || s === 2) {
				face.viewCount = re.viewCount;
			} else if (vec3.dot(face.plane.normal, dir) > -0.5) {
				// Don't add faces that make sharp angles with the projection direction.
				face.viewCount = re.viewCount;
			}
		}
		else if (face.surfaceType !== SF.GRID && face.surfaceType !== SF.TRIANGLES) {
			face.viewCount = re.viewCount;
		}

		// Check the viewCount because the surface may have
		// already been added if it spans multiple leafs
		if (face.viewCount !== re.viewCount) {
			face.viewCount = re.viewCount;
			list.push(face);
		}
	}
}

/**
 * AddMarkFragments
 *
 * Chop the surface by all the bounding planes of the to be projected polygon.
 */
function AddMarkFragments(points, planes, fragments) {
	var out = points;

	for (var i = 0; i < planes.length; i++) {
		out = ChopPolyBehindPlane(out, planes[i], 0.5);

		if (!out || out.length === 0) {
			break;
		}
	}
	// Completely clipped away?
	if (!out || out.length === 0) {
		return;
	}

	fragments.push(out);
}

/**
 * ChopPolyBehindPlane
 */
var SIDE_FRONT = 0;
var SIDE_BACK  = 1;
var SIDE_ON    = 2;
function ChopPolyBehindPlane(points, plane, epsilon) {
	// Out must have space for two more vertexes than in.
	var dists = new Array(points.length);
	var sides = new Array(points.length);
	var counts = [0, 0, 0];

	// Determine sides for each point.
	var i;
	for (i = 0; i < points.length; i++) {
		var d = vec3.dot(points[i], plane.normal) - plane.dist;
		dists[i] = d;

		if (d > epsilon) {
			sides[i] = SIDE_FRONT;
		} else if (d < -epsilon) {
			sides[i] = SIDE_BACK;
		} else {
			sides[i] = SIDE_ON;
		}

		counts[sides[i]]++;
	}
	sides[i] = sides[0];
	dists[i] = dists[0];

	// Nothing is in front of this plane, clip it all.
	if (!counts[SIDE_FRONT]) {
		return null;
	}

	var out = [];

	// All points are in front of the plane, clip nothing.
	if (!counts[SIDE_BACK]) {
		for (var i = 0; i < points.length; i++) {
			out.push(vec3.set(points[i], [0, 0, 0]));
		}
		return out;
	}

	// Split the poly.
	for (var i = 0; i < points.length; i++) {
		var p1 = points[i];

		if (sides[i] === SIDE_ON) {
			out.push(vec3.set(p1, [0, 0, 0]));
			continue;
		}

		if (sides[i] === SIDE_FRONT) {
			out.push(vec3.set(p1, [0, 0, 0]));
		}

		if (sides[i + 1] === SIDE_ON || sides[i + 1] === sides[i]) {
			continue;
		}

		// Generate a split point.
		var p2 = points[(i + 1) % points.length];

		var d = dists[i] - dists[i + 1];
		var dot = 0;
		if (d !== 0) {
			dot = dists[i] / d;
		}

		// Clip xyz.
		out.push(
			vec3.add(
				vec3.scale(
					vec3.subtract(p2, p1, [0, 0, 0]),
					dot
				),
			p1)
		);
	}

	return out;
}