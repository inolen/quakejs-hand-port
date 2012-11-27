// int	c_totalPatchBlocks;
// int	c_totalPatchSurfaces;
// int	c_totalPatchEdges;

// static const patchCollide_t	*debugPatchCollide;
// static const facet_t		*debugFacet;
// static qboolean		debugBlock;
// static vec3_t		debugBlockPoints[4];

var EN_TOP = 0;
var EN_RIGHT = 1;
var EN_BOTTOM = 2;
var EN_LEFT = 3;

var debugPatchCollides = [];

// /*
// =================
// CM_ClearLevelPatches
// =================
// */
// void CM_ClearLevelPatches( void ) {
// 	debugPatchCollide = NULL;
// 	debugFacet = NULL;
// }

// Both of these should be gone when we convert to Plane()
function Vector4Copy(a, b) {
	b[0] = a[0];
	b[1] = a[1];
	b[2] = a[2];
	b[3] = a[3];
}

/**
 * PlaneFromPoints
 *
 * Returns false if the triangle is degenrate.
 * The normal will point out of the clock for clockwise ordered points
 */
function PlaneFromPoints(plane, a, b, c) {
	var d1 = [0, 0, 0];
	var d2 = [0, 0, 0];

	vec3.subtract(b, a, d1);
	vec3.subtract(c, a, d2);
	vec3.cross(d2, d1, plane);
	vec3.normalize(plane);

	if (vec3.length(plane) === 0) {
		return false;
	}

	plane[3] = vec3.dot(a, plane);

	return true;
}


/**********************************************************
 *
 * Grid subdivision
 *
 **********************************************************/

/**
 * GeneratePatchCollide
 * 
 * Creates an internal structure that will be used to perform
 * collision detection with a patch mesh.
 *
 * Points is packed as concatenated rows.
 */
function GeneratePatchCollide(width, height, points) {
	if (width <= 2 || height <= 2 || !points) {
		com.error(ERR.DROP, 'GeneratePatchFacets: bad parameters');
	}

	if (!(width & 1) || !(height & 1)) {
		com.error(ERR.DROP, 'GeneratePatchFacets: even sizes are invalid for quadratic meshes');
	}

	if (width > MAX_GRID_SIZE || height > MAX_GRID_SIZE) {
		com.error(ERR.DROP, 'GeneratePatchFacets: source is > MAX_GRID_SIZE');
	}

	// Build a grid.
	var grid = new cgrid_t();
	grid.width = width;
	grid.height = height;
	grid.wrapWidth = false;
	grid.wrapHeight = false;
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			vec3.set(points[j*width+i], grid.points[i][j]);
		}
	}

	// Subdivide the grid.
	SetGridWrapWidth(grid);
	SubdivideGridColumns(grid);
	RemoveDegenerateColumns(grid);

	TransposeGrid(grid);

	SetGridWrapWidth(grid);
	SubdivideGridColumns(grid);
	RemoveDegenerateColumns(grid);

	// We now have a grid of points exactly on the curve.
	// The aproximate surface defined by these points will be
	// collided against.
	var pc = new pcollide_t();

	QMath.ClearBounds(pc.bounds[0], pc.bounds[1]);

	for (var i = 0; i < grid.width; i++) {
		for (var j = 0; j < grid.height; j++) {
			QMath.AddPointToBounds(grid.points[i][j], pc.bounds[0], pc.bounds[1]);
		}
	}

	//c_totalPatchBlocks += (grid.width - 1) * (grid.height - 1);

	// Generate a bsp tree for the surface.
	PatchCollideFromGrid(grid, pc);

	// Expand by one unit for epsilon purposes.
	pc.bounds[0][0] -= 1;
	pc.bounds[0][1] -= 1;
	pc.bounds[0][2] -= 1;

	pc.bounds[1][0] += 1;
	pc.bounds[1][1] += 1;
	pc.bounds[1][2] += 1;

	debugPatchCollides.push(pc);

	return pc;
}

/**
 * SetGridWrapWidth
 *
 * If the left and right columns are exactly equal, set wrapWidth true
 */
function SetGridWrapWidth(grid) {
	var i, j;

	for (i = 0; i < grid.height; i++) {
		for (j = 0; j < 3; j++) {
			var d = grid.points[0][i][j] - grid.points[grid.width-1][i][j];

			if (d < -WRAP_POINT_EPSILON || d > WRAP_POINT_EPSILON) {
				break;
			}
		}

		if (j != 3) {
			break;
		}
	}

	if (i === grid.height) {
		grid.wrapWidth = true;
	} else {
		grid.wrapWidth = false;
	}
}

/** 
 * SubdivideGridColumns
 * 
 * Adds columns as necessary to the grid until
 * all the aproximating points are within SUBDIVIDE_DISTANCE
 * from the true curve
 */
function SubdivideGridColumns(grid) {
	var i, j, k;
	var prev = [0, 0, 0];
	var mid = [0, 0, 0];
	var next = [0, 0, 0];

	for (i = 0; i < grid.width - 2;) {
		// grid.points[i][x] is an interpolating control point
		// grid.points[i+1][x] is an aproximating control point
		// grid.points[i+2][x] is an interpolating control point

		//
		// First see if we can collapse the aproximating column away.
		//
		for (j = 0; j < grid.height; j++) {
			if (NeedsSubdivision(grid.points[i][j], grid.points[i+1][j], grid.points[i+2][j])) {
				break;
			}
		}

		if (j === grid.height) {
			// All of the points were close enough to the linear midpoints
			// that we can collapse the entire column away.
			for (j = 0; j < grid.height; j++) {
				// Remove the column.
				for (k = i + 2; k < grid.width; k++) {
					vec3.set(grid.points[k][j], grid.points[k-1][j]);
				}
			}

			grid.width--;

			// Go to the next curve segment.
			i++;
			continue;
		}

		//
		// We need to subdivide the curve.
		//
		for (j = 0; j < grid.height; j++) {
			// Save the control points now.
			vec3.set(grid.points[i][j], prev);
			vec3.set(grid.points[i+1][j], mid);
			vec3.set(grid.points[i+2][j], next);

			// Make room for two additional columns in the grid.
			// Columns i+1 will be replaced, column i+2 will become i+4.
			// i+1, i+2, and i+3 will be generated.
			for (k = grid.width - 1; k > i + 1; k--) {
				vec3.set(grid.points[k][j], grid.points[k+2][j]);
			}

			// Generate the subdivided points.
			Subdivide(prev, mid, next, grid.points[i+1][j], grid.points[i+2][j], grid.points[i+3][j]);
		}

		grid.width += 2;

		// The new aproximating point at i+1 may need to be removed
		// or subdivided farther, so don't advance i.
	}
}

/**
 * NeedsSubdivision
 *
 * Returns true if the given quadratic curve is not flat enough for our
 * collision detection purposes
 */
function NeedsSubdivision(a, b, c) {
	var cmid = [0, 0, 0];
	var lmid = [0, 0, 0];
	var delta = [0, 0, 0];

	// Calculate the linear midpoint.
	for (var i = 0; i < 3; i++) {
		lmid[i] = 0.5 * (a[i] + c[i]);
	}

	// Calculate the exact curve midpoint.
	for (var i = 0; i < 3; i++) {
		cmid[i] = 0.5 * (0.5 * (a[i] + b[i]) + 0.5 * (b[i] + c[i]));
	}

	// See if the curve is far enough away from the linear mid.
	vec3.subtract(cmid, lmid, delta);
	var dist = vec3.length(delta);
	
	return dist >= SUBDIVIDE_DISTANCE;
}

/**
 * Subdivide
 *
 * a, b, and c are control points.
 * The subdivided sequence will be: a, out1, out2, out3, c
 */
function Subdivide(a, b, c, out1, out2, out3) {
	for (var i = 0; i < 3; i++) {
		out1[i] = 0.5 * (a[i] + b[i]);
		out3[i] = 0.5 * (b[i] + c[i]);
		out2[i] = 0.5 * (out1[i] + out3[i]);
	}
}

/**
 * RemoveDegenerateColumns
 *
 * If there are any identical columns, remove them.
 */
function RemoveDegenerateColumns(grid) {
	var i, j, k;

	for (i = 0; i < grid.width - 1; i++) {
		for (j = 0; j < grid.height; j++) {
			if (!ComparePoints(grid.points[i][j], grid.points[i+1][j])) {
				break;
			}
		}

		if (j !== grid.height) {
			continue;  // not degenerate
		}

		for (j = 0; j < grid.height; j++) {
			// Remove the column.
			for (k = i + 2; k < grid.width; k++) {
				vec3.set(grid.points[k][j], grid.points[k-1][j]);
			}
		}

		grid.width--;

		// Check against the next column.
		i--;
	}
}

/**
 * ComparePoints
 */
var POINT_EPSILON = 0.1;

function ComparePoints(a, b) {
	var d = a[0] - b[0];
	if (d < -POINT_EPSILON || d > POINT_EPSILON) {
		return false;
	}
	d = a[1] - b[1];
	if (d < -POINT_EPSILON || d > POINT_EPSILON) {
		return false;
	}
	d = a[2] - b[2];
	if (d < -POINT_EPSILON || d > POINT_EPSILON) {
		return false;
	}
	return true;
}

/**
 * TransposeGrid
 *
 * Swaps the rows and columns in place.
 */
function TransposeGrid(grid) {
	var i, j, l;
	var temp = [0, 0, 0];
	var tempWrap = false;

	if (grid.width > grid.height) {
		for (i = 0; i < grid.height; i++) {
			for (j = i + 1; j < grid.width; j++) {
				if (j < grid.height) {
					// swap the value
					vec3.set(grid.points[i][j], temp);
					vec3.set(grid.points[j][i], grid.points[i][j]);
					vec3.set(temp, grid.points[j][i]);
				} else {
					// just copy
					vec3.set(grid.points[j][i], grid.points[i][j]);
				}
			}
		}
	} else {
		for (i = 0; i < grid.width; i++) {
			for (j = i + 1; j < grid.height; j++) {
				if (j < grid.width) {
					// swap the value
					vec3.set(grid.points[j][i], temp);
					vec3.set(grid.points[i][j], grid.points[j][i]);
					vec3.set(temp, grid.points[i][j]);
				} else {
					// just copy
					vec3.set(grid.points[i][j], grid.points[j][i]);
				}
			}
		}
	}

	l = grid.width;
	grid.width = grid.height;
	grid.height = l;

	tempWrap = grid.wrapWidth;
	grid.wrapWidth = grid.wrapHeight;
	grid.wrapHeight = tempWrap;
}

/**********************************************************
 *
 * Patch collide generation
 *
 **********************************************************/

var NORMAL_EPSILON = 0.0001;
var DIST_EPSILON   = 0.02;

/**
 * PatchCollideFromGrid
 */
function PatchCollideFromGrid(grid, pc) {
	var i, j;
	var p1, p2, p3;
	var borders = [0, 0, 0, 0];
	var noAdjust = [0, 0, 0, 0];

	var gridPlanes = new Array(MAX_GRID_SIZE);
	for (i = 0; i < MAX_GRID_SIZE; i++) {
		gridPlanes[i] = new Array(MAX_GRID_SIZE);
		for (j = 0; j < MAX_GRID_SIZE; j++) {
			gridPlanes[i][j] = new Array(2);
		}
	}

	// Find the planes for each triangle of the grid.
	for (i = 0; i < grid.width - 1; i++) {
		for (j = 0; j < grid.height - 1; j++) {
			p1 = grid.points[i][j];
			p2 = grid.points[i+1][j];
			p3 = grid.points[i+1][j+1];
			gridPlanes[i][j][0] = FindPlane(pc, p1, p2, p3);

			p1 = grid.points[i+1][j+1];
			p2 = grid.points[i][j+1];
			p3 = grid.points[i][j];
			gridPlanes[i][j][1] = FindPlane(pc, p1, p2, p3);
		}
	}

	// Create the borders for each facet.
	for (i = 0; i < grid.width - 1; i++) {
		for (j = 0; j < grid.height - 1; j++) {
			borders[EN_TOP] = -1;
			if (j > 0) {
				borders[EN_TOP] = gridPlanes[i][j-1][1];
			} else if (grid.wrapHeight) {
				borders[EN_TOP] = gridPlanes[i][grid.height-2][1];
			} 
			noAdjust[EN_TOP] = (borders[EN_TOP] == gridPlanes[i][j][0]);
			if (borders[EN_TOP] == -1 || noAdjust[EN_TOP]) {
				borders[EN_TOP] = EdgePlaneNum(pc, grid, gridPlanes, i, j, 0);
			}

			borders[EN_BOTTOM] = -1;
			if (j < grid.height - 2) {
				borders[EN_BOTTOM] = gridPlanes[i][j+1][0];
			} else if (grid.wrapHeight) {
				borders[EN_BOTTOM] = gridPlanes[i][0][0];
			}
			noAdjust[EN_BOTTOM] = (borders[EN_BOTTOM] == gridPlanes[i][j][1]);
			if (borders[EN_BOTTOM] == -1 || noAdjust[EN_BOTTOM]) {
				borders[EN_BOTTOM] = EdgePlaneNum(pc, grid, gridPlanes, i, j, 2);
			}

			borders[EN_LEFT] = -1;
			if (i > 0) {
				borders[EN_LEFT] = gridPlanes[i-1][j][0];
			} else if (grid.wrapWidth) {
				borders[EN_LEFT] = gridPlanes[grid.width-2][j][0];
			}
			noAdjust[EN_LEFT] = (borders[EN_LEFT] == gridPlanes[i][j][1]);
			if (borders[EN_LEFT] == -1 || noAdjust[EN_LEFT]) {
				borders[EN_LEFT] = EdgePlaneNum(pc, grid, gridPlanes, i, j, 3);
			}

			borders[EN_RIGHT] = -1;
			if (i < grid.width - 2) {
				borders[EN_RIGHT] = gridPlanes[i+1][j][1];
			} else if (grid.wrapWidth) {
				borders[EN_RIGHT] = gridPlanes[0][j][1];
			}
			noAdjust[EN_RIGHT] = (borders[EN_RIGHT] == gridPlanes[i][j][0]);
			if (borders[EN_RIGHT] == -1 || noAdjust[EN_RIGHT]) {
				borders[EN_RIGHT] = EdgePlaneNum(pc, grid, gridPlanes, i, j, 1);
			}

			if (pc.facets.length >= MAX_FACETS) {
				com.error(ERR.DROP, 'MAX_FACETS');
			}

			var facet = new pfacet_t();

			if (gridPlanes[i][j][0] === gridPlanes[i][j][1]) {
				if (gridPlanes[i][j][0] === -1) {
					continue;  // degenrate
				}
				facet.surfacePlane = gridPlanes[i][j][0];
				facet.numBorders = 4;
				facet.borderPlanes[0] = borders[EN_TOP];
				facet.borderNoAdjust[0] = noAdjust[EN_TOP];
				facet.borderPlanes[1] = borders[EN_RIGHT];
				facet.borderNoAdjust[1] = noAdjust[EN_RIGHT];
				facet.borderPlanes[2] = borders[EN_BOTTOM];
				facet.borderNoAdjust[2] = noAdjust[EN_BOTTOM];
				facet.borderPlanes[3] = borders[EN_LEFT];
				facet.borderNoAdjust[3] = noAdjust[EN_LEFT];
				SetBorderInward(pc, facet, grid, gridPlanes, i, j, -1);
				if (ValidateFacet(pc, facet)) {
				 	AddFacetBevels(pc, facet);
					pc.facets.push(facet);
				}
			} else {
				// two seperate triangles
				facet.surfacePlane = gridPlanes[i][j][0];
				facet.numBorders = 3;
				facet.borderPlanes[0] = borders[EN_TOP];
				facet.borderNoAdjust[0] = noAdjust[EN_TOP];
				facet.borderPlanes[1] = borders[EN_RIGHT];
				facet.borderNoAdjust[1] = noAdjust[EN_RIGHT];
				facet.borderPlanes[2] = gridPlanes[i][j][1];
				if (facet.borderPlanes[2] === -1) {
					facet.borderPlanes[2] = borders[EN_BOTTOM];
					if (facet.borderPlanes[2] === -1) {
						facet.borderPlanes[2] = EdgePlaneNum(pc, grid, gridPlanes, i, j, 4);
					}
				}
				SetBorderInward(pc, facet, grid, gridPlanes, i, j, 0);
				if (ValidateFacet(pc, facet)) {
				 	AddFacetBevels(pc, facet);
					pc.facets.push(facet);
				}

				if (pc.facets.length >= MAX_FACETS) {
					com.error(ERR.DROP, 'MAX_FACETS');
				}

				facet = facet = new pfacet_t();
				facet.surfacePlane = gridPlanes[i][j][1];
				facet.numBorders = 3;
				facet.borderPlanes[0] = borders[EN_BOTTOM];
				facet.borderNoAdjust[0] = noAdjust[EN_BOTTOM];
				facet.borderPlanes[1] = borders[EN_LEFT];
				facet.borderNoAdjust[1] = noAdjust[EN_LEFT];
				facet.borderPlanes[2] = gridPlanes[i][j][0];
				if (facet.borderPlanes[2] === -1) {
					facet.borderPlanes[2] = borders[EN_TOP];
					if ( facet.borderPlanes[2] === -1 ) {
						facet.borderPlanes[2] = EdgePlaneNum(pc, grid, gridPlanes, i, j, 5);
					}
				}
				SetBorderInward(pc, facet, grid, gridPlanes, i, j, 1);
				if (ValidateFacet(pc, facet)) {
					AddFacetBevels(pc, facet);
					pc.facets.push(facet);
				}
			}
		}
	}
}

/**
 * FindPlane
 */
function FindPlane(pc, p1, p2, p3) {
	var plane = [0, 0, 0, 0];

	if (!PlaneFromPoints(plane, p1, p2, p3)) {
		return -1;
	}

	var d;

	// See if the points are close enough to an existing plane.
	for (var i = 0; i < pc.planes.length; i++) {
		var pp = pc.planes[i];

		if (vec3.dot(plane, pp.plane) < 0) {
			continue;  // allow backwards planes?
		}

		d = vec3.dot(p1, pp.plane) - pp.plane[3];
		if (d < -PLANE_TRI_EPSILON || d > PLANE_TRI_EPSILON) {
			continue;
		}

		d = vec3.dot(p2, pp.plane) - pp.plane[3];
		if (d < -PLANE_TRI_EPSILON || d > PLANE_TRI_EPSILON) {
			continue;
		}

		d = vec3.dot(p3, pp.plane) - pp.plane[3];
		if (d < -PLANE_TRI_EPSILON || d > PLANE_TRI_EPSILON) {
			continue;
		}

		// found it
		return i;
	}

	// Add a new plane.
	if (pc.planes.length >= MAX_PATCH_PLANES) {
		com.error(ERR.DROP, 'MAX_PATCH_PLANES');
	}

	// TODO Convert to using Plane struct?
	var index = pc.planes.length;

	var pp = new pplane_t();
	Vector4Copy(plane, pp.plane);
	pp.signbits = QMath.GetPlaneSignbits(plane);
	pc.planes.push(pp);

	return index;
}

/**
 * EdgePlaneNum
 */
function EdgePlaneNum(pc, grid, gridPlanes, i, j, k) {
	var p1, p2;
	var planeNum;
	var pp;
	var up = [0, 0, 0];

	switch (k) {
		case 0:  // top border
			p1 = grid.points[i][j];
			p2 = grid.points[i+1][j];
			planeNum = GridPlane(gridPlanes, i, j, 0);
			pp = pc.planes[planeNum];
			vec3.add(p1, vec3.scale(pp.plane, 4, [0, 0, 0]), up);
			return FindPlane(pc, p1, p2, up);

		case 2:  // bottom border
			p1 = grid.points[i][j+1];
			p2 = grid.points[i+1][j+1];
			planeNum = GridPlane(gridPlanes, i, j, 1);
			pp = pc.planes[planeNum];
			vec3.add(p1, vec3.scale(pp.plane, 4, [0, 0, 0]), up);
			return FindPlane(pc, p2, p1, up);

		case 3:  // left border
			p1 = grid.points[i][j];
			p2 = grid.points[i][j+1];
			planeNum = GridPlane(gridPlanes, i, j, 1);
			pp = pc.planes[planeNum];
			vec3.add(p1, vec3.scale(pp.plane, 4, [0, 0, 0]), up);
			return FindPlane(pc, p2, p1, up);

		case 1:  // right border
			p1 = grid.points[i+1][j];
			p2 = grid.points[i+1][j+1];
			planeNum = GridPlane(gridPlanes, i, j, 0);
			pp = pc.planes[planeNum];
			vec3.add(p1, vec3.scale(pp.plane, 4, [0, 0, 0]), up);
			return FindPlane(pc, p1, p2, up);

		case 4:  // diagonal out of triangle 0
			p1 = grid.points[i+1][j+1];
			p2 = grid.points[i][j];
			planeNum = GridPlane(gridPlanes, i, j, 0);
			pp = pc.planes[planeNum];
			vec3.add(p1, vec3.scale(pp.plane, 4, [0, 0, 0]), up);
			return FindPlane(pc, p1, p2, up);

		case 5:  // diagonal out of triangle 1
			p1 = grid.points[i][j];
			p2 = grid.points[i+1][j+1];
			planeNum = GridPlane(gridPlanes, i, j, 1);
			pp = pc.planes[planeNum];
			vec3.add(p1, vec3.scale(pp.plane, 4, [0, 0, 0]), up);
			return FindPlane(pc, p1, p2, up);
	}

	com.error(ERR.DROP, 'EdgePlaneNum: bad k');
	return -1;
}

/**
 * GridPlane
 */
function GridPlane(gridPlanes, i, j, tri) {	
	var p = gridPlanes[i][j][tri];
	if (p !== -1) {
		return p;
	}

	p = gridPlanes[i][j][tri^1];
	if (p !== -1) {
		return p;
	}

	// Should never happen.
	log('WARNING: GridPlane unresolvable');
	return -1;
}

/**
 * SetBorderInward
 */
function SetBorderInward(pc, facet, grid, gridPlanes, i, j, which) {
	var points = [null, null, null, null];
	var numPoints;

	switch (which) {
		case -1:
			points[0] = grid.points[i][j];
			points[1] = grid.points[i+1][j];
			points[2] = grid.points[i+1][j+1];
			points[3] = grid.points[i][j+1];
			numPoints = 4;
			break;
		case 0:
			points[0] = grid.points[i][j];
			points[1] = grid.points[i+1][j];
			points[2] = grid.points[i+1][j+1];
			numPoints = 3;
			break;
		case 1:
			points[0] = grid.points[i+1][j+1];
			points[1] = grid.points[i][j+1];
			points[2] = grid.points[i][j];
			numPoints = 3;
			break;
		default:
			com.error(ERR.FATAL, 'SetBorderInward: bad parameter');
			numPoints = 0;
			break;
	}

	for (var k = 0; k < facet.numBorders; k++) {
		var front = 0;
		var back = 0;

		for (var l = 0; l < numPoints; l++) {
			var side = PointOnPlaneSide(pc, points[l], facet.borderPlanes[k]);

			if (side === SIDE_FRONT) {
				front++;
			} else if (side === SIDE_BACK) {
				back++;
			}
		}

		if (front && !back) {
			facet.borderInward[k] = true;
		} else if (back && !front) {
			facet.borderInward[k] = false;
		} else if (!front && !back) {
			// Flat side border.
			facet.borderPlanes[k] = -1;
		} else {
			// Bisecting side border.
			log('WARNING: SetBorderInward: mixed plane sides');
			facet.borderInward[k] = false;
		}
	}
}

/**
 * PointOnPlaneSide
 */
function PointOnPlaneSide(pc, p, planeNum) {
	if (planeNum === -1) {
		return SIDE_ON;
	}

	var pp = pc.planes[planeNum];
	var d = vec3.dot(p, pp.plane) - pp.plane[3];

	if (d > PLANE_TRI_EPSILON) {
		return SIDE_FRONT;
	}

	if (d < -PLANE_TRI_EPSILON) {
		return SIDE_BACK;
	}

	return SIDE_ON;
}

/**
 * ValidateFacet
 * 
 * If the facet isn't bounded by its borders, we screwed up.
 */
function ValidateFacet(pc, facet) {
	var j;
	var plane = [0, 0, 0, 0];
	var bounds = [
		[0, 0, 0],
		[0, 0, 0]
	];

	if (facet.surfacePlane === -1) {
		return false;
	}

	Vector4Copy(pc.planes[facet.surfacePlane].plane, plane);
	var w = BaseWindingForPlane(plane, plane[3]);
	for (j = 0; j < facet.numBorders; j++) {
		if (facet.borderPlanes[j] === -1) {
			return false;
		}

		Vector4Copy(pc.planes[facet.borderPlanes[j]].plane, plane);
		if (!facet.borderInward[j]) {
			vec3.subtract([0, 0, 0], plane, plane);
			plane[3] = -plane[3];
		}

		if (!ChopWindingInPlace(w, plane, plane[3], 0.1)) {
			return false;  // winding was completely chopped away
		}
	}

	// See if the facet is unreasonably large.
	WindingBounds(w, bounds[0], bounds[1]);
	
	for (j = 0; j < 3; j++) {
		if (bounds[1][j] - bounds[0][j] > MAX_MAP_BOUNDS) {
			return false;		// we must be missing a plane
		}
		if (bounds[0][j] >= MAX_MAP_BOUNDS) {
			return false;
		}
		if (bounds[1][j] <= -MAX_MAP_BOUNDS) {
			return false;
		}
	}

	return true;  // winding is fine
}

/**
 * AddFacetBevels
 */
function AddFacetBevels(pc, facet) {
	var i, j, k, l;
	var axis, dir, order;
	var flipped = [false];  // Lame, but we can't pass primitive by reference
	var plane = [0, 0, 0, 0];
	var newplane = [0, 0, 0, 0];
	var mins = [0, 0, 0];
	var maxs = [0, 0, 0];
	var vec = [0, 0, 0];
	var vec2 = [0, 0, 0];

	Vector4Copy(pc.planes[facet.surfacePlane].plane, plane);

	var w = BaseWindingForPlane(plane, plane[3]);
	for (j = 0; j < facet.numBorders; j++) {
		if (facet.borderPlanes[j] === facet.surfacePlane) {
			continue;
		}

		Vector4Copy(pc.planes[facet.borderPlanes[j]].plane, plane );
		if (!facet.borderInward[j]) {
			vec3.subtract([0, 0, 0], plane, plane);
			plane[3] = -plane[3];
		}
		
		if (!ChopWindingInPlace(w, plane, plane[3], 0.1)) {
			return;
		}
	}

	WindingBounds(w, mins, maxs);

	//
	// Add the axial planes.
	//
	order = 0;
	for (axis = 0; axis < 3; axis++) {
		for (dir = -1; dir <= 1; dir += 2, order++) {
			plane[0] = plane[1] = plane[2] = 0;
			plane[axis] = dir;

			if (dir == 1) {
				plane[3] = maxs[axis];
			} else {
				plane[3] = -mins[axis];
			}

			// If it's the surface plane.
			if (PlaneEqual(pc.planes[facet.surfacePlane], plane, flipped)) {
				continue;
			}

			// See if the plane is already present.
			for (i = 0; i < facet.numBorders; i++) {
				if (PlaneEqual(pc.planes[facet.borderPlanes[i]], plane, flipped)) {
					break;
				}
			}

			if (i === facet.numBorders) {
				if (facet.numBorders > 4 + 6 + 16) {
					log('ERROR: too many bevels');
				}

				facet.borderPlanes[facet.numBorders] = FindPlane2(pc, plane, flipped);
				facet.borderNoAdjust[facet.numBorders] = 0;
				facet.borderInward[facet.numBorders] = flipped[0];
				facet.numBorders++;
			}
		}
	}

	//
	// Add the edge bevels.
	//

	// Test the non-axial plane edges.
	for (j = 0; j < w.p.length; j++) {
		k = (j+1)%w.p.length;
		vec3.subtract(w.p[j], w.p[k], vec);

		// If it's a degenerate edge.
		vec3.normalize(vec);
		if (vec3.length(vec) < 0.5) {
			continue;
		}
		SnapVector(vec);

		for (k = 0; k < 3; k++) {
			if (vec[k] == -1 || vec[k] == 1) {
				break;  // axial
			}
		}
		if (k < 3) {
			continue;  // only test non-axial edges
		}

		// Try the six possible slanted axials from this edge.
		for (axis = 0; axis < 3; axis++) {
			for (dir = -1; dir <= 1; dir += 2) {
				// Construct a plane.
				vec2[0] = vec2[1] = vec2[2] = 0;
				vec2[axis] = dir;

				vec3.cross(vec, vec2, plane);
				vec3.normalize(plane);

				if (vec3.length(plane) < 0.5) {
					continue;
				}

				plane[3] = vec3.dot(w.p[j], plane);

				// If all the points of the facet winding are
				// behind this plane, it is a proper edge bevel
				for (l = 0; l < w.p.length; l++) {
					var d = vec3.dot(w.p[l], plane) - plane[3];
					if (d > 0.1) {
						break;  // point in front
					}
				}
				if (l < w.p.length) {
					continue;
				}

				// If it's the surface plane.
				if (PlaneEqual(pc.planes[facet.surfacePlane], plane, flipped)) {
					continue;
				}

				// See if the plane is already present.
				for (i = 0; i < facet.numBorders; i++) {
					if (PlaneEqual(pc.planes[facet.borderPlanes[i]], plane, flipped)) {
						break;
					}
				}
				if (i === facet.numBorders) {
					if (facet.numBorders > 4 + 6 + 16) {
						log('ERROR: too many bevels');
					}
					facet.borderPlanes[facet.numBorders] = FindPlane2(pc, plane, flipped);

					for (k = 0; k < facet.numBorders; k++) {
						if (facet.borderPlanes[facet.numBorders] == facet.borderPlanes[k]) {
							log('WARNING: bevel plane already used');
						}
					}

					facet.borderNoAdjust[facet.numBorders] = 0;
					facet.borderInward[facet.numBorders] = flipped[0];

					//
					var w2 = w.clone();

					Vector4Copy(pc.planes[facet.borderPlanes[facet.numBorders]].plane, newplane);
					if (!facet.borderInward[facet.numBorders]) {
						vec3.negate(newplane);
						newplane[3] = -newplane[3];
					}

					if (!ChopWindingInPlace(w2, newplane, newplane[3], 0.1)) {
						log('WARNING: AddFacetBevels... invalid bevel');
						continue;
					}

					facet.numBorders++;
				}
			}
		}
	}

	//
	// Add opposite plane.
	//
	facet.borderPlanes[facet.numBorders] = facet.surfacePlane;
	facet.borderNoAdjust[facet.numBorders] = 0;
	facet.borderInward[facet.numBorders] = true;
	facet.numBorders++;
}

/**
 * PlaneEqual
 */
function PlaneEqual(pp, plane, flipped) {
	if (Math.abs(pp.plane[0] - plane[0]) < NORMAL_EPSILON &&
		Math.abs(pp.plane[1] - plane[1]) < NORMAL_EPSILON &&
		Math.abs(pp.plane[2] - plane[2]) < NORMAL_EPSILON &&
		Math.abs(pp.plane[3] - plane[3]) < DIST_EPSILON) {
		flipped[0] = false;
		return true;
	}

	var invplane = [0, 0, 0, 0];
	vec3.negate(plane, invplane);
	invplane[3] = -plane[3];

	if (Math.abs(pp.plane[0] - invplane[0]) < NORMAL_EPSILON &&
		Math.abs(pp.plane[1] - invplane[1]) < NORMAL_EPSILON &&
		Math.abs(pp.plane[2] - invplane[2]) < NORMAL_EPSILON &&
		Math.abs(pp.plane[3] - invplane[3]) < DIST_EPSILON) {
		flipped[0] = true;
		return true;
	}

	return false;
}

/**
 * SnapVector
 */
function SnapVector(normal) {
	for (var i = 0; i < 3; i++) {
		if (Math.abs(normal[i] - 1) < NORMAL_EPSILON) {
			normal[0] = normal[1] = normal[2] = 0;
			normal[i] = 1;
			break;
		}
		if (Math.abs(normal[i] - -1) < NORMAL_EPSILON) {
			normal[0] = normal[1] = normal[2] = 0;
			normal[i] = -1;
			break;
		}
	}
}

/**
 * FindPlane2
 */
function FindPlane2(pc, plane, flipped) {
	// See if the points are close enough to an existing plane.
	for (var i = 0; i < pc.planes.length; i++) {
		if (PlaneEqual(pc.planes[i], plane, flipped)) {
			return i;
		}
	}

	// Add a new plane.
	if (pc.planes.length === MAX_PATCH_PLANES) {
		com.error(ERR.DROP, 'MAX_PATCH_PLANES');
	}

	var index = pc.planes.length;

	var pp = new pplane_t();
	Vector4Copy(plane, pp.plane);
	pp.signbits = QMath.GetPlaneSignbits(plane);
	pc.planes.push(pp);

	flipped[0] = false;

	return index;
}

/**********************************************************
 *
 * Trace testing
 *
 **********************************************************/

/**
 * TraceThroughPatchCollide
 */
function TraceThroughPatchCollide(tw, pc) {
	var i, j, hitnum, offset, t, pp;
	var cw = new FacetCheckWork();
	var plane = [0, 0, 0, 0];
	var bestplane = [0, 0, 0, 0];
	var startp = [0, 0, 0];
	var endp = [0, 0, 0];

	if (!QMath.BoundsIntersect(tw.bounds[0], tw.bounds[1], pc.bounds[0], pc.bounds[1], SURFACE_CLIP_EPSILON)) {
		return;
	}

	if (tw.isPoint) {
		TracePointThroughPatchCollide(tw, pc);
		return;
	}

	for (var i = 0; i < pc.facets.length; i++) {
		var facet = pc.facets[i];
		
		cw.enterFrac = -1.0;
		cw.leaveFrac = 1.0;
		cw.hit = false;

		hitnum = -1;

		//
		pp = pc.planes[facet.surfacePlane];
		vec3.set(pp.plane, plane);
		plane[3] = pp.plane[3];
		if (tw.sphere.use) {
			// Adjust the plane distance apropriately for radius.
			plane[3] += tw.sphere.radius;

			// Find the closest point on the capsule to the plane.
			t = vec3.dot(plane, tw.sphere.offset);
			if (t > 0) {
				vec3.subtract(tw.start, tw.sphere.offset, startp);
				vec3.subtract(tw.end, tw.sphere.offset, endp);
			} else {
				vec3.add(tw.start, tw.sphere.offset, startp);
				vec3.add(tw.end, tw.sphere.offset, endp);
			}
		} else {
			offset = vec3.dot(tw.offsets[pp.signbits], plane);
			plane[3] -= offset;
			vec3.set(tw.start, startp);
			vec3.set(tw.end, endp);
		}

		if (!CheckFacetPlane(plane, startp, endp, cw)) {
			continue;
		}
		if (cw.hit) {
			Vector4Copy(plane, bestplane);
		}

		for (j = 0; j < facet.numBorders; j++) {
			pp = pc.planes[facet.borderPlanes[j]];
			if (facet.borderInward[j]) {
				vec3.negate(pp.plane, plane);
				plane[3] = -pp.plane[3];
			} else {
				vec3.set(pp.plane, plane);
				plane[3] = pp.plane[3];
			}

			if (tw.sphere.use) {
				// Adjust the plane distance apropriately for radius.
				plane[3] += tw.sphere.radius;

				// Find the closest point on the capsule to the plane.
				t = vec3.dot(plane, tw.sphere.offset);
				if (t > 0) {
					vec3.subtract(tw.start, tw.sphere.offset, startp);
					vec3.subtract(tw.end, tw.sphere.offset, endp);
				} else {
					vec3.add(tw.start, tw.sphere.offset, startp);
					vec3.add(tw.end, tw.sphere.offset, endp);
				}
			} else {
				// NOTE: this works even though the plane might be flipped because the bbox is centered
				offset = vec3.dot(tw.offsets[pp.signbits], plane);
				plane[3] += Math.abs(offset);
				vec3.set(tw.start, startp);
				vec3.set(tw.end, endp);
			}

			if (!CheckFacetPlane(plane, startp, endp, cw)) {
				break;
			}
			if (cw.hit) {
				hitnum = j;
				Vector4Copy(plane, bestplane);
			}
		}
		if (j < facet.numBorders) {
			continue;
		}
		
		// Never clip against the back side.
		if (hitnum === facet.numBorders - 1) {
			continue;
		}

		if (cw.enterFrac < cw.leaveFrac && cw.enterFrac >= 0) {
			if (cw.enterFrac < tw.trace.fraction) {
				if (cw.enterFrac < 0) {
					cw.enterFrac = 0;
				}

				tw.trace.fraction = cw.enterFrac;
				vec3.set(bestplane, tw.trace.plane.normal);
				tw.trace.plane.dist = bestplane[3];
			}
		}
	}
}

/**
 * TracePointThroughPatchCollide
 *
 * Special case for point traces because the patch collide "brushes" have no volume
 */
function TracePointThroughPatchCollide(tw, pc) {
	var i, j, k;
	var frontFacing = new Array(MAX_PATCH_PLANES);
	var intersection = new Array(MAX_PATCH_PLANES);
	var intersect;
	var offset;
	var d1, d2;

	if (!tw.isPoint ) {
		return;
	}

	// Determine the trace's relationship to all planes.
	for (i = 0; i < pc.planes.length; i++) {
		var pp = pc.planes[i];

		offset = vec3.dot(tw.offsets[pp.signbits], pp.plane);
		d1 = vec3.dot(tw.start, pp.plane) - pp.plane[3] + offset;
		d2 = vec3.dot(tw.end, pp.plane) - pp.plane[3] + offset;

		if (d1 <= 0) {
			frontFacing[i] = false;
		} else {
			frontFacing[i] = true;
		}
		if (d1 === d2) {
			intersection[i] = 99999;
		} else {
			intersection[i] = d1 / (d1 - d2);
			if (intersection[i] <= 0) {
				intersection[i] = 99999;
			}
		}
	}

	// See if any of the surface planes are intersected.
	for (i = 0; i < pc.facets.length; i++) {
		var facet = pc.facets[i];

		if (!frontFacing[facet.surfacePlane]) {
			continue;
		}

		intersect = intersection[facet.surfacePlane];

		if (intersect < 0) {
			continue;  // surface is behind the starting point
		}
		if (intersect > tw.trace.fraction) {
			continue;  // already hit something closer
		}

		for (j = 0; j < facet.numBorders; j++) {
			k = facet.borderPlanes[j];
			if (frontFacing[k] ^ facet.borderInward[j]) {
				if (intersection[k] > intersect) {
					break;
				}
			} else {
				if (intersection[k] < intersect) {
					break;
				}
			}
		}
		if (j === facet.numBorders) {
			// We hit this facet
			var pp = pc.planes[facet.surfacePlane];

			// Calculate intersection with a slight pushoff.
			offset = vec3.dot(tw.offsets[pp.signbits], pp.plane);
			d1 = vec3.dot(tw.start, pp.plane) - pp.plane[3] + offset;
			d2 = vec3.dot(tw.end, pp.plane) - pp.plane[3] + offset;
			tw.trace.fraction = (d1 - SURFACE_CLIP_EPSILON) / (d1 - d2);

			if (tw.trace.fraction < 0) {
				tw.trace.fraction = 0;
			}

			vec3.set(pp.plane, tw.trace.plane.normal);
			tw.trace.plane.dist = pp.plane[3];
		}
	}
}

/**
 * CheckFacetPlane
 */
var FacetCheckWork = function() {
	this.enterFrac = 0;
	this.leaveFrac = 0;
	this.hit = false;
};

function CheckFacetPlane(plane, start, end, cw) {
	var f;
	var d1 = vec3.dot(start, plane) - plane[3];
	var d2 = vec3.dot(end, plane) - plane[3];

	cw.hit = false;

	// If completely in front of face, no intersection with the entire facet.
	if (d1 > 0 && (d2 >= SURFACE_CLIP_EPSILON || d2 >= d1)) {
		return false;
	}

	// If it doesn't cross the plane, the plane isn't relevent.
	if (d1 <= 0 && d2 <= 0) {
		return true;
	}

	// Crosses face.
	if (d1 > d2) {  // enter
		f = (d1 - SURFACE_CLIP_EPSILON) / (d1 - d2);
		if (f < 0) {
			f = 0;
		}
		// Always favor previous plane hits and thus also the surface plane hit.
		if (f > cw.enterFrac) {
			cw.enterFrac = f;
			cw.hit = true;
		}
	} else {  // leave
		f = (d1 + SURFACE_CLIP_EPSILON) / (d1 - d2);
		if (f > 1) {
			f = 1;
		}
		if (f < cw.leaveFrac) {
			cw.leaveFrac = f;
		}
	}

	return true;
}


// /*
// =======================================================================

// POSITION TEST

// =======================================================================
// */

// /*
// ====================
// CM_PositionTestInPatchCollide
// ====================
// */
// qboolean CM_PositionTestInPatchCollide( traceWork_t *tw, const struct patchCollide_s *pc ) {
// 	int i, j;
// 	float offset, t;
// 	patchPlane_t *planes;
// 	facet_t	*facet;
// 	float plane[4];
// 	vec3_t startp;

// 	if (tw.isPoint) {
// 		return false;
// 	}
// 	//
// 	facet = pc.facets;
// 	for ( i = 0 ; i < pc.numFacets ; i++, facet++ ) {
// 		planes = &pc.planes[ facet.surfacePlane ];
// 		VectorCopy(planes.plane, plane);
// 		plane[3] = planes.plane[3];
// 		if ( tw.sphere.use ) {
// 			// adjust the plane distance apropriately for radius
// 			plane[3] += tw.sphere.radius;

// 			// find the closest point on the capsule to the plane
// 			t = DotProduct( plane, tw.sphere.offset );
// 			if ( t > 0 ) {
// 				VectorSubtract( tw.start, tw.sphere.offset, startp );
// 			}
// 			else {
// 				VectorAdd( tw.start, tw.sphere.offset, startp );
// 			}
// 		}
// 		else {
// 			offset = DotProduct( tw.offsets[ planes.signbits ], plane);
// 			plane[3] -= offset;
// 			VectorCopy( tw.start, startp );
// 		}

// 		if ( DotProduct( plane, startp ) - plane[3] > 0.0f ) {
// 			continue;
// 		}

// 		for ( j = 0; j < facet.numBorders; j++ ) {
// 			planes = &pc.planes[ facet.borderPlanes[j] ];
// 			if (facet.borderInward[j]) {
// 				VectorNegate(planes.plane, plane);
// 				plane[3] = -planes.plane[3];
// 			}
// 			else {
// 				VectorCopy(planes.plane, plane);
// 				plane[3] = planes.plane[3];
// 			}
// 			if ( tw.sphere.use ) {
// 				// adjust the plane distance apropriately for radius
// 				plane[3] += tw.sphere.radius;

// 				// find the closest point on the capsule to the plane
// 				t = DotProduct( plane, tw.sphere.offset );
// 				if ( t > 0.0f ) {
// 					VectorSubtract( tw.start, tw.sphere.offset, startp );
// 				}
// 				else {
// 					VectorAdd( tw.start, tw.sphere.offset, startp );
// 				}
// 			}
// 			else {
// 				// NOTE: this works even though the plane might be flipped because the bbox is centered
// 				offset = DotProduct( tw.offsets[ planes.signbits ], plane);
// 				plane[3] += fabs(offset);
// 				VectorCopy( tw.start, startp );
// 			}

// 			if ( DotProduct( plane, startp ) - plane[3] > 0.0f ) {
// 				break;
// 			}
// 		}
// 		if (j < facet.numBorders) {
// 			continue;
// 		}
// 		// inside this patch facet
// 		return true;
// 	}
// 	return false;
// }

function EmitCollisionSurfaces(tessFn) {
	var plane = [0, 0, 0, 0];
	var mins = [-15, -15, -28];
	var maxs = [15, 15, 28];
	var v1 = [0, 0, 0];
	var v2 = [0, 0, 0];
	var debugSize = 2;

	for (var pcnum = 0; pcnum < debugPatchCollides.length; pcnum++) {
		var pc = debugPatchCollides[pcnum];

		for (var i = 0; i < pc.facets.length; i++) {
			var facet = pc.facets[i];

			for (var k = 0; k < facet.numBorders + 1; k++) {
				var planenum, inward;
				if (k < facet.numBorders) {
					planenum = facet.borderPlanes[k];
					inward = facet.borderInward[k];
				} else {
					planenum = facet.surfacePlane;
					inward = false;
				}

				Vector4Copy(pc.planes[planenum].plane, plane);
				if (inward) {
					vec3.subtract([0, 0, 0], plane, plane);
					plane[3] = -plane[3];
				}
				plane[3] += debugSize;

				for (n = 0; n < 3; n++) {
					if (plane[n] > 0) {
						v1[n] = maxs[n];
					} else {
						v1[n] = mins[n];
					}
				}
				vec3.negate(plane, v2);
				plane[3] += Math.abs(vec3.dot(v1, v2));

				var w = BaseWindingForPlane(plane, plane[3]);

				for (var j = 0; j < facet.numBorders + 1; j++) {
					var curplanenum, curinward;
					if (j < facet.numBorders) {
						curplanenum = facet.borderPlanes[j];
						curinward = facet.borderInward[j];
					} else {
						curplanenum = facet.surfacePlane;
						curinward = false;
					}

					if (curplanenum === planenum) {
						continue;
					}

					Vector4Copy(pc.planes[curplanenum].plane, plane);
					if (!curinward) {
						vec3.subtract([0, 0, 0], plane, plane);
						plane[3] = -plane[3];
					}
					plane[3] -= debugSize;

					for (var n = 0; n < 3; n++) {
						if (plane[n] > 0) {
							v1[n] = maxs[n];
						} else {
							v1[n] = mins[n];
						}
					}
					vec3.negate(plane, v2);
					plane[3] -= Math.abs(vec3.dot(v1, v2));

					if (!ChopWindingInPlace(w, plane, plane[3], 0.1)) {
						//log('winding chopped away by border planes', j, facet.numBorders + 1);
						break;
					}
				}

				if (j === facet.numBorders + 1) {
					tessFn(w.p);
				}
			}
		}
	}
}
