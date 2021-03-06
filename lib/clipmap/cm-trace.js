/*********************************************************************
 *
 * Position testing
 *
 ********************************************************************/

/**
 * TestBoxInBrush
 */
function TestBoxInBrush(tw, brush) {
	var brushSides = cm.brushSides;

	if (!brush.numSides) {
		return;
	}

	// Special test for axial.
	if (tw.bounds[0][0] > brush.bounds[1][0] ||
		tw.bounds[0][1] > brush.bounds[1][1] ||
		tw.bounds[0][2] > brush.bounds[1][2] ||
		tw.bounds[1][0] < brush.bounds[0][0] ||
		tw.bounds[1][1] < brush.bounds[0][1] ||
		tw.bounds[1][2] < brush.bounds[0][2]) {
		return;
	}

	// The first six planes are the axial planes, so we only
	// need to test the remainder.
	for (var i = 6; i < brush.numSides; i++) {
		var side = brushSides[brush.firstSide + i];
		var plane = side.plane;

		// adjust the plane distance apropriately for mins/maxs
		var dist = plane.dist - vec3.dot(tw.offsets[plane.signbits], plane.normal);
		var d1 = vec3.dot(tw.start, plane.normal) - dist;

		// if completely in front of face, no intersection
		if (d1 > 0) {
			return;
		}
	}

	// Inside this brush.
	tw.trace.startSolid = tw.trace.allSolid = true;
	tw.trace.fraction = 0;
	tw.trace.contents = brush.contents;
}

/**
 * TestInLeaf
 */
function TestInLeaf(tw, leaf) {
	var brushes = cm.brushes;
	var leafBrushes = cm.leafBrushes;

	// Test box position against all brushes in the leaf.
	for (var k = 0; k < leaf.numLeafBrushes; k++) {
		var brushnum = leafBrushes[leaf.firstLeafBrush+k];
		var b = brushes[brushnum];

		if (b.checkcount === cm.checkcount) {
			continue;  // already checked this brush in another leaf
		}
		b.checkcount = cm.checkcount;

		if (!(b.contents & tw.contents)) {
			continue;
		}

		TestBoxInBrush(tw, b);
		if (tw.trace.allSolid) {
			return;
		}
	}

	/*// test against all patches
	if ( !cm_noCurves->integer ) {
		for ( k = 0 ; k < leaf->numLeafSurfaces ; k++ ) {
			patch = cm.surfaces[ cm.leafsurfaces[ leaf->firstLeafSurface + k ] ];
			if ( !patch ) {
				continue;
			}
			if ( patch->checkcount == cm.checkcount ) {
				continue;	// already checked this brush in another leaf
			}
			patch->checkcount = cm.checkcount;

			if ( !(patch->contents & tw->contents)) {
				continue;
			}

			if ( CM_PositionTestInPatchCollide( tw, patch->pc ) ) {
				tw->trace.startsolid = tw->trace.allsolid = true;
				tw->trace.fraction = 0;
				tw->trace.contents = patch->contents;
				return;
			}
		}
	}*/
}

/**
 * PositionTest
 */

// Don't allocate this each time.
var ptleafs = new Uint32Array(MAX_POSITION_LEAFS);

function PositionTest(tw) {
	var leafs = cm.leafs;
	var mins = vec3.add(tw.start, tw.size[0], vec3.create());
	var maxs = vec3.add(tw.start, tw.size[1], vec3.create());

	vec3.add(mins, [-1, -1, -1]);
	vec3.add(maxs, [1, 1, 1]);

	var ll = new LeafList();
	ll.list = ptleafs;
	ll.maxCount = MAX_POSITION_LEAFS;

	cm.checkcount++;
	BoxLeafnums_r(ll, mins, maxs, 0);
	cm.checkcount++;

	// Test the contents of the leafs.
	for (var i = 0; i < ll.count; i++) {
		TestInLeaf(tw, leafs[ll.list[i]]);

		if (tw.trace.allSolid) {
			break;
		}
	}
}

/*********************************************************************
 *
 * Tracing
 *
 ********************************************************************/

/**
 * TraceThroughTree
 */
function TraceThroughTree(tw, num, p1f, p2f, p1, p2) {
	var brushes = cm.brushes;
	var leafs = cm.leafs;
	var leafBrushes = cm.leafBrushes;
	var nodes = cm.nodes;
	var planes = cm.planes;

	if (tw.trace.fraction <= p1f) {
		return; // already hit something nearer
	}

	if (num < 0) { // Leaf node?
		TraceThroughLeaf(tw, leafs[-(num + 1)]);
		return;
	}

	//
	// Find the point distances to the seperating plane
	// and the offset for the size of the box.
	//
	var node = nodes[num];
	var plane = planes[node.planeNum];

	// Adjust the plane distance apropriately for mins/maxs.
	var t1, t2, offset;

	if (plane.type < 3) {
		t1 = p1[plane.type] - plane.dist;
		t2 = p2[plane.type] - plane.dist;
		offset = tw.extents[plane.type];
	} else {
		t1 = vec3.dot(plane.normal, p1) - plane.dist;
		t2 = vec3.dot(plane.normal, p2) - plane.dist;
		if (tw.isPoint) {
			offset = 0;
		} else {
			// This is silly.
			offset = 2048;
		}
	}

	// See which sides we need to consider.
	if (t1 >= offset + 1 && t2 >= offset + 1) {
		TraceThroughTree(tw, node.childrenNum[0], p1f, p2f, p1, p2);
		return;
	}
	if (t1 < -offset - 1 && t2 < -offset - 1) {
		TraceThroughTree(tw, node.childrenNum[1], p1f, p2f, p1, p2);
		return;
	}

	// Put the crosspoint SURFACE_CLIP_EPSILON pixels on the near side.
	var idist, side, frac, frac2;

	if (t1 < t2) {
		idist = 1.0/(t1-t2);
		side = 1;
		frac2 = (t1 + offset + SURFACE_CLIP_EPSILON) * idist;
		frac = (t1 - offset + SURFACE_CLIP_EPSILON) * idist;
	} else if (t1 > t2) {
		idist = 1.0/(t1-t2);
		side = 0;
		frac2 = (t1 - offset - SURFACE_CLIP_EPSILON) * idist;
		frac = (t1 + offset + SURFACE_CLIP_EPSILON) * idist;
	} else {
		side = 0;
		frac = 1;
		frac2 = 0;
	}

	// Move up to the node.
	var mid = vec3.create(), midf;

	if (frac < 0) {
		frac = 0;
	} else if (frac > 1) {
		frac = 1;
	}

	midf = p1f + (p2f - p1f)*frac;
	mid[0] = p1[0] + frac*(p2[0] - p1[0]);
	mid[1] = p1[1] + frac*(p2[1] - p1[1]);
	mid[2] = p1[2] + frac*(p2[2] - p1[2]);

	TraceThroughTree(tw, node.childrenNum[side], p1f, midf, p1, mid);

	// Go past the node.
	if (frac2 < 0) {
		frac2 = 0;
	}
	if (frac2 > 1) {
		frac2 = 1;
	}

	midf = p1f + (p2f - p1f)*frac2;
	mid[0] = p1[0] + frac2*(p2[0] - p1[0]);
	mid[1] = p1[1] + frac2*(p2[1] - p1[1]);
	mid[2] = p1[2] + frac2*(p2[2] - p1[2]);

	TraceThroughTree(tw, node.childrenNum[side^1], midf, p2f, mid, p2);
}

/**
 * TraceThroughLeaf
 */
function TraceThroughLeaf(tw, leaf) {
	var brushes = cm.brushes;
	var leafBrushes = cm.leafBrushes;

	// Trace line against all brushes in the leaf.
	for (var i = 0; i < leaf.numLeafBrushes; i++) {
		var brushNum = leafBrushes[leaf.firstLeafBrush + i];
		var brush = brushes[brushNum];

		if (brush.checkcount === cm.checkcount) {
			continue;  // already checked this brush in another leaf
		}

		brush.checkcount = cm.checkcount;

		if (!(brush.contents & tw.contents)) {
			continue;
		}

		if (!QMath.BoundsIntersect(tw.bounds[0], tw.bounds[1], brush.bounds[0], brush.bounds[1], SURFACE_CLIP_EPSILON)) {
			continue;
		}

		TraceThroughBrush(tw, brush);

		if (!tw.trace.fraction) {
			return;
		}
	}

	// Trace line against all patches in the leaf.
	for (var i = 0; i < leaf.numLeafSurfaces; i++) {
		var patch = cm.surfaces[cm.leafSurfaces[leaf.firstLeafSurface + i]];

		if (!patch) {
			continue;
		}

		if (patch.checkcount === cm.checkcount) {
			continue;  // already checked this patch in another leaf
		}
		patch.checkcount = cm.checkcount;

		if (!(patch.contents & tw.contents)) {
			continue;
		}

		TraceThroughPatch(tw, patch);

		if (!tw.trace.fraction) {
			return;
		}
	}
}

/**
 * TraceThroughBrush
 */
function TraceThroughBrush(tw, brush) {
	var brushSides = cm.brushSides;
	var shaders = cm.shaders;
	var trace = tw.trace;
	var leadside;
	var clipplane;
	var getout = false;
	var startout = false;
	var enterFrac = -1.0;
	var leaveFrac = 1.0;

	if (!brush.numSides) {
		return;
	}

	// Compare the trace against all planes of the brush.
	// Find the latest time the trace crosses a plane towards the interior
	// and the earliest time the trace crosses a plane towards the exterior.
	for (var i = 0; i < brush.numSides; i++) {
		var side = cm.brushSides[brush.firstSide + i];
		var plane = side.plane;

		// Adjust the plane distance apropriately for mins/maxs.
		var dist = plane.dist - vec3.dot(tw.offsets[plane.signbits], plane.normal);
		var d1 = vec3.dot(tw.start, plane.normal) - dist;
		var d2 = vec3.dot(tw.end, plane.normal) - dist;

		if (d2 > 0) {
			getout = true;  // endpoint is not in solid
		}
		if (d1 > 0) {
			startout = true;
		}

		// If completely in front of face, no intersection with the entire brush.
		if (d1 > 0 && (d2 >= SURFACE_CLIP_EPSILON || d2 >= d1)) {
			return;
		}

		// If it doesn't cross the plane, the plane isn't relevent.
		if (d1 <= 0 && d2 <= 0) {
			continue;
		}

		// Crosses face.
		if (d1 > d2) {  // enter
			var f = (d1 - SURFACE_CLIP_EPSILON) / (d1 - d2);
			if (f < 0) {
				f = 0;
			}
			if (f > enterFrac) {
				enterFrac = f;
				clipplane = plane;
				leadside = side;
			}
		} else {  // leave
			var f = (d1 + SURFACE_CLIP_EPSILON) / (d1 - d2);
			if (f > 1) {
				f = 1;
			}
			if (f < leaveFrac) {
				leaveFrac = f;
			}
		}
	}

	//
	// All planes have been checked, and the trace was not
	// completely outside the brush.
	//
	if (!startout) {  // original point was inside brush
		tw.trace.startSolid = true;
		if (!getout) {
			tw.trace.allSolid = true;
			tw.trace.fraction = 0;
			tw.trace.contents = brush.contents;
		}
		return;
	}

	if (enterFrac < leaveFrac) {
		if (enterFrac > -1 && enterFrac < tw.trace.fraction) {
			if (enterFrac < 0) {
				enterFrac = 0;
			}
			tw.trace.fraction = enterFrac;
			clipplane.clone(tw.trace.plane);
			tw.trace.contents = brush.contents;
			tw.trace.surfaceFlags = leadside.surfaceFlags;
		}
	}
}

/**
 * TraceThroughPatch
 */
function TraceThroughPatch(tw, patch) {
	var oldFrac = tw.trace.fraction;

	TraceThroughPatchCollide(tw, patch.pc);

	if (tw.trace.fraction < oldFrac) {
		tw.trace.surfaceFlags = patch.surfaceFlags;
		tw.trace.contents = patch.contents;
	}
}

/**
 * Trace
 */
var staticTraceWork = new TraceWork();

function Trace(results, start, end, mins, maxs, model, origin, brushmask) {
	var tw = staticTraceWork;

	tw.reset();

	if (!cm.checkcount) {
		cm.checkcount = 0;
	}
	cm.checkcount++;  // for multi-check avoidance

	// Allow NULL to be passed in for 0,0,0.
	if (!mins) {
		mins = vec3.create();
	}
	if (!maxs) {
		maxs = vec3.create();
	}

	// Set basic parms.
	tw.contents = brushmask;

	// Adjust so that mins and maxs are always symetric, which
	// avoids some complications with plane expanding of rotated
	// bmodels.
	var offset = vec3.create();
	for (var i = 0 ; i < 3 ; i++) {
		offset[i] = (mins[i] + maxs[i]) * 0.5;
		tw.size[0][i] = mins[i] - offset[i];
		tw.size[1][i] = maxs[i] - offset[i];
		tw.start[i] = start[i] + offset[i];
		tw.end[i] = end[i] + offset[i];
	}

	// tw.offsets[signbits] = vector to apropriate corner from origin
	tw.offsets[0][0] = tw.size[0][0];
	tw.offsets[0][1] = tw.size[0][1];
	tw.offsets[0][2] = tw.size[0][2];

	tw.offsets[1][0] = tw.size[1][0];
	tw.offsets[1][1] = tw.size[0][1];
	tw.offsets[1][2] = tw.size[0][2];

	tw.offsets[2][0] = tw.size[0][0];
	tw.offsets[2][1] = tw.size[1][1];
	tw.offsets[2][2] = tw.size[0][2];

	tw.offsets[3][0] = tw.size[1][0];
	tw.offsets[3][1] = tw.size[1][1];
	tw.offsets[3][2] = tw.size[0][2];

	tw.offsets[4][0] = tw.size[0][0];
	tw.offsets[4][1] = tw.size[0][1];
	tw.offsets[4][2] = tw.size[1][2];

	tw.offsets[5][0] = tw.size[1][0];
	tw.offsets[5][1] = tw.size[0][1];
	tw.offsets[5][2] = tw.size[1][2];

	tw.offsets[6][0] = tw.size[0][0];
	tw.offsets[6][1] = tw.size[1][1];
	tw.offsets[6][2] = tw.size[1][2];

	tw.offsets[7][0] = tw.size[1][0];
	tw.offsets[7][1] = tw.size[1][1];
	tw.offsets[7][2] = tw.size[1][2];

	//
	// Calculate bounds.
	//
	for (var i = 0 ; i < 3 ; i++) {
		if (tw.start[i] < tw.end[i]) {
			tw.bounds[0][i] = tw.start[i] + tw.size[0][i];
			tw.bounds[1][i] = tw.end[i] + tw.size[1][i];
		} else {
			tw.bounds[0][i] = tw.end[i] + tw.size[0][i];
			tw.bounds[1][i] = tw.start[i] + tw.size[1][i];
		}
	}

	//
	// Check for position test special case.
	//
	var cmod = model ? ClipHandleToModel(model) : null;

	if (start[0] == end[0] && start[1] == end[1] && start[2] == end[2]) {
		if (model) {
			TestInLeaf(tw, cmod.leaf);
		} else {
			PositionTest(tw);
		}
	} else {
		//
		// Check for point special case.
		//
		if (tw.size[0][0] === 0 && tw.size[0][1] === 0 && tw.size[0][2] === 0) {
			tw.isPoint = true;
			tw.extents = vec3.create();
		} else {
			tw.isPoint = false;
			tw.extents[0] = tw.size[1][0];
			tw.extents[1] = tw.size[1][1];
			tw.extents[2] = tw.size[1][2];
		}

		if (model) {
			TraceThroughLeaf(tw, cmod.leaf);
		} else {
			TraceThroughTree(tw, 0, 0, 1, tw.start, tw.end);
		}
	}

	// Generate endpos from the original, unmodified start/end.
	for (var i = 0; i < 3; i++) {
		tw.trace.endPos[i] = start[i] + tw.trace.fraction * (end[i] - start[i]);
	}

	// If allsolid is set (was entirely inside something solid), the plane is not valid.
	// If fraction == 1.0, we never hit anything, and thus the plane is not valid.
	// Otherwise, the normal on the plane should have unit length.
	if (!tw.trace.allSolid && tw.trace.fraction !== 1.0 && vec3.squaredLength(tw.trace.plane.normal) <= 0.9999 && !vec3.length(tw.trace.endPos)) {
		error('Invalid trace result');
	}

	tw.trace.clone(results);
}

/**
 * BoxTrace
 */
function BoxTrace(results, start, end, mins, maxs, model, brushmask) {
	return Trace(results, start, end, mins, maxs, model, vec3.create(), brushmask);
}

/**
 * TransformedBoxTrace
 *
 * Handles offseting and rotation of the end points for moving and
 * rotating entities.
 */
function TransformedBoxTrace(results, start, end, mins, maxs, model, brushmask, origin, angles) {
	if (!mins) {
		mins = vec3.create();
	}
	if (!maxs) {
		maxs = vec3.create();
	}

	var start_l = vec3.create();
	var end_l = vec3.create();
	var offset = vec3.create();
	var symetricSize = [
		vec3.create(),
		vec3.create()
	];
	var matrix = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	var transpose = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];

	// Adjust so that mins and maxs are always symetric, which
	// avoids some complications with plane expanding of rotated
	// bmodels.
	for (var i = 0; i < 3; i++) {
		offset[i] = (mins[i] + maxs[i]) * 0.5;
		symetricSize[0][i] = mins[i] - offset[i];
		symetricSize[1][i] = maxs[i] - offset[i];
		start_l[i] = start[i] + offset[i];
		end_l[i] = end[i] + offset[i];
	}

	// Subtract origin offset.
	vec3.subtract(start_l, origin);
	vec3.subtract(end_l, origin);

	// Rotate start and end into the models frame of reference
	var rotated = false;
	if (model !== BOX_MODEL_HANDLE && (angles[0] || angles[1] || angles[2])) {
		rotated = true;
	}

	if (rotated) {
		// Rotation on trace line (start-end) instead of rotating the bmodel
		// NOTE: This is still incorrect for bounding boxes because the actual bounding
		//		 box that is swept through the model is not rotated. We cannot rotate
		//		 the bounding box or the bmodel because that would make all the brush
		//		 bevels invalid.
		QMath.AnglesToAxis(angles, matrix);
		QMath.RotatePoint(start_l, matrix);
		QMath.RotatePoint(end_l, matrix);
	}

	// Sweep the box through the model
	Trace(results, start_l, end_l, symetricSize[0], symetricSize[1], model, origin, brushmask);

	// If the bmodel was rotated and there was a collision.
	if (rotated && results.fraction !== 1.0) {
		// Rotation of bmodel collision plane.
		QMath.TransposeMatrix(matrix, transpose);
		QMath.RotatePoint(results.plane.normal, transpose);
	}

	// Re-calculate the end position of the trace because the results.endPos
	// calculated by Trace could be rotated and have an offset.
	results.endPos[0] = start[0] + results.fraction * (end[0] - start[0]);
	results.endPos[1] = start[1] + results.fraction * (end[1] - start[1]);
	results.endPos[2] = start[2] + results.fraction * (end[2] - start[2]);
}
