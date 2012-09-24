var q3bsptree_trace_offset = 0.03125;

function TraceThroughTree(output, num, startFraction, endFraction, start, end, radius) {
	var brushes = cm.brushes;
	var leaves = cm.leaves;
	var leafBrushes = cm.leafBrushes;
	var nodes = cm.nodes;
	var planes = cm.planes;
	var shaders = cm.shaders;

	if (num < 0) { // Leaf node?
		var leaf = leaves[-(num + 1)];
		TraceThroughLeaf(output, leaf, start, end, radius);
		return;
	}

	// Tree node
	var node = nodes[num];
	var plane = planes[node.plane];

	var startDist = vec3.dot(plane.normal, start) - plane.distance;
	var endDist = vec3.dot(plane.normal, end) - plane.distance;

	if (startDist >= radius && endDist >= radius) {
		TraceThroughTree(output, node.children[0], startFraction, endFraction, start, end, radius);
	} else if (startDist < -radius && endDist < -radius) {
		TraceThroughTree(output, node.children[1], startFraction, endFraction, start, end, radius);
	} else {
		var side;
		var fraction1, fraction2, middleFraction;
		var middle = [0, 0, 0];

		if (startDist < endDist) {
			side = 1; // back
			var iDist = 1 / (startDist - endDist);
			fraction1 = (startDist - radius + q3bsptree_trace_offset) * iDist;
			fraction2 = (startDist + radius + q3bsptree_trace_offset) * iDist;
		} else if (startDist > endDist) {
			side = 0; // front
			var iDist = 1 / (startDist - endDist);
			fraction1 = (startDist + radius + q3bsptree_trace_offset) * iDist;
			fraction2 = (startDist - radius - q3bsptree_trace_offset) * iDist;
		} else {
			side = 0; // front
			fraction1 = 1;
			fraction2 = 0;
		}

		if (fraction1 < 0) fraction1 = 0;
		else if (fraction1 > 1) fraction1 = 1;
		if (fraction2 < 0) fraction2 = 0;
		else if (fraction2 > 1) fraction2 = 1;

		middleFraction = startFraction + (endFraction - startFraction) * fraction1;

		for (var i = 0; i < 3; i++) {
			middle[i] = start[i] + fraction1 * (end[i] - start[i]);
		}

		TraceThroughTree(output, node.children[side], startFraction, middleFraction, start, middle, radius);

		middleFraction = startFraction + (endFraction - startFraction) * fraction2;

		for (var i = 0; i < 3; i++) {
			middle[i] = start[i] + fraction2 * (end[i] - start[i]);
		}

		TraceThroughTree(output, node.children[side===0?1:0], middleFraction, endFraction, middle, end, radius);
	}
}

function TraceThroughLeaf(output, leaf, start, end, radius) {
	var brushes = cm.brushes;
	var leafBrushes = cm.leafBrushes;
	var shaders = cm.shaders;

	for (var i = 0; i < leaf.leafBrushCount; i++) {
		var brush = brushes[leafBrushes[leaf.leafBrush + i]];
		var shader = shaders[brush.shader];
		if (brush.brushSideCount > 0 && shader.contents & 1) {
			TraceThroughBrush(output, brush, start, end, radius);
		}
	}
}

function TraceThroughBrush(output, brush, start, end, radius) {
	var brushSides = cm.brushSides;
	var planes = cm.planes;
	var startFraction = -1;
	var endFraction = 1;
	var startsOut = false;
	var endsOut = false;
	var collisionPlane = null;

	for (var i = 0; i < brush.brushSideCount; i++) {
		var brushSide = brushSides[brush.brushSide + i];
		var plane = planes[brushSide.plane];

		var startDist = vec3.dot( start, plane.normal ) - (plane.distance + radius);
		var endDist = vec3.dot( end, plane.normal ) - (plane.distance + radius);

		if (startDist > 0) startsOut = true;
		if (endDist > 0) endsOut = true;

		// make sure the trace isn't completely on one side of the brush
		if (startDist > 0 && endDist > 0) { return; }
		if (startDist <= 0 && endDist <= 0) { continue; }

		if (startDist > endDist) { // line is entering into the brush
			var fraction = (startDist - q3bsptree_trace_offset) / (startDist - endDist);
			if (fraction > startFraction) {
				startFraction = fraction;
				collisionPlane = plane;
			}
		} else { // line is leaving the brush
			var fraction = (startDist + q3bsptree_trace_offset) / (startDist - endDist);
			if (fraction < endFraction)
				endFraction = fraction;
		}
	}

	if (startsOut === false) {
		output.startSolid = true;
		if (endsOut === false)
			output.allSolid = true;
		return;
	}

	if (startFraction < endFraction) {
		if (startFraction > -1 && startFraction < output.fraction) {
			output.plane = collisionPlane;
			if (startFraction < 0)
				startFraction = 0;
			output.fraction = startFraction;
		}
	}

	return;
}

function Trace(start, end, radius) {
	var output = {
		allSolid: false,
		startSolid: false,
		fraction: 1.0,
		endPos: end,
		plane: null
	};

	if (!radius) {
		radius = 0;
	}

	TraceThroughTree(output, 0, 0, 1, start, end, radius);

	if (output.fraction != 1.0) { // collided with something
		for (var i = 0; i < 3; i++) {
			output.endPos[i] = start[i] + output.fraction * (end[i] - start[i]);
		}
	}

	return output;
}