/**
 * BaseWindingForPlane
 */
function BaseWindingForPlane(normal, dist) {
	// Find the major axis.
	var max = -MAX_MAP_BOUNDS;
	var v;
	var x = -1;
	for (var i = 0; i < 3; i++) {
		v = Math.abs(normal[i]);
		if (v > max) {
			x = i;
			max = v;
		}
	}

	if (x === -1) {
		com.error(sh.Err.DROP, 'BaseWindingForPlane: no axis found');
	}
		
	var vup = [0, 0, 0];
	var org = [0, 0, 0];
	var vright = [0, 0, 0];
	switch (x) {
		case 0:
		case 1:
			vup[2] = 1;
			break;
		case 2:
			vup[0] = 1;
			break;
	}

	var v = vec3.dot(vup, normal);
	vec3.add(vup, vec3.scale(normal, -v, [0, 0, 0]));
	vec3.normalize(vup);
		
	vec3.scale(normal, dist, org);
	
	vec3.cross(vup, normal, vright);
	
	vec3.scale(vup, MAX_MAP_BOUNDS);
	vec3.scale(vright, MAX_MAP_BOUNDS);

	// Project a really big	axis aligned box onto the plane.
	var w = new winding_t();
	
	w.p[0] = vec3.subtract(org, vright, [0,0,0]);
	vec3.add(w.p[0], vup, w.p[0]);
	
	w.p[1] = vec3.add(org, vright, [0, 0, 0]);
	vec3.add(w.p[1], vup, w.p[1]);
	
	w.p[2] = vec3.add(org, vright, [0, 0, 0]);
	vec3.subtract(w.p[2], vup, w.p[2]);
	
	w.p[3] = vec3.subtract(org, vright, [0, 0, 0]);
	vec3.subtract(w.p[3], vup, w.p[3]);
	
	return w;
}

/**
 * WindingBounds
 */
function WindingBounds(w, mins, maxs) {
	var v;

	mins[0] = mins[1] = mins[2] = MAX_MAP_BOUNDS;
	maxs[0] = maxs[1] = maxs[2] = -MAX_MAP_BOUNDS;

	for (var i = 0; i < w.p.length; i++) {
		for (var j = 0; j < 3; j++) {
			v = w.p[i][j];

			if (v < mins[j]) {
				mins[j] = v;
			}

			if (v > maxs[j]) {
				maxs[j] = v;
			}
		}
	}
}

/**
 * ChopWindingInPlace
 */
function ChopWindingInPlace(inout, normal, dist, epsilon) {
	var i, j;
	var dot;
	var p1, p2;
	var dists = new Array(MAX_POINTS_ON_WINDING+4);
	var sides = new Array(MAX_POINTS_ON_WINDING+4);
	var counts = [0, 0, 0];
	var mid = [0, 0, 0];
	var orig = inout.clone();

	// Determine sides for each point.
	for (i = 0; i < orig.p.length; i++) {
		dot = dists[i] = vec3.dot(orig.p[i], normal) - dist;

		if (dot > epsilon) {
			sides[i] = SIDE_FRONT;
		} else if (dot < -epsilon) {
			sides[i] = SIDE_BACK;
		} else {
			sides[i] = SIDE_ON;
		}

		counts[sides[i]]++;
	}
	sides[i] = sides[0];
	dists[i] = dists[0];
	
	if (!counts[SIDE_FRONT]) {
		return false;
	}
	if (!counts[SIDE_BACK]) {
		return true;  // inout stays the same
	}

	// Reset inout points.
	var f = new winding_t();
	var maxpts = orig.p.length + 4;  // cant use counts[0]+2 because
	                                 // of fp grouping errors
		
	for (i = 0; i < orig.p.length; i++) {
		p1 = orig.p[i];
		
		if (sides[i] === SIDE_ON) {
			f.p.push(vec3.set(p1, [0, 0, 0]));
			continue;
		}
	
		if (sides[i] === SIDE_FRONT) {
			f.p.push(vec3.set(p1, [0, 0, 0]));
		}

		if (sides[i+1] === SIDE_ON || sides[i+1] === sides[i]) {
			continue;
		}

		// Generate a split point.
		p2 = orig.p[(i+1) % orig.p.length];
		dot = dists[i] / (dists[i]-dists[i+1]);

		for (var j = 0; j < 3; j++) {
			// Avoid round off error when possible.
			if (normal[j] === 1) {
				mid[j] = dist;
			} else if (normal[j] === -1) {
				mid[j] = -dist;
			} else {
				mid[j] = p1[j] + dot*(p2[j]-p1[j]);
			}
		}
			
		f.p.push(vec3.set(mid, [0, 0, 0]));
	}

	if (f.p.length > maxpts) {
		com.error(sh.Err.DROP, 'ClipWinding: points exceeded estimate');
	}

	if (f.p.length > MAX_POINTS_ON_WINDING) {
		com.error(sh.Err.DROP, 'ClipWinding: MAX_POINTS_ON_WINDING');
	}

	f.clone(inout);

	return true;
}