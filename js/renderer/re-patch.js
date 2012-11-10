var MAX_GRID_SIZE = 129;

/**
 * LerpDrawVert
 */
function LerpDrawVert(a, b, out) {
	out.pos[0] = 0.5 * (a.pos[0] + b.pos[0]);
	out.pos[1] = 0.5 * (a.pos[1] + b.pos[1]);
	out.pos[2] = 0.5 * (a.pos[2] + b.pos[2]);

	out.lmCoord[0] = 0.5 * (a.lmCoord[0] + b.lmCoord[0]);
	out.lmCoord[1] = 0.5 * (a.lmCoord[1] + b.lmCoord[1]);

	out.texCoord[0] = 0.5 * (a.texCoord[0] + b.texCoord[0]);
	out.texCoord[1] = 0.5 * (a.texCoord[1] + b.texCoord[1]);

	out.color[0] = (a.color[0] + b.color[0]) >> 1;
	out.color[1] = (a.color[1] + b.color[1]) >> 1;
	out.color[2] = (a.color[2] + b.color[2]) >> 1;
	out.color[3] = (a.color[3] + b.color[3]) >> 1;
}

/**
 * Transpose
 */
function Transpose(ctrl, width, height) {
	var temp;

	if (width > height) {
		for (var i = 0; i < height; i++) {
			for (var j = i + 1; j < width; j++) {
				if (j < height) {
					// swap the value
					temp = ctrl[j][i];
					ctrl[j][i] = ctrl[i][j];
					ctrl[i][j] = temp;
				} else {
					// just copy
					ctrl[j][i] = ctrl[i][j];
				}
			}
		}
	} else {
		for (var i = 0; i < width; i++) {
			for (var j = i + 1; j < height; j++) {
				if (j < width) {
					// swap the value
					temp = ctrl[i][j];
					ctrl[i][j] = ctrl[j][i];
					ctrl[j][i] = temp;
				} else {
					// just copy
					ctrl[i][j] = ctrl[j][i];
				}
			}
		}
	}

}

/**
 * PutPointsOnCurve
 */
function PutPointsOnCurve(ctrl, width, height) {
	var prev = {pos: [0,0,0], lmCoord: [0,0], texCoord: [0, 0], color: [0, 0, 0, 0], normal: [0, 0, 1]};
	var next = {pos: [0,0,0], lmCoord: [0,0], texCoord: [0, 0], color: [0, 0, 0, 0], normal: [0, 0, 1]};

	for (var i = 0; i < width; i++) {
		for (var j = 1; j < height; j += 2) {
			LerpDrawVert(ctrl[j][i], ctrl[j-1][i], prev);
			LerpDrawVert(ctrl[j][i], ctrl[j+1][i], next);
			LerpDrawVert(prev, next, ctrl[j][i]);
		}
	}

	for (var j = 0; j < height; j++) {
		for (var i = 1; i < width; i += 2) {
			LerpDrawVert(ctrl[j][i], ctrl[j][i-1], prev);
			LerpDrawVert(ctrl[j][i], ctrl[j][i+1], next);
			LerpDrawVert(prev, next, ctrl[j][i]);
		}
	}
}

/**
 * SubdividePatchToGrid
 *
 * Tessellate a bezier patch. Most implementations take the patch's control points and step
 * across 0...1 some fixed amount, generating new vertices along the curve. This approach
 * works, but doesn't treat small and large curves alike, creating more vertices than necessary
 * for smaller patches and not enough for larger patches. 
 * 
 * What this approach does is subdivide the control points with LerpDrawVert, and check
 * the distance of the subdivided midpoints from the actual point on the curve. Once the
 * distance is within an acceptable range, it stops subdividing.
 */
function SubdividePatchToGrid(points, width, height, subdivisions) {
	var ctrl = new Array(MAX_GRID_SIZE);
	for (var i = 0; i < MAX_GRID_SIZE; i++) {
		ctrl[i] = new Array(MAX_GRID_SIZE);
	}

	// Convert points to multidimensional array to work with.
	for (var j = 0; j < width ; j++) {
		for (var i = 0; i < height; i++) {
			ctrl[i][j] = points[i*width+j];
		}
	}

	for (var rot = 0; rot < 2; rot++) {
		for (var j = 0; j + 2 < width; j += 2) {
			// Check subdivided midpoints against control points.
			var maxLen = 0;
			for (var i = 0; i < height; i++) {
				// Calculate the point on the curve using the biquadratic bezier equation:
				// (1–t)^2*P0 + 2*(1–t)*t*P1 + t^2*P2
				// We're using a simplified version as t is always 0.5 in this case.
				var midxyz = [0, 0, 0];
				for (var l = 0; l < 3; l++) {
					midxyz[l] = (ctrl[i][j].pos[l] + ctrl[i][j+1].pos[l] * 2 + ctrl[i][j+2].pos[l]) * 0.25;
				}

				// see how far off the line it is
				// using dist-from-line will not account for internal
				// texture warping, but it gives a lot less polygons than
				// dist-from-midpoint
				vec3.subtract(midxyz, ctrl[i][j].pos);

				var dir = vec3.subtract(ctrl[i][j+2].pos, ctrl[i][j].pos, [0, 0, 0]);
				vec3.normalize(dir);

				var d = vec3.dot(midxyz, dir);
				var projected = vec3.scale(dir, d, [0, 0, 0]);
				var midxyz2 = vec3.subtract(midxyz, projected);
				var len = vec3.length(midxyz2);
				if (len > maxLen) {
					maxLen = len;
				}
			}

			// If all the points are on the lines, remove the entire columns.
			if (maxLen < 0.1) {
				continue;
			}

			// See if we want to insert subdivided columns.
			if (width + 2 > MAX_GRID_SIZE) {
				continue;
			}

			// Stop subdividing.
			if (maxLen <= subdivisions) {
				continue;
			}

			// Insert two columns and replace the peak.
			width += 2;

			for (var i = 0; i < height; i++ ) {
				var prev = {pos: [0,0,0], lmCoord: [0,0], texCoord: [0, 0], color: [0, 0, 0, 0], normal: [0, 0, 1]};
				var next = {pos: [0,0,0], lmCoord: [0,0], texCoord: [0, 0], color: [0, 0, 0, 0], normal: [0, 0, 1]};
				var mid =  {pos: [0,0,0], lmCoord: [0,0], texCoord: [0, 0], color: [0, 0, 0, 0], normal: [0, 0, 1]};

				LerpDrawVert(ctrl[i][j],   ctrl[i][j+1], prev);
				LerpDrawVert(ctrl[i][j+1], ctrl[i][j+2], next);
				LerpDrawVert(prev,         next,         mid);

				// Shift array over by 2 to make way for the new control points.
				for (var k = width - 1; k > j + 3; k--) {
					ctrl[i][k] = ctrl[i][k-2];
				}

				ctrl[i][j+1] = prev;
				ctrl[i][j+2] = mid;
				ctrl[i][j+3] = next;
			}

			// Back up and recheck this set again, it may need more subdivision.
			j -= 2;
		}

		// Transpose the array and tesselate in the other direction.
		Transpose(ctrl, width, height);
		var t = width;
		width = height;
		height = t;
	}

	// Put all the approximating points on the curve.
	PutPointsOnCurve(ctrl, width, height);

	// Convert back to a flat array.
	var verts = new Array(width*height);
	for (var i = 0; i < height; i++) {
		for (var j = 0; j < width; j++) {
			verts[i*width+j] = ctrl[i][j];
		}
	}

	return {
		verts: verts,
		width: width,
		height: height
	};
}