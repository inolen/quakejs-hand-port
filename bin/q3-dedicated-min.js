
/*global vec3: true, mat4: true */
define('common/qmath', [], function () {

var vec3_origin = [0, 0, 0];

var bytedirs = [
	[-0.525731, 0.000000, 0.850651], [-0.442863, 0.238856, 0.864188], 
	[-0.295242, 0.000000, 0.955423], [-0.309017, 0.500000, 0.809017], 
	[-0.162460, 0.262866, 0.951056], [0.000000, 0.000000, 1.000000], 
	[0.000000, 0.850651, 0.525731], [-0.147621, 0.716567, 0.681718], 
	[0.147621, 0.716567, 0.681718], [0.000000, 0.525731, 0.850651], 
	[0.309017, 0.500000, 0.809017], [0.525731, 0.000000, 0.850651], 
	[0.295242, 0.000000, 0.955423], [0.442863, 0.238856, 0.864188], 
	[0.162460, 0.262866, 0.951056], [-0.681718, 0.147621, 0.716567], 
	[-0.809017, 0.309017, 0.500000],[-0.587785, 0.425325, 0.688191], 
	[-0.850651, 0.525731, 0.000000],[-0.864188, 0.442863, 0.238856], 
	[-0.716567, 0.681718, 0.147621],[-0.688191, 0.587785, 0.425325], 
	[-0.500000, 0.809017, 0.309017], [-0.238856, 0.864188, 0.442863], 
	[-0.425325, 0.688191, 0.587785], [-0.716567, 0.681718, -0.147621], 
	[-0.500000, 0.809017, -0.309017], [-0.525731, 0.850651, 0.000000], 
	[0.000000, 0.850651, -0.525731], [-0.238856, 0.864188, -0.442863], 
	[0.000000, 0.955423, -0.295242], [-0.262866, 0.951056, -0.162460], 
	[0.000000, 1.000000, 0.000000], [0.000000, 0.955423, 0.295242], 
	[-0.262866, 0.951056, 0.162460], [0.238856, 0.864188, 0.442863], 
	[0.262866, 0.951056, 0.162460], [0.500000, 0.809017, 0.309017], 
	[0.238856, 0.864188, -0.442863],[0.262866, 0.951056, -0.162460], 
	[0.500000, 0.809017, -0.309017],[0.850651, 0.525731, 0.000000], 
	[0.716567, 0.681718, 0.147621], [0.716567, 0.681718, -0.147621], 
	[0.525731, 0.850651, 0.000000], [0.425325, 0.688191, 0.587785], 
	[0.864188, 0.442863, 0.238856], [0.688191, 0.587785, 0.425325], 
	[0.809017, 0.309017, 0.500000], [0.681718, 0.147621, 0.716567], 
	[0.587785, 0.425325, 0.688191], [0.955423, 0.295242, 0.000000], 
	[1.000000, 0.000000, 0.000000], [0.951056, 0.162460, 0.262866], 
	[0.850651, -0.525731, 0.000000],[0.955423, -0.295242, 0.000000], 
	[0.864188, -0.442863, 0.238856], [0.951056, -0.162460, 0.262866], 
	[0.809017, -0.309017, 0.500000], [0.681718, -0.147621, 0.716567], 
	[0.850651, 0.000000, 0.525731], [0.864188, 0.442863, -0.238856], 
	[0.809017, 0.309017, -0.500000], [0.951056, 0.162460, -0.262866], 
	[0.525731, 0.000000, -0.850651], [0.681718, 0.147621, -0.716567], 
	[0.681718, -0.147621, -0.716567],[0.850651, 0.000000, -0.525731], 
	[0.809017, -0.309017, -0.500000], [0.864188, -0.442863, -0.238856], 
	[0.951056, -0.162460, -0.262866], [0.147621, 0.716567, -0.681718], 
	[0.309017, 0.500000, -0.809017], [0.425325, 0.688191, -0.587785], 
	[0.442863, 0.238856, -0.864188], [0.587785, 0.425325, -0.688191], 
	[0.688191, 0.587785, -0.425325], [-0.147621, 0.716567, -0.681718], 
	[-0.309017, 0.500000, -0.809017], [0.000000, 0.525731, -0.850651], 
	[-0.525731, 0.000000, -0.850651], [-0.442863, 0.238856, -0.864188], 
	[-0.295242, 0.000000, -0.955423], [-0.162460, 0.262866, -0.951056], 
	[0.000000, 0.000000, -1.000000], [0.295242, 0.000000, -0.955423], 
	[0.162460, 0.262866, -0.951056], [-0.442863, -0.238856, -0.864188], 
	[-0.309017, -0.500000, -0.809017], [-0.162460, -0.262866, -0.951056], 
	[0.000000, -0.850651, -0.525731], [-0.147621, -0.716567, -0.681718], 
	[0.147621, -0.716567, -0.681718], [0.000000, -0.525731, -0.850651], 
	[0.309017, -0.500000, -0.809017], [0.442863, -0.238856, -0.864188], 
	[0.162460, -0.262866, -0.951056], [0.238856, -0.864188, -0.442863], 
	[0.500000, -0.809017, -0.309017], [0.425325, -0.688191, -0.587785], 
	[0.716567, -0.681718, -0.147621], [0.688191, -0.587785, -0.425325], 
	[0.587785, -0.425325, -0.688191], [0.000000, -0.955423, -0.295242], 
	[0.000000, -1.000000, 0.000000], [0.262866, -0.951056, -0.162460], 
	[0.000000, -0.850651, 0.525731], [0.000000, -0.955423, 0.295242], 
	[0.238856, -0.864188, 0.442863], [0.262866, -0.951056, 0.162460], 
	[0.500000, -0.809017, 0.309017], [0.716567, -0.681718, 0.147621], 
	[0.525731, -0.850651, 0.000000], [-0.238856, -0.864188, -0.442863], 
	[-0.500000, -0.809017, -0.309017], [-0.262866, -0.951056, -0.162460], 
	[-0.850651, -0.525731, 0.000000], [-0.716567, -0.681718, -0.147621], 
	[-0.716567, -0.681718, 0.147621], [-0.525731, -0.850651, 0.000000], 
	[-0.500000, -0.809017, 0.309017], [-0.238856, -0.864188, 0.442863], 
	[-0.262866, -0.951056, 0.162460], [-0.864188, -0.442863, 0.238856], 
	[-0.809017, -0.309017, 0.500000], [-0.688191, -0.587785, 0.425325], 
	[-0.681718, -0.147621, 0.716567], [-0.442863, -0.238856, 0.864188], 
	[-0.587785, -0.425325, 0.688191], [-0.309017, -0.500000, 0.809017], 
	[-0.147621, -0.716567, 0.681718], [-0.425325, -0.688191, 0.587785], 
	[-0.162460, -0.262866, 0.951056], [0.442863, -0.238856, 0.864188], 
	[0.162460, -0.262866, 0.951056], [0.309017, -0.500000, 0.809017], 
	[0.147621, -0.716567, 0.681718], [0.000000, -0.525731, 0.850651], 
	[0.425325, -0.688191, 0.587785], [0.587785, -0.425325, 0.688191], 
	[0.688191, -0.587785, 0.425325], [-0.955423, 0.295242, 0.000000], 
	[-0.951056, 0.162460, 0.262866], [-1.000000, 0.000000, 0.000000], 
	[-0.850651, 0.000000, 0.525731], [-0.955423, -0.295242, 0.000000], 
	[-0.951056, -0.162460, 0.262866], [-0.864188, 0.442863, -0.238856], 
	[-0.951056, 0.162460, -0.262866], [-0.809017, 0.309017, -0.500000], 
	[-0.864188, -0.442863, -0.238856], [-0.951056, -0.162460, -0.262866], 
	[-0.809017, -0.309017, -0.500000], [-0.681718, 0.147621, -0.716567], 
	[-0.681718, -0.147621, -0.716567], [-0.850651, 0.000000, -0.525731], 
	[-0.688191, 0.587785, -0.425325], [-0.587785, 0.425325, -0.688191], 
	[-0.425325, 0.688191, -0.587785], [-0.425325, -0.688191, -0.587785], 
	[-0.587785, -0.425325, -0.688191], [-0.688191, -0.587785, -0.425325]
];

function DirToByte(dir) {
	if (!dir) {
		return 0;
	}

	var best = 0;
	var bestd = 0;
	var d;
	for (var i = 0, length = bytedirs.length; i < length; i++) {
		d = vec3.dot(dir, bytedirs[i]);
		if (d > bestd) {
			bestd = d;
			best = i;
		}
	}

	return best;
}

function ByteToDir(b, dir) {
	if (b < 0 || b >= bytedirs.length) {
		vec3.set(dir, [0, 0, 0]);
		return;
	}
	vec3.set(bytedirs[b], dir);
}

function ClampChar(i) {
	if (i < -128) {
		return -128;
	}
	if (i > 127) {
		return 127;
	}
	return i;
}

function crandom() {
	return 2.0 * (Math.random() - 0.5);
}

/**
 * PerpindicularVector
 */
function PerpendicularVector(src, dst) {
	// Find the smallest magnitude axially aligned vector.
	var i, pos;
	var minelem = 1;
	for(var i = 0, pos = 0; i < 3; i++) {
		if (Math.abs(src[i]) < minelem) {
			pos = i;
			minelem = Math.abs(src[i]);
		}
	}
	var tempvec = [0, 0, 0];
	tempvec[pos] = 1;

	// Project the point onto the plane defined by src.
	ProjectPointOnPlane(tempvec, src, dst);

	// Normalize the result.
	// vec3.normalize(dst);
}


/**
 * Angle consts
 */
var PITCH = 0; // up / down
var YAW   = 1; // left / right
var ROLL  = 2; // fall over

/**
 * AngleSubtract
 *
 * Always returns a value from -180 to 180
 */
function AngleSubtract(a1, a2) {
	var a = a1 - a2;
	while (a > 180) {
		a -= 360;
	}
	while (a < -180) {
		a += 360;
	}
	return a;
}

/**
 * AnglesSubstract
 */
function AnglesSubtract(v1, v2, v3) {
	v3[0] = AngleSubtract(v1[0], v2[0]);
	v3[1] = AngleSubtract(v1[1], v2[1]);
	v3[2] = AngleSubtract(v1[2], v2[2]);
}

/**
 * LerpAngle
 */
function LerpAngle(from, to, frac) {
	if (to - from > 180) {
		to -= 360;
	}
	if (to - from < -180) {
		to += 360;
	}

	return from + frac * (to - from);
}

/**
 * AngleMod
 */
function AngleMod(a) {
	a = (360.0/65536) * (parseInt((a*(65536/360.0)), 10) & 65535);
	return a;
}

/**
 * AnglesToVectors
 */
function AnglesToVectors(angles, forward, right, up) {
	var angle;
	var sr, sp, sy, cr, cp, cy;

	angle = angles[YAW] * (Math.PI*2 / 360);
	sy = Math.sin(angle);
	cy = Math.cos(angle);
	angle = angles[PITCH] * (Math.PI*2 / 360);
	sp = Math.sin(angle);
	cp = Math.cos(angle);
	angle = angles[ROLL] * (Math.PI*2 / 360);
	sr = Math.sin(angle);
	cr = Math.cos(angle);

	if (forward) {
		forward[0] = cp*cy;
		forward[1] = cp*sy;
		forward[2] = -sp;
	}

	if (right) {
		right[0] = (-1*sr*sp*cy+-1*cr*-sy);
		right[1] = (-1*sr*sp*sy+-1*cr*cy);
		right[2] = -1*sr*cp;
	}

	if (up) {
		up[0] = (cr*sp*cy+-sr*-sy);
		up[1] = (cr*sp*sy+-sr*cy);
		up[2] = cr*cp;
	}
}

/**
 * AngleToShort
 */
function AngleToShort(x) {
	return (((x)*65536/360) & 65535);
};

/**
 * ShortToAngle
 */
function ShortToAngle(x) {
	return ((x)*(360.0/65536));
};

/**
 * AxisClear
 */
function AxisClear(axis) {
	axis[0][0] = 1;
	axis[0][1] = 0;
	axis[0][2] = 0;
	axis[1][0] = 0;
	axis[1][1] = 1;
	axis[1][2] = 0;
	axis[2][0] = 0;
	axis[2][1] = 0;
	axis[2][2] = 1;
}

/**
 * AnglesToAxis
 */
function AnglesToAxis(angles, axis) {
	AnglesToVectors(angles, axis[0], axis[1], axis[2]);
	// angle vectors returns "right" instead of "y axis"
	vec3.negate(axis[1]);
}

/**
 * AxisMultiply
 *
 * TODO Perhaps the functions using this should change the way they store
 * there axis, so we can re-use the mat3 lib calls.
 */
function AxisMultiply(in1, in2, out) {
	out[0][0] = in1[0][0] * in2[0][0] + in1[0][1] * in2[1][0] + in1[0][2] * in2[2][0];
	out[0][1] = in1[0][0] * in2[0][1] + in1[0][1] * in2[1][1] + in1[0][2] * in2[2][1];
	out[0][2] = in1[0][0] * in2[0][2] + in1[0][1] * in2[1][2] + in1[0][2] * in2[2][2];

	out[1][0] = in1[1][0] * in2[0][0] + in1[1][1] * in2[1][0] + in1[1][2] * in2[2][0];
	out[1][1] = in1[1][0] * in2[0][1] + in1[1][1] * in2[1][1] + in1[1][2] * in2[2][1];
	out[1][2] = in1[1][0] * in2[0][2] + in1[1][1] * in2[1][2] + in1[1][2] * in2[2][2];

	out[2][0] = in1[2][0] * in2[0][0] + in1[2][1] * in2[1][0] + in1[2][2] * in2[2][0];
	out[2][1] = in1[2][0] * in2[0][1] + in1[2][1] * in2[1][1] + in1[2][2] * in2[2][1];
	out[2][2] = in1[2][0] * in2[0][2] + in1[2][1] * in2[1][2] + in1[2][2] * in2[2][2];
}

/**
 * RotatePoint
 */
function RotatePoint(point, axis) {
	var tvec = vec3.set(point, [0, 0, 0]);
	point[0] = vec3.dot(axis[0], tvec);
	point[1] = vec3.dot(axis[1], tvec);
	point[2] = vec3.dot(axis[2], tvec);
}

// /**
//  * RotateAroundDirection
//  */
// function RotateAroundDirection(axis, yaw) {
// 	// Create an arbitrary axis[1].
// 	PerpendicularVector(axis[0], axis[1]);

// 	// Rotate it around axis[0] by yaw.
// 	if (yaw) {
// 		var temp = vec3.create(axis[1]);
// 		RotatePointAroundVector(temp, axis[0], yaw, axis[1]);
// 	}

// 	// Cross to get axis[2].
// 	vec3.cross(axis[0], axis[1], axis[2]);
// }

/**
 * Plane
 */
var PLANE_X         = 0;
var PLANE_Y         = 1;
var PLANE_Z         = 2;
var PLANE_NON_AXIAL = 3;

var Plane = function () {
	this.normal   = [0, 0, 0];
	this.dist     = 0;
	this.type     = 0;
	this.signbits = 0;
};

Plane.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new Plane();
	}

	vec3.set(this.normal, to.normal);
	to.dist = this.dist;
	to.type = this.type;
	to.signbits = this.signbits;

	return to;
};

/**
 * PlaneTypeForNormal
 */
function PlaneTypeForNormal(x) {
	return x[0] == 1.0 ? PLANE_X : (x[1] == 1.0 ? PLANE_Y : (x[2] == 1.0 ? PLANE_Z : PLANE_NON_AXIAL));
}

/**
 * GetPlaneSignbits
 */
function GetPlaneSignbits(normal) {
	var bits = 0;

	for (var i = 0; i < 3; i++) {
		if (normal[i] < 0) {
			bits |= 1 << i;
		}
	}

	return bits;
}

/**
 * BoxOnPlaneSide
 *
 * Returns 1, 2, or 1 + 2.
 */
function BoxOnPlaneSide(mins, maxs, p) {
	// fast axial cases
	if (p.type < PLANE_NON_AXIAL) {
		if (p.dist <= mins[p.type]) {
			return 1;
		} else if (p.dist >= maxs[p.type]) {
			return 2;
		}
		return 3;
	}

	// general case
	var dist = [0, 0];
	
	if (p.signbits < 8) {                       // >= 8: default case is original code (dist[0]=dist[1]=0)
		for (var i = 0; i < 3; i++) {
			var b = (p.signbits >> i) & 1;
			dist[b] += p.normal[i]*maxs[i];
			dist[b^1] += p.normal[i]*mins[i];
		}
	}

	var sides = 0;
	if (dist[0] >= p.dist) {
		sides = 1;
	}
	if (dist[1] < p.dist) {
		sides |= 2;
	}

	return sides;
}

/**
 * ProjectPointOnPlane
 */
function ProjectPointOnPlane(p, normal, dest) {
	var n = vec3.scale(normal, vec3.dot(normal, p), [0, 0, 0]);
	vec3.subtract(p, n, dest);
}

/**
 * RadiusFromBounds
 */
function RadiusFromBounds(mins, maxs) {
	var a, b;
	var corner = [0, 0, 0];

	for (var i = 0; i < 3; i++) {
		a = Math.abs(mins[i]);
		b = Math.abs(maxs[i]);
		corner[i] = a > b ? a : b;
	}

	return vec3.length(corner);
}

/**
 * ClearBounds
 */
function ClearBounds(mins, maxs) {
	mins[0] = mins[1] = mins[2] = 99999;
	maxs[0] = maxs[1] = maxs[2] = -99999;
}

/**
 * AddPointToBounds
 */
function AddPointToBounds(v, mins, maxs) {
	if (v[0] < mins[0]) {
		mins[0] = v[0];
	}
	if (v[0] > maxs[0]) {
		maxs[0] = v[0];
	}

	if (v[1] < mins[1]) {
		mins[1] = v[1];
	}
	if (v[1] > maxs[1]) {
		maxs[1] = v[1];
	}

	if (v[2] < mins[2]) {
		mins[2] = v[2];
	}
	if (v[2] > maxs[2]) {
		maxs[2] = v[2];
	}
}

/**
 * BoundsIntersect
 */
function BoundsIntersect(mins, maxs, mins2, maxs2, epsilon) {
	epsilon = epsilon || 0;
	
	if (maxs[0] < mins2[0] - epsilon ||
		maxs[1] < mins2[1] - epsilon ||
		maxs[2] < mins2[2] - epsilon ||
		mins[0] > maxs2[0] + epsilon ||
		mins[1] > maxs2[1] + epsilon ||
		mins[2] > maxs2[2] + epsilon) {
		return false;
	}

	return true;
}

/**
 * BoundsIntersectSphere
 */
function BoundsIntersectSphere(mins, maxs, origin, radius) {
	if (origin[0] - radius > maxs[0] ||
		origin[0] + radius < mins[0] ||
		origin[1] - radius > maxs[1] ||
		origin[1] + radius < mins[1] ||
		origin[2] - radius > maxs[2] ||
		origin[2] + radius < mins[2]) {
		return false;
	}

	return true;
}

/**
 * BoundsIntersectPoint
 */
function BoundsIntersectPoint(mins, maxs, origin) {
	if (origin[0] > maxs[0] ||
		origin[0] < mins[0] ||
		origin[1] > maxs[1] ||
		origin[1] < mins[1] ||
		origin[2] > maxs[2] ||
		origin[2] < mins[2]) {
		return false;
	}

	return true;
}

/**
 * RadixSort
 *
 * Sort 32 bit ints into 8 bit buckets.
 * http://stackoverflow.com/questions/8082425/fastest-way-to-sort-32bit-signed-integer-arrays-in-javascript
 */
var _radixSort_0 = [
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
];

function RadixSort(arr, prop, len) {
	var cpy = new Array(len);
	var c4 = [].concat(_radixSort_0); 
	var c3 = [].concat(_radixSort_0); 
	var c2 = [].concat(_radixSort_0);
	var c1 = [].concat(_radixSort_0); 
	var o4 = 0; var k4;
	var o3 = 0; var k3;
	var o2 = 0; var k2;
	var o1 = 0; var k1;
	var x;
	for (x = 0; x < len; x++) {
		k4 = arr[x][prop] & 0xFF;
		k3 = (arr[x][prop] >> 8) & 0xFF;
		k2 = (arr[x][prop] >> 16) & 0xFF;
		k1 = (arr[x][prop] >> 24) & 0xFF ^ 0x80;
		c4[k4]++;
		c3[k3]++;
		c2[k2]++;
		c1[k1]++;
	}
	for (x = 0; x < 256; x++) {
		k4 = o4 + c4[x];
		k3 = o3 + c3[x];
		k2 = o2 + c2[x];
		k1 = o1 + c1[x];
		c4[x] = o4;
		c3[x] = o3;
		c2[x] = o2;
		c1[x] = o1;
		o4 = k4;
		o3 = k3;
		o2 = k2;
		o1 = k1;
	}
	for (x = 0; x < len; x++) {
		k4 = arr[x][prop] & 0xFF;
		cpy[c4[k4]] = arr[x];
		c4[k4]++;
	}
	for (x = 0; x < len; x++) {
		k3 = (cpy[x][prop] >> 8) & 0xFF;
		arr[c3[k3]] = cpy[x];
		c3[k3]++;
	}
	for (x = 0; x < len; x++) {
		k2 = (arr[x][prop] >> 16) & 0xFF;
		cpy[c2[k2]] = arr[x];
		c2[k2]++;
	}
	for (x = 0; x < len; x++) {
		k1 = (cpy[x][prop] >> 24) & 0xFF ^ 0x80;
		arr[c1[k1]] = cpy[x];
		c1[k1]++;
	}

	return arr;
}

return {
	vec3_origin:           vec3_origin,
	
	DirToByte:             DirToByte,
	ByteToDir:             ByteToDir,
	ClampChar:             ClampChar,
	crandom:               crandom,

	PerpendicularVector:   PerpendicularVector,

	PITCH:                 PITCH,
	YAW:                   YAW,
	ROLL:                  ROLL,
	AngleSubtract:         AngleSubtract,
	AnglesSubtract:        AnglesSubtract,
	LerpAngle:             LerpAngle,
	AngleMod:              AngleMod,
	AnglesToVectors:       AnglesToVectors,
	AngleToShort:          AngleToShort,
	ShortToAngle:          ShortToAngle,

	AxisClear:             AxisClear,
	AnglesToAxis:          AnglesToAxis,
	AxisMultiply:          AxisMultiply,
	RotatePoint:           RotatePoint,

	PLANE_X:               PLANE_X,
	PLANE_Y:               PLANE_Y,
	PLANE_Z:               PLANE_Z,
	PLANE_NON_AXIAL:       PLANE_NON_AXIAL,
	Plane:                 Plane,
	PlaneTypeForNormal:    PlaneTypeForNormal,
	GetPlaneSignbits:      GetPlaneSignbits,
	BoxOnPlaneSide:        BoxOnPlaneSide,
	ProjectPointOnPlane:   ProjectPointOnPlane,

	RadiusFromBounds:      RadiusFromBounds,
	ClearBounds:           ClearBounds,
	AddPointToBounds:      AddPointToBounds,
	BoundsIntersect:       BoundsIntersect,
	BoundsIntersectSphere: BoundsIntersectSphere,
	BoundsIntersectPoint:  BoundsIntersectPoint,

	RadixSort:             RadixSort
};

});
define('common/sh', ['common/qmath'], function (qm) {
	var BASE_FOLDER = 'baseq3';
var MAX_QPATH   = 64;
var CMD_BACKUP  = 64;

// If entityState.solid === SOLID_BMODEL, modelIndex is an inline model number
var SOLID_BMODEL = 0xffffff;

/**
 * Cvar flags
 */
var CVF = {
	ARCHIVE:    0x0001,                                    // save to config file
	USERINFO:   0x0002,                                    // sent to server on connect or change
	SERVERINFO: 0x0004,                                    // sent in response to front end requests
	SYSTEMINFO: 0x0008                                     // these cvars will be duplicated on all clients
};

/**
 * Renderer (should be moved)
 */
var MAX_DRAWSURFS  = 0x10000;

/**
 * Snapshot flags
 */
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

/**
 * MAX_* defines used to pre-alloc many structures
 */
var GENTITYNUM_BITS         = 10;
var MAX_CLIENTS             = 32;                          // absolute limit
var MAX_GENTITIES           = (1 << 10);                   // can't be increased without changing drawsurf bit packing
var MAX_MODELS              = 256;                         // these are sent over the net as 8 bits
var MAX_SOUNDS              = 256;                         // so they cannot be blindly increased

/**
 * Faux entity numbers
 */
var ENTITYNUM_NONE          = MAX_GENTITIES-1;
var ENTITYNUM_WORLD         = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL    = MAX_GENTITIES-2;

var MOVE_RUN = 120;                                        // if forwardmove or rightmove are >= MOVE_RUN,
	                                                       // then BUTTON_WALKING should be set

/**
 * Playerstate
 */
var MAX_STATS               = 16;
var MAX_PERSISTANT          = 16;
var MAX_POWERUPS            = 16;
var MAX_WEAPONS             = 16;
var MAX_PS_EVENTS           = 2;
var PMOVEFRAMECOUNTBITS     = 6;

var BUTTON = {
	ATTACK:       1,
	TALK:         2,                                       // displays talk balloon and disables actions
	USE_HOLDABLE: 4,
	GESTURE:      8,
	WALKING:      16,                                      // walking can't just be infered from MOVE_RUN
	                                                       // because a key pressed late in the frame will
	                                                       // only generate a small move value for that frame
	                                                       // walking will use different animations and
	                                                       // won't generate footsteps
	AFFIRMATIVE:  32,
	NEGATIVE:     64,
	GETFLAG:      128,
	GUARDBASE:    256,
	PATROL:       512,
	FOLLOWME:     1024,
	ANY:          2048                                     // any key whatsoever
};

var TR = {
	STATIONARY:  0,
	INTERPOLATE: 1,                              // non-parametric, but interpolate between snapshots
	LINEAR:      2,
	LINEAR_STOP: 3,
	SINE:        4,                              // value = base + sin( time / duration ) * delta
	GRAVITY:     5
};

var SURF = {
	NODAMAGE:    0x1,                            // never give falling damage
	SLICK:       0x2,                            // effects game physics
	SKY:         0x4,                            // lighting from environment map
	LADDER:      0x8,
	NOIMPACT:    0x10,                           // don't make missile explosions
	NOMARKS:     0x20,                           // don't leave missile marks
	FLESH:       0x40,                           // make flesh sounds and effects
	NODRAW:      0x80,                           // don't generate a drawsurface at all
	HINT:        0x100,                          // make a primary bsp splitter
	SKIP:        0x200,                          // completely ignore, allowing non-closed brushes
	NOLIGHTMAP:  0x400,                          // surface doesn't need a lightmap
	POINTLIGHT:  0x800,                          // generate lighting info at vertexes
	METALSTEPS:  0x1000,                         // clanking footsteps
	NOSTEPS:     0x2000,                         // no footstep sounds
	NONSOLID:    0x4000,                         // don't collide against curves with this set
	LIGHTFILTER: 0x8000,                         // act as a light filter during q3map -light
	ALPHASHADOW: 0x10000,                        // do per-pixel light shadow casting in q3map
	NODLIGHT:    0x20000,                        // don't dlight even if solid (solid lava, skies)
	DUST:        0x40000                         // leave a dust trail when walking on this surface
};

var CONTENTS = {
	SOLID:         1,                                      // an eye is never valid in a solid
	LAVA:          8,
	SLIME:         16,
	WATER:         32,
	FOG:           64,

	NOTTEAM1:      0x0080,
	NOTTEAM2:      0x0100,
	NOBOTCLIP:     0x0200,

	AREAPORTAL:    0x8000,

	PLAYERCLIP:    0x10000,
	MONSTERCLIP:   0x20000,
	TELEPORTER:    0x40000,
	JUMPPAD:       0x80000,
	CLUSTERPORTAL: 0x100000,
	DONOTENTER:    0x200000,
	BOTCLIP:       0x400000,
	MOVER:         0x800000,

	ORIGIN:        0x1000000,                              // removed before bsping an entity

	BODY:          0x2000000,                              // should never be on a brush, only in game
	CORPSE:        0x4000000,
	DETAIL:        0x8000000,                              // brushes not used for the bsp
	STRUCTURAL:    0x10000000,                             // brushes used for the bsp
	TRANSLUCENT:   0x20000000,                             // don't consume surface fragments inside
	TRIGGER:       0x40000000,
	NODROP:        0x80000000                              // don't leave bodies or items (death fog, lava)
};
	// TODO Move to com
var Err = {
	FATAL:      0,                                         // exit the entire game with a popup window
	DROP:       1,
	DISCONNECT: 2,                                         // client disconnected from the server
};

/**
 * Communicated across the network
 */
var NetAdrType = {
	NAD:      0,
	LOOPBACK: 1,
	IP:       2
};

var NetSrc = {
	CLIENT : 0,
	SERVER: 1
};

var NetAdr = function (type, ip, port) {
	this.type = type;
	this.ip   = ip;
	this.port = port;
};

var UserCmd = function () {
	this.serverTime  = 0;
	this.angles      = [0, 0, 0];
	this.forwardmove = 0;
	this.rightmove   = 0;
	this.upmove      = 0;
	this.buttons     = 0;
	this.weapon      = 0;
};

UserCmd.prototype.clone = function (cmd) {
	if (typeof(cmd) === 'undefined') {
		cmd = new UserCmd();
	}

	cmd.serverTime = this.serverTime;
	vec3.set(this.angles, cmd.angles);
	cmd.forwardmove = this.forwardmove;
	cmd.rightmove = this.rightmove;
	cmd.upmove = this.upmove;
	cmd.buttons = this.buttons;
	cmd.weapon = this.weapon;

	return cmd;
};

/**
 * Player state
 */
var PlayerState = function () {
	this.clientNum           = 0;                          // ranges from 0 to MAX_CLIENTS-1
	this.commandTime         = 0;                          // cmd->serverTime of last executed command
	this.pm_type             = 0;
	this.pm_flags            = 0;                          // ducked, jump_held, etc
	this.origin              = [0, 0, 0];
	this.velocity            = [0, 0, 0];
	this.viewangles          = [0, 0, 0];
	this.delta_angles        = [0, 0, 0];                  // add to command angles to get view direction
	                                                       // changed by spawns, rotating objects, and teleporters
	this.speed               = 0;
	this.gravity             = 0;
	this.groundEntityNum     = ENTITYNUM_NONE;             // ENTITYNUM_NONE = in air
	this.bobCycle            = 0;                          // for view bobbing and footstep generation

	this.weapon              = 0;                          // copied to entityState_t->weapon
	this.weaponState         = 0;
	this.weaponTime          = 0;
	this.legsTimer           = 0;                          // don't change low priority animations until this runs out
	this.legsAnim            = 0;                          // mask off ANIM_TOGGLEBIT

	this.torsoTimer          = 0;                          // don't change low priority animations until this runs out
	this.torsoAnim           = 0;                          // mask off ANIM_TOGGLEBIT

	this.movementDir         = 0;                          // a number 0 to 7 that represents the relative angle
	                                                       // of movement to the view angle (axial and diagonals)
	                                                       // when at rest, the value will remain unchanged
	                                                       // used to twist the legs during strafing
	this.stats               = new Array(MAX_STATS);
	this.persistant          = new Array(MAX_PERSISTANT);  // stats that aren't cleared on death
	this.powerups            = new Array(MAX_POWERUPS);    // level.time that the powerup runs out
	this.ammo                = new Array(MAX_WEAPONS);

	this.eFlags              = 0;                          // copied to entityState_t->eFlags
	this.eventSequence       = 0;                          // pmove generated events
	this.events              = new Array(MAX_PS_EVENTS);
	this.eventParms          = new Array(MAX_PS_EVENTS);

	this.externalEvent       = 0;                          // events set on player from another source
	this.externalEventParm   = 0;
	this.externalEventTime   = 0;

	this.jumppad_ent         = 0;                          // jumppad entity hit this frame
	this.jumppad_frame       = 0;
	this.pmove_framecount    = 0;
	this.entityEventSequence = 0;

	for (var i = 0; i < MAX_STATS; i++) {
		this.stats[i] = 0;
	}
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		this.persistant[i] = 0;
	}
	for (var i = 0; i < MAX_POWERUPS; i++) {
		this.powerups[i] = 0;
	}
	for (var i = 0; i < MAX_WEAPONS; i++) {
		this.ammo[i] = 0;
	}
};

// deep copy
PlayerState.prototype.clone = function (ps) {
	if (typeof(ps) === 'undefined') {
		ps = new PlayerState();
	}

	ps.clientNum            = this.clientNum;
	ps.commandTime          = this.commandTime;
	ps.pm_type              = this.pm_type;
	ps.pm_flags             = this.pm_flags;
	vec3.set(this.origin, ps.origin);
	vec3.set(this.velocity, ps.velocity);
	vec3.set(this.viewangles, ps.viewangles);
	vec3.set(this.delta_angles, ps.delta_angles);
	ps.speed                = this.speed;
	ps.gravity              = this.gravity;
	ps.groundEntityNum      = this.groundEntityNum;
	ps.bobCycle             = this.bobCycle;
	ps.weapon               = this.weapon;
	ps.weaponState          = this.weaponState;
	ps.weaponTime           = this.weaponTime;
	ps.legsTimer            = this.legsTimer;
	ps.legsAnim             = this.legsAnim;
	ps.torsoTimer           = this.torsoTimer;
	ps.torsoAnim            = this.torsoAnim;
	ps.movementDir          = this.movementDir;
	for (var i = 0; i < MAX_STATS; i++) {
		ps.stats[i] = this.stats[i];
	}
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		ps.persistant[i] = this.persistant[i];
	}
	for (var i = 0; i < MAX_POWERUPS; i++) {
		ps.powerups[i] = this.powerups[i];
	}
	for (var i = 0; i < MAX_WEAPONS; i++) {
		ps.ammo[i] = this.ammo[i];
	}
	ps.eFlags               = this.eFlags;
	ps.eventSequence        = this.eventSequence;
	for (var i = 0; i < MAX_PS_EVENTS; i++) {
		ps.events[i] = this.events[i];
		ps.eventParms[i] = this.eventParms[i];
	}
	ps.jumppad_ent          = this.jumppad_ent;
	ps.jumppad_frame        = this.jumppad_frame;
	ps.pmove_framecount     = this.pmove_framecount;

	return ps;
};

var Trajectory = function () {
	this.trType     = 0;
	this.trTime     = 0;
	this.trDuration = 0;
	this.trBase     = [0, 0, 0];
	this.trDelta    = [0, 0, 0];
};

Trajectory.prototype.clone = function (tr) {
	if (typeof(tr) === 'undefined') {
		tr = TrajectoryType();
	}

	tr.trType = this.trType;
	tr.trTime = this.trTime;
	tr.trDuration = this.trDuration;
	vec3.set(this.trBase, tr.trBase);
	vec3.set(this.trDelta, tr.trDelta);

	return tr;
};

var Orientation = function () {
	this.origin      = [0, 0, 0];                          // in world coordinates
	this.axis        = [                                   // orientation in world
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	// Used by renderer.
	this.viewOrigin  = [0, 0, 0];                          // viewParms->or.origin in local coordinates
	this.modelMatrix = mat4.create();
};

Orientation.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new Orientation();
	}

	vec3.set(this.origin, to.origin);
	vec3.set(this.axis[0], to.axis[0]);
	vec3.set(this.axis[1], to.axis[1]);
	vec3.set(this.axis[2], to.axis[2]);
	vec3.set(this.viewOrigin, to.viewOrigin);
	mat4.set(this.modelMatrix, to.modelMatrix);

	return to;
};

/**********************************************************
 * EntityState is the information conveyed from the server
 * in an update message about entities that the client will
 * need to render in some way. Different eTypes may use the
 * information in different ways. The messages are delta
 * compressed, so it doesn't really matter if the structure
 * size is fairly large
 **********************************************************/
var EntityState = function () {
	this.reset();
};

EntityState.prototype.reset = function () {
	this.number          = 0;                              // entity index
	this.eType           = 0;                              // entityType_t
	this.eFlags          = 0;
	this.pos             = new Trajectory();               // for calculating position
	this.apos            = new Trajectory();               // for calculating angles
	this.time            = 0;
	this.time2           = 0;
	this.origin          = [0, 0, 0];
	this.origin2         = [0, 0, 0];
	this.angles          = [0, 0, 0];
	this.angles2         = [0, 0, 0];
	this.otherEntityNum  = 0;                              // shotgun sources, etc
	this.otherEntityNum2 = 0;                              // shotgun sources, etc
	this.groundEntityNum = ENTITYNUM_NONE;                 // ENTITYNUM_NONE = in air
	this.constantLight   = 0;                              // r + (g<<8) + (b<<16) + (intensity<<24)
	this.loopSound       = 0;                              // constantly loop this sound
	this.modelIndex      = 0;
	this.modelIndex2     = 0;
	this.clientNum       = 0;                              // 0 to (MAX_CLIENTS - 1), for players and corpses
	this.frame           = 0;
	this.solid           = 0;                              // for client side prediction, trap_linkentity sets this properly
	this.event           = 0;                              // impulse events -- muzzle flashes, footsteps, etc
	this.eventParm       = 0;
	// For players.
	this.powerups        = 0;                              // bit flags
	this.weapon          = 0;                              // determines weapon and flash model, etc
	this.legsAnim        = 0;                              // mask off ANIM_TOGGLEBIT
	this.torsoAnim       = 0;                              // mask off ANIM_TOGGLEBIT
	this.generic1        = 0;
};

// deep copy
EntityState.prototype.clone = function (es) {
	if (typeof(es) === 'undefined') {
		es = new EntityState();
	}

	es.number            = this.number;
	es.eType             = this.eType;
	es.eFlags            = this.eFlags;
	this.pos.clone(es.pos);
	this.apos.clone(es.apos);
	es.time              = this.time;
	es.time2             = this.time2;
	vec3.set(this.origin,  es.origin);
	vec3.set(this.origin2, es.origin2);
	vec3.set(this.angles,  es.angles);
	vec3.set(this.angles2, es.angles2);
	es.otherEntityNum    = this.otherEntityNum;
	es.otherEntityNum2   = this.otherEntityNum2;
	es.groundEntityNum   = this.groundEntityNum;
	es.constantLight     = this.constantLight;
	es.loopSound         = this.loopSound;
	es.modelIndex        = this.modelIndex;
	es.modelIndex2       = this.modelIndex2;
	es.clientNum         = this.clientNum;
	es.frame             = this.frame;
	es.solid             = this.solid;
	es.event             = this.event;
	es.eventParm         = this.eventParm;
	es.powerups          = this.powerups;
	es.weapon            = this.weapon;
	es.legsAnim          = this.legsAnim;
	es.torsoAnim         = this.torsoAnim;
	es.generic1          = this.generic1;

	return es;
};

/**
 * BSP Defines
 */
var Lumps = {
	ENTITIES:     0,
	SHADERS:      1,
	PLANES:       2,
	NODES:        3,
	LEAFS:        4,
	LEAFSURFACES: 5,
	LEAFBRUSHES:  6,
	MODELS:       7,
	BRUSHES:      8,
	BRUSHSIDES:   9,
	DRAWVERTS:    10,
	DRAWINDEXES:  11,
	FOGS:         12,
	SURFACES:     13,
	LIGHTMAPS:    14,
	LIGHTGRID:    15,
	VISIBILITY:   16,
	NUM_LUMPS:    17
};

var MapSurfaceType = {
	BAD:           0,
	PLANAR:        1,
	PATCH:         2,
	TRIANGLE_SOUP: 3,
	FLARE:         4
};

var lumps_t = function () {
	this.fileofs  = 0;                           // int32
	this.filelen = 0;                           // int32
};

var dheader_t = function () {
	this.ident    = null;                        // byte * 4 (string)
	this.version  = 0;                           // int32
	this.lumps    = new Array(Lumps.NUM_LUMPS);  // lumps_t * Lumps.NUM_LUMPS

	for (var i = 0; i < Lumps.NUM_LUMPS; i++) {
		this.lumps[i] = new lumps_t();
	}
};

var dmodel_t = function () {
	this.mins         = [0, 0, 0];               // float32 * 3
	this.maxs         = [0, 0, 0];               // float32 * 3
	this.firstSurface = 0;                       // int32
	this.numSurfaces  = 0;                       // int32
	this.firstBrush   = 0;                       // int32
	this.numBrushes   = 0;                       // int32
};
dmodel_t.size = 40;

var dshader_t = function () {
	this.shaderName = null;                      // byte * MAX_QPATH (string)
	this.flags      = 0;                         // int32
	this.contents   = 0;                         // int32
};
dshader_t.size = 72;

var dplane_t = function () {
	this.normal = [0, 0, 0];                     // float32 * 3
	this.dist   = 0;                             // float32
};
dplane_t.size = 16;

var dnode_t = function () {
	this.planeNum    = 0;                        // int32
	this.childrenNum = [0, 0];                   // int32 * 2
	this.mins        = [0, 0, 0];                // int32 * 3
	this.maxs        = [0, 0, 0];                // int32 * 3
};
dnode_t.size = 36;

var dleaf_t = function () {
	this.cluster          = 0;                   // int32
	this.area             = 0;                   // int32
	this.mins             = [0, 0, 0];           // int32 * 3
	this.maxs             = [0, 0, 0];           // int32 * 3
	this.firstLeafSurface = 0;                   // int32
	this.numLeafSurfaces  = 0;                   // int32
	this.firstLeafBrush   = 0;                   // int32
	this.numLeafBrushes   = 0;                   // int32
};
dleaf_t.size = 48;

var dbrushside_t = function () {
	this.planeNum = 0;                           // int32
	this.shader   = 0;                           // int32
};
dbrushside_t.size = 8;

var dbrush_t = function () {
	this.side     = 0;                           // int32
	this.numsides = 0;                           // int32
	this.shader   = 0;                           // int32
};
dbrush_t.size = 12;

var dfog_t = function () {
	this.shader      = null;                     // byte * MAX_QPATH (string)
	this.brushNum    = 0;                        // int32
	this.visibleSide = 0;                        // int32
};
dfog_t.size = 72;

var drawVert_t = function () {
	this.pos      = [0, 0, 0];                   // float32 * 3
	this.texCoord = [0, 0];                      // float32 * 2
	this.lmCoord  = [0, 0];                      // float32 * 2
	this.normal   = [0, 0, 0];                   // float32 * 3
	this.color    = [0, 0, 0, 0];                // uint8 * 4
};
drawVert_t.size = 44;

var dsurface_t = function () {
	this.shaderNum     = 0;                      // int32
	this.fogNum        = 0;                      // int32
	this.surfaceType   = 0;                      // int32
	this.vertex        = 0;                      // int32
	this.vertCount     = 0;                      // int32
	this.meshVert      = 0;                      // int32
	this.meshVertCount = 0;                      // int32
	this.lightmapNum   = 0;                      // int32
	this.lmStart       = [0, 0];                 // int32 * 2
	this.lmSize        = [0, 0];                 // int32 * 2
	this.lmOrigin      = [0, 0, 0];              // float32 * 3
	this.lmVecs        = [                       // float32 * 9
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	this.patchWidth    = 0;                      // int32
	this.patchHeight   = 0;                      // int32
};
dsurface_t.size = 104;

function atob64(arr) {
	var limit = 1 << 16;
	var length = arr.length;
	var slice = arr.slice || arr.subarray;
	var str;

	if (length < limit) {
		str = String.fromCharCode.apply(String, arr);
	} else {
		var chunks = [];
		var i = 0;
		while (i < length) {
			chunks.push(String.fromCharCode.apply(String, slice.call(arr, i, i + limit)));
			i += limit;
		}
		str = chunks.join('');
	}

	return btoa(str);
}
	//
// Helper functions to get/set object properties based on a string.
//
var FLOAT32 = 0;
var UINT8   = 1;
var UINT16  = 2;
var UINT32  = 3;

function FTA(fieldname) {
	var m = fieldname.match(/([^\.\[\]]+)/g);
	return m;
}

function AGET(obj, path) {
	var i, len;

	for (i = 0, len = path.length; i < len - 1; i++) {
		obj = obj[path[i]];
	}
	
	return obj[path[len - 1]];
}

function ASET(obj, path, val) {
	var i, len;

	for (i = 0, len = path.length; i < len - 1; i++) {
		obj = obj[path[i]];
	}

	obj[path[len - 1]] = val;
}

function fnread(bits) {
	switch (bits) {
		case FLOAT32:
			return 'readFloat';
			break;
		case UINT8:
			return 'readUnsignedByte';
			break;
		case UINT16:
			return 'readUnsignedShort';
			break;
		case UINT32:
			return 'readUnsignedInt';
			break;
		default:
			throw new Error('fnread: bad bit count ' + bits);
	}
}

function fnwrite(bits) {
	switch (bits) {
		case FLOAT32:
			return 'writeFloat';
			break;
		case UINT8:
			return 'writeUnsignedByte';
			break;
		case UINT16:
			return 'writeUnsignedShort';
			break;
		case UINT32:
			return 'writeUnsignedInt';
			break;
		default:
			throw new Error('fnwrite: bad bit count ' + bits);
	}
}

/**********************************************************
 *
 * Playerstate communication
 *
 **********************************************************/

var playerStateFields = [
	{ path: FTA('commandTime'),       bits: UINT32  },
	{ path: FTA('origin[0]'),         bits: FLOAT32 },
	{ path: FTA('origin[1]'),         bits: FLOAT32 },
	{ path: FTA('bobCycle'),          bits: UINT8   },
	{ path: FTA('velocity[0]'),       bits: FLOAT32 },
	{ path: FTA('velocity[1]'),       bits: FLOAT32 },
	{ path: FTA('viewangles[1]'),     bits: FLOAT32 },
	{ path: FTA('viewangles[0]'),     bits: FLOAT32 },
	{ path: FTA('weaponTime'),        bits: UINT16  },
	{ path: FTA('origin[2]'),         bits: FLOAT32 },
	{ path: FTA('velocity[2]'),       bits: FLOAT32 },
	{ path: FTA('legsTimer'),         bits: UINT8   },
	{ path: FTA('pm_time'),           bits: UINT16  },
	{ path: FTA('eventSequence'),     bits: UINT16  },
	{ path: FTA('torsoAnim'),         bits: UINT8   },
	{ path: FTA('movementDir'),       bits: UINT8   }, /*4*/
	{ path: FTA('events[0]'),         bits: UINT8   },
	{ path: FTA('legsAnim'),          bits: UINT8   },
	{ path: FTA('events[1]'),         bits: UINT8   },
	{ path: FTA('pm_flags'),          bits: UINT16  },
	{ path: FTA('groundEntityNum'),   bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: FTA('weaponState'),       bits: UINT8   }, /*4*/
	{ path: FTA('eFlags'),            bits: UINT16  },
	{ path: FTA('externalEvent'),     bits: UINT16  }, /*10*/
	{ path: FTA('gravity'),           bits: UINT16  },
	{ path: FTA('speed'),             bits: UINT16  },
	{ path: FTA('delta_angles[1]'),   bits: UINT16  },
	{ path: FTA('externalEventParm'), bits: UINT8   },
	// { path: FTA('viewheight'),        bits: UINT8   },
	// { path: FTA('damageEvent'),       bits: UINT8   },
	// { path: FTA('damageYaw'),         bits: UINT8   },
	// { path: FTA('damagePitch'),       bits: UINT8   },
	// { path: FTA('damageCount'),       bits: UINT8   },
	// { path: FTA('generic1'),          bits: UINT8   },
	{ path: FTA('pm_type'),           bits: UINT8   },
	{ path: FTA('delta_angles[0]'),   bits: UINT16  },
	{ path: FTA('delta_angles[2]'),   bits: UINT16  },
	{ path: FTA('torsoTimer'),        bits: UINT16  }, /*12*/
	{ path: FTA('eventParms[0]'),     bits: UINT8   },
	{ path: FTA('eventParms[1]'),     bits: UINT8   },
	{ path: FTA('clientNum'),         bits: UINT8   },
	{ path: FTA('weapon'),            bits: UINT8   }, /*5*/
	{ path: FTA('viewangles[2]'),     bits: FLOAT32 },
	// { path: FTA('grapplePoint[0]'),   bits: FLOAT32 },
	// { path: FTA('grapplePoint[1]'),   bits: FLOAT32 },
	// { path: FTA('grapplePoint[2]'),   bits: FLOAT32 },
	{ path: FTA('jumppad_ent'),       bits: UINT16  }, /*GENTITYNUM_BITS*/
	// { path: FTA('loopSound'),         bits: UINT16  }
];

var dummyPlayerState = new PlayerState();

/**
 * WriteDeltaPlayerState
 */
function WriteDeltaPlayerState(msg, from, to) {
	var i, changed;
	var field, fromF, toF, func;

	if (!from) {
		from = dummyPlayerState;
	}

	// Figure out the number of fields that have changed.
	changed = 0;
	for (i = 0; i < playerStateFields.length; i++) {
		field = playerStateFields[i];

		fromF = AGET(from, field.path);
		toF = AGET(to, field.path);

		if (fromF !== toF) {
			changed++;
		}
	}

	msg.writeByte(changed);

	// Write out each field that has changed, prefixing 
	// the changed field with its indexed into the ps
	// field array.
	for (i = 0; i < playerStateFields.length; i++) {
		field = playerStateFields[i];

		fromF = AGET(from, field.path);
		toF = AGET(to, field.path);
		if (fromF === toF) {
			continue;
		}

		func = fnwrite(field.bits);

		// TODO Could write out a master bitmask describing
		// the changed fields.
		msg.writeByte(i);
		msg[func](AGET(to, field.path));
	}

	// Write out the arrays. First we write a bit mask
	// describing which arrays have changed, followed by
	// a mask for each array describing which of its 
	// elements have changed.

	// Sanity check. Increase bitmask send length if changing
	// these maxes is necessary
	if (MAX_STATS > 16 || MAX_PERSISTANT > 16 || MAX_POWERUPS > 16 || MAX_WEAPONS > 16) {
		throw new Error('Array maxes exceed bitmask length');
	}

	var statsbits      = 0,
		persistantbits = 0,
		powerupsbits   = 0,
		ammobits       = 0;

	for (i = 0; i < MAX_STATS; i++) {
		if (to.stats[i] !== from.stats[i]) {
			statsbits |= 1 << i;
		}
	}
	for (i = 0; i < MAX_PERSISTANT; i++) {
		if (to.persistant[i] !== from.persistant[i]) {
			persistantbits |= 1 << i;
		}
	}
	for (i = 0; i < MAX_POWERUPS; i++) {
		if (to.powerups[i] !== from.powerups[i]) {
			powerupsbits |= 1 << i;
		}
	}
	for (i = 0; i < MAX_WEAPONS; i++) {
		if (to.ammo[i] !== from.ammo[i]) {
			ammobits |= 1 << i;
		}
	}

	// Write out a byte explaining which arrays changed.
	var arrbits = (statsbits ? 1 : 0) | (persistantbits ? 2 : 0) | (powerupsbits ? 4 : 0) | (ammobits ? 8 : 0);
	msg.writeByte(arrbits);

	if (statsbits) {
		msg.writeShort(statsbits);
		for (i = 0; i < MAX_STATS; i++) {
			if (statsbits & (1 << i)) {
				msg.writeShort(to.stats[i]);
			}
		}
	}
	if (persistantbits) {
		msg.writeShort(persistantbits);
		for (i = 0; i < MAX_PERSISTANT; i++) {
			if (persistantbits & (1 << i)) {
				msg.writeShort(to.persistant[i]);
			}
		}
	}
	if (powerupsbits) {
		msg.writeShort(powerupsbits);
		for (i = 0; i < MAX_POWERUPS; i++) {
			if (powerupsbits & (1 << i)) {
				msg.writeShort(to.powerups[i]);
			}
		}
	}
	if (ammobits) {
		msg.writeShort(ammobits);
		for (i = 0; i < MAX_WEAPONS; i++) {
			if (ammobits & (1 << i)) {
				msg.writeShort(to.ammo[i]);
			}
		}
	}
}

function ReadDeltaPlayerState(msg, from, to) {
	var i, changed;
	var idx, field, fromF, toF, func;

	if (!from) {
		from = dummyPlayerState;
	}
	
	// Clone the initial state.
	from.clone(to);

	// Get the number of fields changed.
	changed = msg.readByte();

	// Read all the changed fields.
	for (i = 0; i < changed; i++) {
		idx = msg.readByte();
		field = playerStateFields[idx];
		func = fnread(field.bits);

		ASET(to, field.path, msg[func]());
	}

	var arrbits = msg.readByte();

	if (arrbits & 1) {
		var statsbits = msg.readShort();
		for (i = 0; i < MAX_STATS; i++) {
			if (statsbits & (1 << i)) {
				to.stats[i] = msg.readShort();
			}
		}
	}
	if (arrbits & 2) {
		var persistantbits = msg.readShort();
		for (i = 0; i < MAX_PERSISTANT; i++) {
			if (persistantbits & (1 << i)) {
				to.persistant[i] = msg.readShort();
			}
		}
	}

	if (arrbits & 4) {
		var powerupsbits = msg.readShort();
		for (i = 0; i < MAX_POWERUPS; i++) {
			if (powerupsbits & (1 << i)) {
				to.powerups[i] = msg.readShort();
			}
		}
	}

	if (arrbits & 8) {
		var ammobits = msg.readShort();
		for (i = 0; i < MAX_WEAPONS; i++) {
			if (ammobits & (1 << i)) {
				to.ammo[i] = msg.readShort();
			}
		}
	}
}

/**********************************************************
 *
 * Entitystate communication
 *
 **********************************************************/

var entityStateFields = [
	{ path: FTA('pos.trTime'),      bits: UINT32  },
	{ path: FTA('pos.trBase[0]'),   bits: FLOAT32 },
	{ path: FTA('pos.trBase[1]'),   bits: FLOAT32 },
	{ path: FTA('pos.trDelta[0]'),  bits: FLOAT32 },
	{ path: FTA('pos.trDelta[1]'),  bits: FLOAT32 },
	{ path: FTA('pos.trBase[2]'),   bits: FLOAT32 },
	{ path: FTA('apos.trBase[1]'),  bits: FLOAT32 },
	{ path: FTA('pos.trDelta[2]'),  bits: FLOAT32 },
	{ path: FTA('apos.trBase[0]'),  bits: FLOAT32 },
	{ path: FTA('event'),           bits: UINT16  }, /*10*/
	{ path: FTA('angles2[1]'),      bits: FLOAT32 },
	{ path: FTA('eType'),           bits: UINT8   },
	{ path: FTA('torsoAnim'),       bits: UINT8   },
	{ path: FTA('eventParm'),       bits: UINT8   },
	{ path: FTA('legsAnim'),        bits: UINT8   },
	{ path: FTA('groundEntityNum'), bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: FTA('pos.trType'),      bits: UINT8   },
	{ path: FTA('eFlags'),          bits: UINT32  }, /*19*/
	{ path: FTA('otherEntityNum'),  bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: FTA('weapon'),          bits: UINT8   },
	{ path: FTA('clientNum'),       bits: UINT8   },
	{ path: FTA('angles[1]'),       bits: FLOAT32 },
	{ path: FTA('pos.trDuration'),  bits: UINT32  },
	{ path: FTA('apos.trType'),     bits: UINT8   },
	{ path: FTA('origin[0]'),       bits: FLOAT32 },
	{ path: FTA('origin[1]'),       bits: FLOAT32 },
	{ path: FTA('origin[2]'),       bits: FLOAT32 },
	{ path: FTA('solid'),           bits: UINT32  }, /*24*/
	{ path: FTA('powerups'),        bits: UINT16  }, /*MAX_POWERUPS*/
	{ path: FTA('modelIndex'),      bits: UINT8   },
	{ path: FTA('otherEntityNum2'), bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: FTA('loopSound'),       bits: UINT8   },
	{ path: FTA('generic1'),        bits: UINT8   },
	{ path: FTA('origin2[2]'),      bits: FLOAT32 },
	{ path: FTA('origin2[0]'),      bits: FLOAT32 },
	{ path: FTA('origin2[1]'),      bits: FLOAT32 },
	{ path: FTA('modelIndex2'),     bits: UINT8   },
	{ path: FTA('angles[0]'),       bits: FLOAT32 },
	{ path: FTA('time'),            bits: UINT32  },
	{ path: FTA('apos.trTime'),     bits: UINT32  },
	{ path: FTA('apos.trDuration'), bits: UINT32  },
	{ path: FTA('apos.trBase[2]'),  bits: FLOAT32 },
	{ path: FTA('apos.trDelta[0]'), bits: FLOAT32 },
	{ path: FTA('apos.trDelta[1]'), bits: FLOAT32 },
	{ path: FTA('apos.trDelta[2]'), bits: FLOAT32 },
	{ path: FTA('time2'),           bits: UINT32  },
	{ path: FTA('angles[2]'),       bits: FLOAT32 },
	{ path: FTA('angles2[0]'),      bits: FLOAT32 },
	{ path: FTA('angles2[2]'),      bits: FLOAT32 },
	{ path: FTA('constantLight'),   bits: UINT32  },
	{ path: FTA('frame'),           bits: UINT16  }
];

/**
 * WriteDeltaEntityState
 *
 * Writes part of a packetentities message, including the entity number.
 * Can delta from either a baseline or a previous packet_entity.
 * If to is NULL, a remove entity update will be sent.
 * If force is not set, then nothing at all will be generated if the entity is
 * identical, under the assumption that the in-order delta code will catch it.
 */
function WriteDeltaEntityState(msg, from, to, force) {
	var i, changed;
	var field, fromF, toF, func;

	// A null to is a delta remove message.
	if (to === null) {
		if (from === null) {
			return;
		}
		msg.writeShort(from.number);  /* GENTITYNUM_BITS */
		msg.writeByte(0 | 1);  // removed | no delta
		return;
	}

	// Sanity check.
	if (to.number < 0 || to.number >= MAX_GENTITIES) {
		throw new Error('WriteDeltaEntityState: Bad entity number: ', to.number);
	}

	// Figure out the number of fields that have changed.
	changed = 0;
	for (i = 0; i < entityStateFields.length; i++) {
		field = entityStateFields[i];

		fromF = AGET(from, field.path);
		toF = AGET(to, field.path);

		if (fromF !== toF) {
			changed++;
		}
	}

	if (changed === 0) {
		// Nothing at all changed.
		if (!force) {
			return;  // write nothing
		}

		msg.writeShort(to.number);  /* GENTITYNUM_BITS */
		msg.writeByte(0);  // not removed | no delta
		return;
	}

	msg.writeShort(to.number); /* GENTITYNUM_BITS */
	msg.writeByte(0 | 2);  // not removed | we have a delta
	msg.writeByte(changed); // number of fields changed

	// Write out each field that has changed, prefixing 
	// the changed field with its indexed into the ps
	// field array.
	for (i = 0; i < entityStateFields.length; i++) {
		field = entityStateFields[i];

		fromF = AGET(from, field.path);
		toF = AGET(to, field.path);
		if (fromF === toF) {
			continue;
		}

		func = fnwrite(field.bits);

		msg.writeByte(i);
		msg[func](AGET(to, field.path));
	}
}

/**
 * ReadDeltaEntityState
 *
 * The entity number has already been read from the message, which
 * is how the from state is identified.
 * 
 * If the delta removes the entity, entityState.number will be set to MAX_GENTITIES-1.
 * 
 * Can go from either a baseline or a previous packet entity.
 */
function ReadDeltaEntityState(msg, from, to, number) {
	var i, changed;
	var idx, field, fromF, toF, func;

	if (number < 0 || number >= MAX_GENTITIES) {
		throw new Error('Bad delta entity number: ', number);
	}

	var opmask = msg.readByte();
	var remove = opmask & 1;
	var delta = opmask & 2;

	// Check for a remove
	if (remove) {
		to.reset();
		to.number = MAX_GENTITIES - 1;
		return;
	}

	// Clone the initial state.
	from.clone(to);
	to.number = number;

	// Check for no delta.
	if (!delta) {
		return;
	}

	// Get the number of fields changed.
	changed = msg.readByte();

	// Read all the changed fields.
	for (i = 0; i < changed; i++) {
		idx = msg.readByte();
		field = entityStateFields[idx];
		func = fnread(field.bits);

		ASET(to, field.path, msg[func]());
	}
}


	return {
		Err:                   Err,

		PlayerState:           PlayerState,
		Trajectory:            Trajectory,
		Orientation:           Orientation,
		EntityState:           EntityState,

		NetAdrType:            NetAdrType,
		NetSrc:                NetSrc,
		NetAdr:                NetAdr,
		UserCmd:               UserCmd,

		Lumps:                 Lumps,
		MapSurfaceType:        MapSurfaceType,
		lumps_t:               lumps_t,
		dheader_t:             dheader_t,
		dmodel_t:              dmodel_t,
		dshader_t:             dshader_t,
		dplane_t:              dplane_t,
		dnode_t:               dnode_t,
		dleaf_t:               dleaf_t,
		dbrushside_t:          dbrushside_t,
		dbrush_t:              dbrush_t,
		dfog_t:                dfog_t,
		drawVert_t:            drawVert_t,
		dsurface_t:            dsurface_t,

		atob64:                atob64,

		WriteDeltaPlayerState: WriteDeltaPlayerState,
		ReadDeltaPlayerState:  ReadDeltaPlayerState,
		WriteDeltaEntityState: WriteDeltaEntityState,
		ReadDeltaEntityState:  ReadDeltaEntityState
	};
});

//     Underscore.js 1.4.1
//     http://underscorejs.org
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js** and **"CommonJS"**, with
  // backwards-compatibility for the old `require()` API. If we're not in
  // CommonJS, add `_` to the global object via a string identifier for
  // the Closure Compiler "advanced" mode. Registration as an AMD module
  // via define() happens at the end of this file.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root['_'] = _;
  }

  // Current version.
  _.VERSION = '1.4.1';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return arguments.length > 2 ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    var found = false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    found = any(obj, function(value) {
      return value === target;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // with specific `key:value` pairs.
  _.where = function(obj, attrs) {
    if (_.isEmpty(attrs)) return [];
    return _.filter(obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (obj.length === +obj.length) return slice.call(obj);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, throttling, more, result;
    var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
    return function() {
      context = this; args = arguments;
      var later = function() {
        timeout = null;
        if (more) {
          result = func.apply(context, args);
        }
        whenDone();
      };
      if (!timeout) timeout = setTimeout(later, wait);
      if (throttling) {
        more = true;
      } else {
        throttling = true;
        result = func.apply(context, args);
      }
      whenDone();
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return _.isNumber(obj) && isFinite(obj);
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + (0 | Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });
      source +=
        escape ? "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'" :
        interpolate ? "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'" :
        evaluate ? "';\n" + evaluate + "\n__p+='" : '';
      index = offset + match.length;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD define happens at the end for compatibility with AMD loaders
  // that don't enforce next-turn semantics on modules.
  if (typeof define === 'function' && define.amd) {
    define('underscore',[], function() {
      return _;
    });
  }

}).call(this);

/**
 * ByteBuffer v0.0.1
 * Copyright (c) 2012 Tim Kurvers <http://moonsphere.net>
 *
 * Wrapper for ArrayBuffer/DataView maintaining index and default endianness.
 * Supports arbitrary reading/writing, implicit growth, clipping, cloning and
 * reversing as well as UTF-8 characters and NULL-terminated C-strings.
 *
 * The contents of this file are subject to the MIT License, under which
 * this library is licensed. See the LICENSE file for the full license.
 */

// Generated by CoffeeScript 1.3.3
(function (exports) {
var ByteBuffer;

ByteBuffer = (function() {
  var extractBuffer, getter, reader, self, setter, writer,
    _this = this;

  ByteBuffer.LITTLE_ENDIAN = true;

  ByteBuffer.BIG_ENDIAN = false;

  self = ByteBuffer;

  getter = function(name, getter) {
    return Object.defineProperty(ByteBuffer.prototype, name, {
      get: getter,
      enumerable: true,
      configurable: true
    });
  };

  setter = function(name, setter) {
    return Object.defineProperty(ByteBuffer.prototype, name, {
      set: setter,
      enumerable: true,
      configurable: true
    });
  };

  function ByteBuffer(source, order, clone, implicitGrowth) {
    var buffer;
    if (source == null) {
      source = 0;
    }
    if (order == null) {
      order = self.BIG_ENDIAN;
    }
    if (clone == null) {
      clone = false;
    }
    if (implicitGrowth == null) {
      implicitGrowth = false;
    }
    this._buffer = null;
    this._raw = null;
    this._view = null;
    this._order = !!order;
    this._implicitGrowth = !!implicitGrowth;
    this._index = 0;
    buffer = extractBuffer(source, clone);
    if (!buffer) {
      buffer = new ArrayBuffer(source);
    }
    this.buffer = buffer;
  }

  ByteBuffer.prototype._sanitizeIndex = function() {
    if (this._index < 0) {
      this._index = 0;
    }
    if (this._index > this.length) {
      return this._index = this.length;
    }
  };

  extractBuffer = function(source, clone) {
    if (clone == null) {
      clone = false;
    }
    if (source.byteLength != null) {
      if (source.buffer != null) {
        if (clone) {
          return source.buffer.slice(0);
        } else {
          return source.buffer;
        }
      } else {
        if (clone) {
          return source.slice(0);
        } else {
          return source;
        }
      }
    } else if (source.length != null) {
      try {
        return (new Uint8Array(source)).buffer;
      } catch (error) {
        return null;
      }
    } else {
      return null;
    }
  };

  getter('buffer', function() {
    return this._buffer;
  });

  setter('buffer', function(buffer) {
    this._buffer = buffer;
    this._raw = new Uint8Array(this._buffer);
    this._view = new DataView(this._buffer);
    return this._sanitizeIndex();
  });

  getter('raw', function() {
    return this._raw;
  });

  getter('view', function() {
    return this._view;
  });

  getter('length', function() {
    return this._buffer.byteLength;
  });

  getter('byteLength', function() {
    return this.length;
  });

  getter('order', function() {
    return this._order;
  });

  setter('order', function(order) {
    return this._order = !!order;
  });

  getter('implicitGrowth', function() {
    return this._implicitGrowth;
  });

  setter('implicitGrowth', function(implicitGrowth) {
    return this._implicitGrowth = !!implicitGrowth;
  });

  getter('index', function() {
    return this._index;
  });

  setter('index', function(index) {
    if (index < 0 || index > this.length) {
      throw new RangeError('Invalid index ' + index + ', should be between 0 and ' + this.length);
    }
    return this._index = index;
  });

  ByteBuffer.prototype.front = function() {
    this._index = 0;
    return this;
  };

  ByteBuffer.prototype.end = function() {
    this._index = this.length;
    return this;
  };

  ByteBuffer.prototype.seek = function(bytes) {
    if (bytes == null) {
      bytes = 1;
    }
    this.index += bytes;
    return this;
  };

  getter('available', function() {
    return this.length - this._index;
  });

  reader = function(method, bytes) {
    return function(order) {
      var value;
      if (order == null) {
        order = this._order;
      }
      if (bytes > this.available) {
        throw new Error('Cannot read ' + bytes + ' byte(s), ' + this.available + ' available');
      }
      value = this._view[method](this._index, order);
      this._index += bytes;
      return value;
    };
  };

  writer = function(method, bytes) {
    return function(value, order) {
      var available;
      if (order == null) {
        order = this._order;
      }
      available = this.available;
      if (bytes > available) {
        if (this._implicitGrowth) {
          this.append(bytes - available);
        } else {
          throw new Error('Cannot write ' + value + ' using ' + bytes + ' byte(s), ' + available + ' available');
        }
      }
      this._view[method](this._index, value, order);
      this._index += bytes;
      return this;
    };
  };

  ByteBuffer.prototype.readByte = reader('getInt8', 1);

  ByteBuffer.prototype.readUnsignedByte = reader('getUint8', 1);

  ByteBuffer.prototype.readShort = reader('getInt16', 2);

  ByteBuffer.prototype.readUnsignedShort = reader('getUint16', 2);

  ByteBuffer.prototype.readInt = reader('getInt32', 4);

  ByteBuffer.prototype.readUnsignedInt = reader('getUint32', 4);

  ByteBuffer.prototype.readFloat = reader('getFloat32', 4);

  ByteBuffer.prototype.readDouble = reader('getFloat64', 8);

  ByteBuffer.prototype.writeByte = writer('setInt8', 1);

  ByteBuffer.prototype.writeUnsignedByte = writer('setUint8', 1);

  ByteBuffer.prototype.writeShort = writer('setInt16', 2);

  ByteBuffer.prototype.writeUnsignedShort = writer('setUint16', 2);

  ByteBuffer.prototype.writeInt = writer('setInt32', 4);

  ByteBuffer.prototype.writeUnsignedInt = writer('setUint32', 4);

  ByteBuffer.prototype.writeFloat = writer('setFloat32', 4);

  ByteBuffer.prototype.writeDouble = writer('setFloat64', 8);

  ByteBuffer.prototype.read = function(bytes) {
    var value;
    if (bytes == null) {
      bytes = this.available;
    }
    if (bytes > this.available) {
      throw new Error('Cannot read ' + bytes + ' byte(s), ' + this.available + ' available');
    }
    if (bytes <= 0) {
      throw new RangeError('Invalid number of bytes ' + bytes);
    }
    value = new self(this._buffer.slice(this._index, this._index + bytes));
    this._index += bytes;
    return value;
  };

  ByteBuffer.prototype.write = function(sequence) {
    var available, buffer, view;
    if (!(sequence instanceof Uint8Array)) {
      buffer = extractBuffer(sequence);
      if (!buffer) {
        throw new TypeError('Cannot write ' + sequence + ', not a sequence');
      }
      view = new Uint8Array(buffer);
    } else {
      view = sequence;
    }
    available = this.available;
    if (view.byteLength > available) {
      if (this._implicitGrowth) {
        this.append(view.byteLength - available);
      } else {
        throw new Error('Cannot write ' + sequence + ' using ' + view.byteLength + ' byte(s), ' + this.available + ' available');
      }
    }
    this._raw.set(view, this._index);
    this._index += view.byteLength;
    return this;
  };

  ByteBuffer.prototype.readString = function(bytes) {
    var b1, b2, b3, b4, c, chars, codepoints, cp, i, length, limit, raw, target;
    if (bytes == null) {
      bytes = this.available;
    }
    if (bytes > this.available) {
      throw new Error('Cannot read ' + bytes + ' byte(s), ' + this.available + ' available');
    }
    if (bytes <= 0) {
      throw new RangeError('Invalid number of bytes ' + bytes);
    }
    raw = this._raw;
    codepoints = [];
    c = 0;
    b1 = b2 = b3 = b4 = null;
    target = this._index + bytes;
    while (this._index < target) {
      b1 = raw[this._index];
      if (b1 < 128) {
        codepoints[c++] = b1;
        this._index++;
      } else if (b1 < 194) {
        throw new Error('Unexpected continuation byte');
      } else if (b1 < 224) {
        b2 = raw[this._index + 1];
        if (b2 < 128 || b2 > 191) {
          throw new Error('Bad continuation byte');
        }
        codepoints[c++] = ((b1 & 0x1F) << 6) + (b2 & 0x3F);
        this._index += 2;
      } else if (b1 < 240) {
        b2 = raw[this._index + 1];
        if (b2 < 128 || b2 > 191) {
          throw new Error('Bad continuation byte');
        }
        b3 = raw[this._index + 2];
        if (b3 < 128 || b3 > 191) {
          throw new Error('Bad continuation byte');
        }
        codepoints[c++] = ((b1 & 0x0F) << 12) + ((b2 & 0x3F) << 6) + (b3 & 0x3F);
        this._index += 3;
      } else if (b1 < 245) {
        b2 = raw[this._index + 1];
        if (b2 < 128 || b2 > 191) {
          throw new Error('Bad continuation byte');
        }
        b3 = raw[this._index + 2];
        if (b3 < 128 || b3 > 191) {
          throw new Error('Bad continuation byte');
        }
        b4 = raw[this._index + 3];
        if (b4 < 128 || b4 > 191) {
          throw new Error('Bad continuation byte');
        }
        cp = ((b1 & 0x07) << 18) + ((b2 & 0x3F) << 12) + ((b3 & 0x3F) << 6) + (b4 & 0x3F);
        cp -= 0x10000;
        codepoints[c++] = 0xD800 + ((cp & 0x0FFC00) >>> 10);
        codepoints[c++] = 0xDC00 + (cp & 0x0003FF);
        this._index += 4;
      } else {
        throw new Error('Illegal byte');
      }
    }
    limit = 1 << 16;
    length = codepoints.length;
    if (length < limit) {
      return String.fromCharCode.apply(String, codepoints);
    } else {
      chars = [];
      i = 0;
      while (i < length) {
        chars.push(String.fromCharCode.apply(String, codepoints.slice(i, i + limit)));
        i += limit;
      }
      return chars.join('');
    }
  };

  ByteBuffer.prototype.writeString = function(string) {
    var b, bytes, c, cp, d, i, length;
    bytes = [];
    length = string.length;
    i = 0;
    b = 0;
    while (i < length) {
      c = string.charCodeAt(i);
      if (c <= 0x7F) {
        bytes[b++] = c;
      } else if (c <= 0x7FF) {
        bytes[b++] = 0xC0 | ((c & 0x7C0) >>> 6);
        bytes[b++] = 0x80 | (c & 0x3F);
      } else if (c <= 0xD7FF || (c >= 0xE000 && c <= 0xFFFF)) {
        bytes[b++] = 0xE0 | ((c & 0xF000) >>> 12);
        bytes[b++] = 0x80 | ((c & 0x0FC0) >>> 6);
        bytes[b++] = 0x80 | (c & 0x3F);
      } else {
        if (i === length - 1) {
          throw new Error('Unpaired surrogate ' + string[i] + ' (index ' + i + ')');
        }
        d = string.charCodeAt(++i);
        if (c < 0xD800 || c > 0xDBFF || d < 0xDC00 || d > 0xDFFF) {
          throw new Error('Unpaired surrogate ' + string[i] + ' (index ' + i + ')');
        }
        cp = ((c & 0x03FF) << 10) + (d & 0x03FF) + 0x10000;
        bytes[b++] = 0xF0 | ((cp & 0x1C0000) >>> 18);
        bytes[b++] = 0x80 | ((cp & 0x03F000) >>> 12);
        bytes[b++] = 0x80 | ((cp & 0x000FC0) >>> 6);
        bytes[b++] = 0x80 | (cp & 0x3F);
      }
      ++i;
    }
    this.write(bytes);
    return bytes.length;
  };

  ByteBuffer.prototype.readUTFChars = ByteBuffer.prototype.readString;

  ByteBuffer.prototype.writeUTFChars = ByteBuffer.prototype.writeString;

  ByteBuffer.prototype.readCString = function() {
    var bytes, i, length, string;
    bytes = this._raw;
    length = bytes.length;
    i = this._index;
    while (bytes[i] !== 0x00 && i < length) {
      ++i;
    }
    length = i - this._index;
    if (length > 0) {
      string = this.readString(length);
      this.readByte();
      return string;
    }
    return null;
  };

  ByteBuffer.prototype.writeCString = function(string) {
    var bytes;
    bytes = this.writeString(string);
    this.writeByte(0x00);
    return ++bytes;
  };

  ByteBuffer.prototype.readASCIIString = function(bytes) {
    var i, c, limit, chars, parts;

    if (bytes > this.available) {
      throw new Error('Cannot read ' + bytes + ' byte(s), ' + this.available + ' available');
    }
    if (bytes <= 0) {
      throw new RangeError('Invalid number of bytes ' + bytes);
    }

    i = 0;
    chars = [];
    while (i < bytes) {
      c = this.readByte();
      if (c !== 0x00) {
        chars[i] = c;
      }
      i++;
    }

    limit = 1 << 16;
    if (bytes < limit) {
      return String.fromCharCode.apply(String, chars);
    } else {
      parts = [];
      i = 0;
      while (i < bytes) {
        parts.push(String.fromCharCode.apply(String, chars.slice(i, i + limit)));
        i += limit;
      }
      return parts.join('');
    }
  };

  ByteBuffer.prototype.writeASCIIString = function(string, fixedLength) {
    var bytes, i, length, chars;
    bytes = this._raw;
    i = 0;
    length = fixedLength || string.length;
    chars = [];
    while (i < length) {
      chars[i++] = i < string.length ? string.charCodeAt(i) : 0x00;
    }    
    this.write(chars);
    return length;
  };

  ByteBuffer.prototype.prepend = function(bytes) {
    var view;
    if (bytes <= 0) {
      throw new RangeError('Invalid number of bytes ' + bytes);
    }
    view = new Uint8Array(this.length + bytes);
    view.set(this._raw, bytes);
    this._index += bytes;
    this.buffer = view.buffer;
    return this;
  };

  ByteBuffer.prototype.append = function(bytes) {
    var view;
    if (bytes <= 0) {
      throw new RangeError('Invalid number of bytes ' + bytes);
    }
    view = new Uint8Array(this.length + bytes);
    view.set(this._raw, 0);
    this.buffer = view.buffer;
    return this;
  };

  ByteBuffer.prototype.clip = function(begin, end) {
    var buffer;
    if (begin == null) {
      begin = this._index;
    }
    if (end == null) {
      end = this.length;
    }
    if (begin < 0) {
      begin = this.length + begin;
    }
    buffer = this._buffer.slice(begin, end);
    this._index -= begin;
    this.buffer = buffer;
    return this;
  };

  ByteBuffer.prototype.slice = function(begin, end) {
    var slice;
    if (begin == null) {
      begin = 0;
    }
    if (end == null) {
      end = this.length;
    }
    slice = new self(this._buffer.slice(begin, end));
    return slice;
  };

  ByteBuffer.prototype.clone = function() {
    var clone;
    clone = new self(this._buffer.slice(0));
    clone.index = this._index;
    return clone;
  };

  ByteBuffer.prototype.reverse = function() {
    Array.prototype.reverse.call(this._raw);
    this._index = 0;
    return this;
  };

  ByteBuffer.prototype.toArray = function() {
    return Array.prototype.slice.call(this._raw, 0);
  };

  ByteBuffer.prototype.toString = function() {
    var order;
    order = this._order === self.BIG_ENDIAN ? 'big-endian' : 'little-endian';
    return '[ByteBuffer; Order: ' + order + '; Length: ' + this.length + '; Index: ' + this._index + '; Available: ' + this.available + ']';
  };

  ByteBuffer.prototype.toHex = function(spacer) {
    if (spacer == null) {
      spacer = ' ';
    }
    return Array.prototype.map.call(this._raw, function(byte) {
      return ('00' + byte.toString(16).toUpperCase()).slice(-2);
    }).join(spacer);
  };

  ByteBuffer.prototype.toASCII = function(spacer, align, unknown) {
    var prefix;
    if (spacer == null) {
      spacer = ' ';
    }
    if (align == null) {
      align = true;
    }
    if (unknown == null) {
      unknown = '\uFFFD';
    }
    prefix = align ? ' ' : '';
    return Array.prototype.map.call(this._raw, function(byte) {
      if (byte < 0x20 || byte > 0x7E) {
        return prefix + unknown;
      } else {
        return prefix + String.fromCharCode(byte);
      }
    }).join(spacer);
  };

  return ByteBuffer;

}).call(this);

// Expose the class either via AMD or the global object
if(typeof define === 'function' && define.amd) {
    define('ByteBuffer',[],function() {
        return ByteBuffer;
    });
}
else {
    exports.ByteBuffer = ByteBuffer;
}

}(this));
/**
 * @fileoverview gl-matrix - High performance matrix and vector operations for WebGL
 * @author Brandon Jones
 * @author Colin MacKenzie IV
 * @version 1.3.7
 */

/*
 * Copyright (c) 2012 Brandon Jones, Colin MacKenzie IV
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

// Updated to use a modification of the "returnExportsGlobal" pattern from https://github.com/umdjs/umd

(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory(global);
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('glmatrix',[], function () {
            return factory(root);
        });
    } else {
        // Browser globals
        factory(root);
    }
}(this, function (root) {
    

    // Tweak to your liking
    var FLOAT_EPSILON = 0.000001;

    var glMath = {};
    (function() {
        if (typeof(Float32Array) != 'undefined') {
            var y = new Float32Array(1);
            var i = new Int32Array(y.buffer);

            /**
             * Fast way to calculate the inverse square root,
             * see http://jsperf.com/inverse-square-root/5
             *
             * If typed arrays are not available, a slower
             * implementation will be used.
             *
             * @param {Number} number the number
             * @returns {Number} Inverse square root
             */
            glMath.invsqrt = function(number) {
              var x2 = number * 0.5;
              y[0] = number;
              var threehalfs = 1.5;

              i[0] = 0x5f3759df - (i[0] >> 1);

              var number2 = y[0];

              return number2 * (threehalfs - (x2 * number2 * number2));
            };
        } else {
            glMath.invsqrt = function(number) { return 1.0 / Math.sqrt(number); };
        }
    })();

    /**
     * @class System-specific optimal array type
     * @name MatrixArray
     */
    var MatrixArray = null;
    
    // explicitly sets and returns the type of array to use within glMatrix
    function setMatrixArrayType(type) {
        MatrixArray = type;
        return MatrixArray;
    }

    // auto-detects and returns the best type of array to use within glMatrix, falling
    // back to Array if typed arrays are unsupported
    function determineMatrixArrayType() {
        MatrixArray = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
        return MatrixArray;
    }
    
    determineMatrixArrayType();

    /**
     * @class 3 Dimensional Vector
     * @name vec3
     */
    var vec3 = {};
     
    /**
     * Creates a new instance of a vec3 using the default array type
     * Any javascript array-like objects containing at least 3 numeric elements can serve as a vec3
     *
     * @param {vec3} [vec] vec3 containing values to initialize with
     *
     * @returns {vec3} New vec3
     */
    vec3.create = function (vec) {
        var dest = new MatrixArray(3);

        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
            dest[2] = vec[2];
        } else {
            dest[0] = dest[1] = dest[2] = 0;
        }

        return dest;
    };

    /**
     * Creates a new instance of a vec3, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value
     * @param {number} z Z value

     * @returns {vec3} New vec3
     */
    vec3.createFrom = function (x, y, z) {
        var dest = new MatrixArray(3);

        dest[0] = x;
        dest[1] = y;
        dest[2] = z;

        return dest;
    };

    /**
     * Copies the values of one vec3 to another
     *
     * @param {vec3} vec vec3 containing values to copy
     * @param {vec3} dest vec3 receiving copied values
     *
     * @returns {vec3} dest
     */
    vec3.set = function (vec, dest) {
        dest[0] = vec[0];
        dest[1] = vec[1];
        dest[2] = vec[2];

        return dest;
    };

    /**
     * Compares two vectors for equality within a certain margin of error
     *
     * @param {vec3} a First vector
     * @param {vec3} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    vec3.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON
        );
    };

    /**
     * Performs a vector addition
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.add = function (vec, vec2, dest) {
        if (!dest || vec === dest) {
            vec[0] += vec2[0];
            vec[1] += vec2[1];
            vec[2] += vec2[2];
            return vec;
        }

        dest[0] = vec[0] + vec2[0];
        dest[1] = vec[1] + vec2[1];
        dest[2] = vec[2] + vec2[2];
        return dest;
    };

    /**
     * Performs a vector subtraction
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.subtract = function (vec, vec2, dest) {
        if (!dest || vec === dest) {
            vec[0] -= vec2[0];
            vec[1] -= vec2[1];
            vec[2] -= vec2[2];
            return vec;
        }

        dest[0] = vec[0] - vec2[0];
        dest[1] = vec[1] - vec2[1];
        dest[2] = vec[2] - vec2[2];
        return dest;
    };

    /**
     * Performs a vector multiplication
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.multiply = function (vec, vec2, dest) {
        if (!dest || vec === dest) {
            vec[0] *= vec2[0];
            vec[1] *= vec2[1];
            vec[2] *= vec2[2];
            return vec;
        }

        dest[0] = vec[0] * vec2[0];
        dest[1] = vec[1] * vec2[1];
        dest[2] = vec[2] * vec2[2];
        return dest;
    };

    /**
     * Negates the components of a vec3
     *
     * @param {vec3} vec vec3 to negate
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.negate = function (vec, dest) {
        if (!dest) { dest = vec; }

        dest[0] = -vec[0];
        dest[1] = -vec[1];
        dest[2] = -vec[2];
        return dest;
    };

    /**
     * Multiplies the components of a vec3 by a scalar value
     *
     * @param {vec3} vec vec3 to scale
     * @param {number} val Value to scale by
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.scale = function (vec, val, dest) {
        if (!dest || vec === dest) {
            vec[0] *= val;
            vec[1] *= val;
            vec[2] *= val;
            return vec;
        }

        dest[0] = vec[0] * val;
        dest[1] = vec[1] * val;
        dest[2] = vec[2] * val;
        return dest;
    };

    /**
     * Generates a unit vector of the same direction as the provided vec3
     * If vector length is 0, returns [0, 0, 0]
     *
     * @param {vec3} vec vec3 to normalize
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.normalize = function (vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2],
            len = Math.sqrt(x * x + y * y + z * z);

        if (!len) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        } else if (len === 1) {
            dest[0] = x;
            dest[1] = y;
            dest[2] = z;
            return dest;
        }

        len = 1 / len;
        dest[0] = x * len;
        dest[1] = y * len;
        dest[2] = z * len;
        return dest;
    };

    /**
     * Generates the cross product of two vec3s
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.cross = function (vec, vec2, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2],
            x2 = vec2[0], y2 = vec2[1], z2 = vec2[2];

        dest[0] = y * z2 - z * y2;
        dest[1] = z * x2 - x * z2;
        dest[2] = x * y2 - y * x2;
        return dest;
    };

    /**
     * Caclulates the length of a vec3
     *
     * @param {vec3} vec vec3 to calculate length of
     *
     * @returns {number} Length of vec
     */
    vec3.length = function (vec) {
        var x = vec[0], y = vec[1], z = vec[2];
        return Math.sqrt(x * x + y * y + z * z);
    };

    /**
     * Caclulates the squared length of a vec3
     *
     * @param {vec3} vec vec3 to calculate squared length of
     *
     * @returns {number} Squared Length of vec
     */
    vec3.squaredLength = function (vec) {
        var x = vec[0], y = vec[1], z = vec[2];
        return x * x + y * y + z * z;
    };

    /**
     * Caclulates the dot product of two vec3s
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     *
     * @returns {number} Dot product of vec and vec2
     */
    vec3.dot = function (vec, vec2) {
        return vec[0] * vec2[0] + vec[1] * vec2[1] + vec[2] * vec2[2];
    };

    /**
     * Generates a unit vector pointing from one vector to another
     *
     * @param {vec3} vec Origin vec3
     * @param {vec3} vec2 vec3 to point to
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.direction = function (vec, vec2, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0] - vec2[0],
            y = vec[1] - vec2[1],
            z = vec[2] - vec2[2],
            len = Math.sqrt(x * x + y * y + z * z);

        if (!len) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        }

        len = 1 / len;
        dest[0] = x * len;
        dest[1] = y * len;
        dest[2] = z * len;
        return dest;
    };

    /**
     * Performs a linear interpolation between two vec3
     *
     * @param {vec3} vec First vector
     * @param {vec3} vec2 Second vector
     * @param {number} lerp Interpolation amount between the two inputs
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.lerp = function (vec, vec2, lerp, dest) {
        if (!dest) { dest = vec; }

        dest[0] = vec[0] + lerp * (vec2[0] - vec[0]);
        dest[1] = vec[1] + lerp * (vec2[1] - vec[1]);
        dest[2] = vec[2] + lerp * (vec2[2] - vec[2]);

        return dest;
    };

    /**
     * Calculates the euclidian distance between two vec3
     *
     * Params:
     * @param {vec3} vec First vector
     * @param {vec3} vec2 Second vector
     *
     * @returns {number} Distance between vec and vec2
     */
    vec3.dist = function (vec, vec2) {
        var x = vec2[0] - vec[0],
            y = vec2[1] - vec[1],
            z = vec2[2] - vec[2];
            
        return Math.sqrt(x*x + y*y + z*z);
    };

    // Pre-allocated to prevent unecessary garbage collection
    var unprojectMat = null;
    var unprojectVec = new MatrixArray(4);
    /**
     * Projects the specified vec3 from screen space into object space
     * Based on the <a href="http://webcvs.freedesktop.org/mesa/Mesa/src/glu/mesa/project.c?revision=1.4&view=markup">Mesa gluUnProject implementation</a>
     *
     * @param {vec3} vec Screen-space vector to project
     * @param {mat4} view View matrix
     * @param {mat4} proj Projection matrix
     * @param {vec4} viewport Viewport as given to gl.viewport [x, y, width, height]
     * @param {vec3} [dest] vec3 receiving unprojected result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.unproject = function (vec, view, proj, viewport, dest) {
        if (!dest) { dest = vec; }

        if(!unprojectMat) {
            unprojectMat = mat4.create();
        }

        var m = unprojectMat;
        var v = unprojectVec;
        
        v[0] = (vec[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
        v[1] = (vec[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
        v[2] = 2.0 * vec[2] - 1.0;
        v[3] = 1.0;
        
        mat4.multiply(proj, view, m);
        if(!mat4.inverse(m)) { return null; }
        
        mat4.multiplyVec4(m, v);
        if(v[3] === 0.0) { return null; }

        dest[0] = v[0] / v[3];
        dest[1] = v[1] / v[3];
        dest[2] = v[2] / v[3];
        
        return dest;
    };

    var xUnitVec3 = vec3.createFrom(1,0,0);
    var yUnitVec3 = vec3.createFrom(0,1,0);
    var zUnitVec3 = vec3.createFrom(0,0,1);

    var tmpvec3 = vec3.create();
    /**
     * Generates a quaternion of rotation between two given normalized vectors
     *
     * @param {vec3} a Normalized source vector
     * @param {vec3} b Normalized target vector
     * @param {quat4} [dest] quat4 receiving operation result.
     *
     * @returns {quat4} dest if specified, a new quat4 otherwise
     */
    vec3.rotationTo = function (a, b, dest) {
        if (!dest) { dest = quat4.create(); }
        
        var d = vec3.dot(a, b);
        var axis = tmpvec3;
        if (d >= 1.0) {
            quat4.set(identityQuat4, dest);
        } else if (d < (0.000001 - 1.0)) {
            vec3.cross(xUnitVec3, a, axis);
            if (vec3.length(axis) < 0.000001)
                vec3.cross(yUnitVec3, a, axis);
            if (vec3.length(axis) < 0.000001)
                vec3.cross(zUnitVec3, a, axis);
            vec3.normalize(axis);
            quat4.fromAngleAxis(Math.PI, axis, dest);
        } else {
            var s = Math.sqrt((1.0 + d) * 2.0);
            var sInv = 1.0 / s;
            vec3.cross(a, b, axis);
            dest[0] = axis[0] * sInv;
            dest[1] = axis[1] * sInv;
            dest[2] = axis[2] * sInv;
            dest[3] = s * 0.5;
            quat4.normalize(dest);
        }
        if (dest[3] > 1.0) dest[3] = 1.0;
        else if (dest[3] < -1.0) dest[3] = -1.0;
        return dest;
    };

    /**
     * Returns a string representation of a vector
     *
     * @param {vec3} vec Vector to represent as a string
     *
     * @returns {string} String representation of vec
     */
    vec3.str = function (vec) {
        return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ']';
    };

    /**
     * @class 3x3 Matrix
     * @name mat3
     */
    var mat3 = {};

    /**
     * Creates a new instance of a mat3 using the default array type
     * Any javascript array-like object containing at least 9 numeric elements can serve as a mat3
     *
     * @param {mat3} [mat] mat3 containing values to initialize with
     *
     * @returns {mat3} New mat3
     */
    mat3.create = function (mat) {
        var dest = new MatrixArray(9);

        if (mat) {
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];
            dest[8] = mat[8];
        } else {
            dest[0] = dest[1] =
            dest[2] = dest[3] =
            dest[4] = dest[5] =
            dest[6] = dest[7] =
            dest[8] = 0;
        }

        return dest;
    };

    /**
     * Creates a new instance of a mat3, initializing it with the given arguments
     *
     * @param {number} m00
     * @param {number} m01
     * @param {number} m02
     * @param {number} m10
     * @param {number} m11
     * @param {number} m12
     * @param {number} m20
     * @param {number} m21
     * @param {number} m22

     * @returns {mat3} New mat3
     */
    mat3.createFrom = function (m00, m01, m02, m10, m11, m12, m20, m21, m22) {
        var dest = new MatrixArray(9);

        dest[0] = m00;
        dest[1] = m01;
        dest[2] = m02;
        dest[3] = m10;
        dest[4] = m11;
        dest[5] = m12;
        dest[6] = m20;
        dest[7] = m21;
        dest[8] = m22;

        return dest;
    };

    /**
     * Calculates the determinant of a mat3
     *
     * @param {mat3} mat mat3 to calculate determinant of
     *
     * @returns {Number} determinant of mat
     */
    mat3.determinant = function (mat) {
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8];

        return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
    };

    /**
     * Calculates the inverse matrix of a mat3
     *
     * @param {mat3} mat mat3 to calculate inverse of
     * @param {mat3} [dest] mat3 receiving inverse matrix. If not specified result is written to mat
     *
     * @param {mat3} dest is specified, mat otherwise, null if matrix cannot be inverted
     */
    mat3.inverse = function (mat, dest) {
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8],

            b01 = a22 * a11 - a12 * a21,
            b11 = -a22 * a10 + a12 * a20,
            b21 = a21 * a10 - a11 * a20,

            d = a00 * b01 + a01 * b11 + a02 * b21,
            id;

        if (!d) { return null; }
        id = 1 / d;

        if (!dest) { dest = mat3.create(); }

        dest[0] = b01 * id;
        dest[1] = (-a22 * a01 + a02 * a21) * id;
        dest[2] = (a12 * a01 - a02 * a11) * id;
        dest[3] = b11 * id;
        dest[4] = (a22 * a00 - a02 * a20) * id;
        dest[5] = (-a12 * a00 + a02 * a10) * id;
        dest[6] = b21 * id;
        dest[7] = (-a21 * a00 + a01 * a20) * id;
        dest[8] = (a11 * a00 - a01 * a10) * id;
        return dest;
    };
    
    /**
     * Performs a matrix multiplication
     *
     * @param {mat3} mat First operand
     * @param {mat3} mat2 Second operand
     * @param {mat3} [dest] mat3 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat3} dest if specified, mat otherwise
     */
    mat3.multiply = function (mat, mat2, dest) {
        if (!dest) { dest = mat; }
        

        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8],

            b00 = mat2[0], b01 = mat2[1], b02 = mat2[2],
            b10 = mat2[3], b11 = mat2[4], b12 = mat2[5],
            b20 = mat2[6], b21 = mat2[7], b22 = mat2[8];

        dest[0] = b00 * a00 + b01 * a10 + b02 * a20;
        dest[1] = b00 * a01 + b01 * a11 + b02 * a21;
        dest[2] = b00 * a02 + b01 * a12 + b02 * a22;

        dest[3] = b10 * a00 + b11 * a10 + b12 * a20;
        dest[4] = b10 * a01 + b11 * a11 + b12 * a21;
        dest[5] = b10 * a02 + b11 * a12 + b12 * a22;

        dest[6] = b20 * a00 + b21 * a10 + b22 * a20;
        dest[7] = b20 * a01 + b21 * a11 + b22 * a21;
        dest[8] = b20 * a02 + b21 * a12 + b22 * a22;

        return dest;
    };

    /**
     * Transforms the vec2 according to the given mat3.
     *
     * @param {mat3} matrix mat3 to multiply against
     * @param {vec2} vec    the vector to multiply
     * @param {vec2} [dest] an optional receiving vector. If not given, vec is used.
     *
     * @returns {vec2} The multiplication result
     **/
    mat3.multiplyVec2 = function(matrix, vec, dest) {
      if (!dest) dest = vec;
      var x = vec[0], y = vec[1];
      dest[0] = x * matrix[0] + y * matrix[3] + matrix[6];
      dest[1] = x * matrix[1] + y * matrix[4] + matrix[7];
      return dest;
    };

    /**
     * Transforms the vec3 according to the given mat3
     *
     * @param {mat3} matrix mat3 to multiply against
     * @param {vec3} vec    the vector to multiply
     * @param {vec3} [dest] an optional receiving vector. If not given, vec is used.
     *
     * @returns {vec3} The multiplication result
     **/
    mat3.multiplyVec3 = function(matrix, vec, dest) {
      if (!dest) dest = vec;
      var x = vec[0], y = vec[1], z = vec[2];
      dest[0] = x * matrix[0] + y * matrix[3] + z * matrix[6];
      dest[1] = x * matrix[1] + y * matrix[4] + z * matrix[7];
      dest[2] = x * matrix[2] + y * matrix[5] + z * matrix[8];
      
      return dest;
    };

    /**
     * Copies the values of one mat3 to another
     *
     * @param {mat3} mat mat3 containing values to copy
     * @param {mat3} dest mat3 receiving copied values
     *
     * @returns {mat3} dest
     */
    mat3.set = function (mat, dest) {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        return dest;
    };

    /**
     * Compares two matrices for equality within a certain margin of error
     *
     * @param {mat3} a First matrix
     * @param {mat3} b Second matrix
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    mat3.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON &&
            Math.abs(a[4] - b[4]) < FLOAT_EPSILON &&
            Math.abs(a[5] - b[5]) < FLOAT_EPSILON &&
            Math.abs(a[6] - b[6]) < FLOAT_EPSILON &&
            Math.abs(a[7] - b[7]) < FLOAT_EPSILON &&
            Math.abs(a[8] - b[8]) < FLOAT_EPSILON
        );
    };

    /**
     * Sets a mat3 to an identity matrix
     *
     * @param {mat3} dest mat3 to set
     *
     * @returns dest if specified, otherwise a new mat3
     */
    mat3.identity = function (dest) {
        if (!dest) { dest = mat3.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 1;
        dest[5] = 0;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 1;
        return dest;
    };

    /**
     * Transposes a mat3 (flips the values over the diagonal)
     *
     * Params:
     * @param {mat3} mat mat3 to transpose
     * @param {mat3} [dest] mat3 receiving transposed values. If not specified result is written to mat
     *
     * @returns {mat3} dest is specified, mat otherwise
     */
    mat3.transpose = function (mat, dest) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (!dest || mat === dest) {
            var a01 = mat[1], a02 = mat[2],
                a12 = mat[5];

            mat[1] = mat[3];
            mat[2] = mat[6];
            mat[3] = a01;
            mat[5] = mat[7];
            mat[6] = a02;
            mat[7] = a12;
            return mat;
        }

        dest[0] = mat[0];
        dest[1] = mat[3];
        dest[2] = mat[6];
        dest[3] = mat[1];
        dest[4] = mat[4];
        dest[5] = mat[7];
        dest[6] = mat[2];
        dest[7] = mat[5];
        dest[8] = mat[8];
        return dest;
    };

    /**
     * Copies the elements of a mat3 into the upper 3x3 elements of a mat4
     *
     * @param {mat3} mat mat3 containing values to copy
     * @param {mat4} [dest] mat4 receiving copied values
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat3.toMat4 = function (mat, dest) {
        if (!dest) { dest = mat4.create(); }

        dest[15] = 1;
        dest[14] = 0;
        dest[13] = 0;
        dest[12] = 0;

        dest[11] = 0;
        dest[10] = mat[8];
        dest[9] = mat[7];
        dest[8] = mat[6];

        dest[7] = 0;
        dest[6] = mat[5];
        dest[5] = mat[4];
        dest[4] = mat[3];

        dest[3] = 0;
        dest[2] = mat[2];
        dest[1] = mat[1];
        dest[0] = mat[0];

        return dest;
    };

    /**
     * Returns a string representation of a mat3
     *
     * @param {mat3} mat mat3 to represent as a string
     *
     * @param {string} String representation of mat
     */
    mat3.str = function (mat) {
        return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] +
            ', ' + mat[3] + ', ' + mat[4] + ', ' + mat[5] +
            ', ' + mat[6] + ', ' + mat[7] + ', ' + mat[8] + ']';
    };

    /**
     * @class 4x4 Matrix
     * @name mat4
     */
    var mat4 = {};

    /**
     * Creates a new instance of a mat4 using the default array type
     * Any javascript array-like object containing at least 16 numeric elements can serve as a mat4
     *
     * @param {mat4} [mat] mat4 containing values to initialize with
     *
     * @returns {mat4} New mat4
     */
    mat4.create = function (mat) {
        var dest = new MatrixArray(16);

        if (mat) {
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];
            dest[8] = mat[8];
            dest[9] = mat[9];
            dest[10] = mat[10];
            dest[11] = mat[11];
            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        return dest;
    };

    /**
     * Creates a new instance of a mat4, initializing it with the given arguments
     *
     * @param {number} m00
     * @param {number} m01
     * @param {number} m02
     * @param {number} m03
     * @param {number} m10
     * @param {number} m11
     * @param {number} m12
     * @param {number} m13
     * @param {number} m20
     * @param {number} m21
     * @param {number} m22
     * @param {number} m23
     * @param {number} m30
     * @param {number} m31
     * @param {number} m32
     * @param {number} m33

     * @returns {mat4} New mat4
     */
    mat4.createFrom = function (m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
        var dest = new MatrixArray(16);

        dest[0] = m00;
        dest[1] = m01;
        dest[2] = m02;
        dest[3] = m03;
        dest[4] = m10;
        dest[5] = m11;
        dest[6] = m12;
        dest[7] = m13;
        dest[8] = m20;
        dest[9] = m21;
        dest[10] = m22;
        dest[11] = m23;
        dest[12] = m30;
        dest[13] = m31;
        dest[14] = m32;
        dest[15] = m33;

        return dest;
    };

    /**
     * Copies the values of one mat4 to another
     *
     * @param {mat4} mat mat4 containing values to copy
     * @param {mat4} dest mat4 receiving copied values
     *
     * @returns {mat4} dest
     */
    mat4.set = function (mat, dest) {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        dest[9] = mat[9];
        dest[10] = mat[10];
        dest[11] = mat[11];
        dest[12] = mat[12];
        dest[13] = mat[13];
        dest[14] = mat[14];
        dest[15] = mat[15];
        return dest;
    };

    /**
     * Compares two matrices for equality within a certain margin of error
     *
     * @param {mat4} a First matrix
     * @param {mat4} b Second matrix
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    mat4.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON &&
            Math.abs(a[4] - b[4]) < FLOAT_EPSILON &&
            Math.abs(a[5] - b[5]) < FLOAT_EPSILON &&
            Math.abs(a[6] - b[6]) < FLOAT_EPSILON &&
            Math.abs(a[7] - b[7]) < FLOAT_EPSILON &&
            Math.abs(a[8] - b[8]) < FLOAT_EPSILON &&
            Math.abs(a[9] - b[9]) < FLOAT_EPSILON &&
            Math.abs(a[10] - b[10]) < FLOAT_EPSILON &&
            Math.abs(a[11] - b[11]) < FLOAT_EPSILON &&
            Math.abs(a[12] - b[12]) < FLOAT_EPSILON &&
            Math.abs(a[13] - b[13]) < FLOAT_EPSILON &&
            Math.abs(a[14] - b[14]) < FLOAT_EPSILON &&
            Math.abs(a[15] - b[15]) < FLOAT_EPSILON
        );
    };

    /**
     * Sets a mat4 to an identity matrix
     *
     * @param {mat4} dest mat4 to set
     *
     * @returns {mat4} dest
     */
    mat4.identity = function (dest) {
        if (!dest) { dest = mat4.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = 1;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 0;
        dest[9] = 0;
        dest[10] = 1;
        dest[11] = 0;
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;
        return dest;
    };

    /**
     * Transposes a mat4 (flips the values over the diagonal)
     *
     * @param {mat4} mat mat4 to transpose
     * @param {mat4} [dest] mat4 receiving transposed values. If not specified result is written to mat
     *
     * @param {mat4} dest is specified, mat otherwise
     */
    mat4.transpose = function (mat, dest) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (!dest || mat === dest) {
            var a01 = mat[1], a02 = mat[2], a03 = mat[3],
                a12 = mat[6], a13 = mat[7],
                a23 = mat[11];

            mat[1] = mat[4];
            mat[2] = mat[8];
            mat[3] = mat[12];
            mat[4] = a01;
            mat[6] = mat[9];
            mat[7] = mat[13];
            mat[8] = a02;
            mat[9] = a12;
            mat[11] = mat[14];
            mat[12] = a03;
            mat[13] = a13;
            mat[14] = a23;
            return mat;
        }

        dest[0] = mat[0];
        dest[1] = mat[4];
        dest[2] = mat[8];
        dest[3] = mat[12];
        dest[4] = mat[1];
        dest[5] = mat[5];
        dest[6] = mat[9];
        dest[7] = mat[13];
        dest[8] = mat[2];
        dest[9] = mat[6];
        dest[10] = mat[10];
        dest[11] = mat[14];
        dest[12] = mat[3];
        dest[13] = mat[7];
        dest[14] = mat[11];
        dest[15] = mat[15];
        return dest;
    };

    /**
     * Calculates the determinant of a mat4
     *
     * @param {mat4} mat mat4 to calculate determinant of
     *
     * @returns {number} determinant of mat
     */
    mat4.determinant = function (mat) {
        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
            a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
            a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
            a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

        return (a30 * a21 * a12 * a03 - a20 * a31 * a12 * a03 - a30 * a11 * a22 * a03 + a10 * a31 * a22 * a03 +
                a20 * a11 * a32 * a03 - a10 * a21 * a32 * a03 - a30 * a21 * a02 * a13 + a20 * a31 * a02 * a13 +
                a30 * a01 * a22 * a13 - a00 * a31 * a22 * a13 - a20 * a01 * a32 * a13 + a00 * a21 * a32 * a13 +
                a30 * a11 * a02 * a23 - a10 * a31 * a02 * a23 - a30 * a01 * a12 * a23 + a00 * a31 * a12 * a23 +
                a10 * a01 * a32 * a23 - a00 * a11 * a32 * a23 - a20 * a11 * a02 * a33 + a10 * a21 * a02 * a33 +
                a20 * a01 * a12 * a33 - a00 * a21 * a12 * a33 - a10 * a01 * a22 * a33 + a00 * a11 * a22 * a33);
    };

    /**
     * Calculates the inverse matrix of a mat4
     *
     * @param {mat4} mat mat4 to calculate inverse of
     * @param {mat4} [dest] mat4 receiving inverse matrix. If not specified result is written to mat
     *
     * @param {mat4} dest is specified, mat otherwise, null if matrix cannot be inverted
     */
    mat4.inverse = function (mat, dest) {
        if (!dest) { dest = mat; }

        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
            a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
            a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
            a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

            b00 = a00 * a11 - a01 * a10,
            b01 = a00 * a12 - a02 * a10,
            b02 = a00 * a13 - a03 * a10,
            b03 = a01 * a12 - a02 * a11,
            b04 = a01 * a13 - a03 * a11,
            b05 = a02 * a13 - a03 * a12,
            b06 = a20 * a31 - a21 * a30,
            b07 = a20 * a32 - a22 * a30,
            b08 = a20 * a33 - a23 * a30,
            b09 = a21 * a32 - a22 * a31,
            b10 = a21 * a33 - a23 * a31,
            b11 = a22 * a33 - a23 * a32,

            d = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06),
            invDet;

            // Calculate the determinant
            if (!d) { return null; }
            invDet = 1 / d;

        dest[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
        dest[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
        dest[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
        dest[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
        dest[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
        dest[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
        dest[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
        dest[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
        dest[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
        dest[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
        dest[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
        dest[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
        dest[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
        dest[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
        dest[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
        dest[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;

        return dest;
    };

    /**
     * Copies the upper 3x3 elements of a mat4 into another mat4
     *
     * @param {mat4} mat mat4 containing values to copy
     * @param {mat4} [dest] mat4 receiving copied values
     *
     * @returns {mat4} dest is specified, a new mat4 otherwise
     */
    mat4.toRotationMat = function (mat, dest) {
        if (!dest) { dest = mat4.create(); }

        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        dest[9] = mat[9];
        dest[10] = mat[10];
        dest[11] = mat[11];
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;

        return dest;
    };

    /**
     * Copies the upper 3x3 elements of a mat4 into a mat3
     *
     * @param {mat4} mat mat4 containing values to copy
     * @param {mat3} [dest] mat3 receiving copied values
     *
     * @returns {mat3} dest is specified, a new mat3 otherwise
     */
    mat4.toMat3 = function (mat, dest) {
        if (!dest) { dest = mat3.create(); }

        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[4];
        dest[4] = mat[5];
        dest[5] = mat[6];
        dest[6] = mat[8];
        dest[7] = mat[9];
        dest[8] = mat[10];

        return dest;
    };

    /**
     * Calculates the inverse of the upper 3x3 elements of a mat4 and copies the result into a mat3
     * The resulting matrix is useful for calculating transformed normals
     *
     * Params:
     * @param {mat4} mat mat4 containing values to invert and copy
     * @param {mat3} [dest] mat3 receiving values
     *
     * @returns {mat3} dest is specified, a new mat3 otherwise, null if the matrix cannot be inverted
     */
    mat4.toInverseMat3 = function (mat, dest) {
        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[4], a11 = mat[5], a12 = mat[6],
            a20 = mat[8], a21 = mat[9], a22 = mat[10],

            b01 = a22 * a11 - a12 * a21,
            b11 = -a22 * a10 + a12 * a20,
            b21 = a21 * a10 - a11 * a20,

            d = a00 * b01 + a01 * b11 + a02 * b21,
            id;

        if (!d) { return null; }
        id = 1 / d;

        if (!dest) { dest = mat3.create(); }

        dest[0] = b01 * id;
        dest[1] = (-a22 * a01 + a02 * a21) * id;
        dest[2] = (a12 * a01 - a02 * a11) * id;
        dest[3] = b11 * id;
        dest[4] = (a22 * a00 - a02 * a20) * id;
        dest[5] = (-a12 * a00 + a02 * a10) * id;
        dest[6] = b21 * id;
        dest[7] = (-a21 * a00 + a01 * a20) * id;
        dest[8] = (a11 * a00 - a01 * a10) * id;

        return dest;
    };

    /**
     * Performs a matrix multiplication
     *
     * @param {mat4} mat First operand
     * @param {mat4} mat2 Second operand
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.multiply = function (mat, mat2, dest) {
        if (!dest) { dest = mat; }

        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[ 0], a01 = mat[ 1], a02 = mat[ 2], a03 = mat[3];
        var a10 = mat[ 4], a11 = mat[ 5], a12 = mat[ 6], a13 = mat[7];
        var a20 = mat[ 8], a21 = mat[ 9], a22 = mat[10], a23 = mat[11];
        var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

        // Cache only the current line of the second matrix
        var b0  = mat2[0], b1 = mat2[1], b2 = mat2[2], b3 = mat2[3];  
        dest[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = mat2[4];
        b1 = mat2[5];
        b2 = mat2[6];
        b3 = mat2[7];
        dest[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = mat2[8];
        b1 = mat2[9];
        b2 = mat2[10];
        b3 = mat2[11];
        dest[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = mat2[12];
        b1 = mat2[13];
        b2 = mat2[14];
        b3 = mat2[15];
        dest[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        return dest;
    };

    /**
     * Transforms a vec3 with the given matrix
     * 4th vector component is implicitly '1'
     *
     * @param {mat4} mat mat4 to transform the vector with
     * @param {vec3} vec vec3 to transform
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    mat4.multiplyVec3 = function (mat, vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2];

        dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
        dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
        dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];

        return dest;
    };

    /**
     * Transforms a vec4 with the given matrix
     *
     * @param {mat4} mat mat4 to transform the vector with
     * @param {vec4} vec vec4 to transform
     * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec4} dest if specified, vec otherwise
     */
    mat4.multiplyVec4 = function (mat, vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2], w = vec[3];

        dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12] * w;
        dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13] * w;
        dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14] * w;
        dest[3] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15] * w;

        return dest;
    };

    /**
     * Translates a matrix by the given vector
     *
     * @param {mat4} mat mat4 to translate
     * @param {vec3} vec vec3 specifying the translation
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.translate = function (mat, vec, dest) {
        var x = vec[0], y = vec[1], z = vec[2],
            a00, a01, a02, a03,
            a10, a11, a12, a13,
            a20, a21, a22, a23;

        if (!dest || mat === dest) {
            mat[12] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
            mat[13] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
            mat[14] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
            mat[15] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];
            return mat;
        }

        a00 = mat[0]; a01 = mat[1]; a02 = mat[2]; a03 = mat[3];
        a10 = mat[4]; a11 = mat[5]; a12 = mat[6]; a13 = mat[7];
        a20 = mat[8]; a21 = mat[9]; a22 = mat[10]; a23 = mat[11];

        dest[0] = a00; dest[1] = a01; dest[2] = a02; dest[3] = a03;
        dest[4] = a10; dest[5] = a11; dest[6] = a12; dest[7] = a13;
        dest[8] = a20; dest[9] = a21; dest[10] = a22; dest[11] = a23;

        dest[12] = a00 * x + a10 * y + a20 * z + mat[12];
        dest[13] = a01 * x + a11 * y + a21 * z + mat[13];
        dest[14] = a02 * x + a12 * y + a22 * z + mat[14];
        dest[15] = a03 * x + a13 * y + a23 * z + mat[15];
        return dest;
    };

    /**
     * Scales a matrix by the given vector
     *
     * @param {mat4} mat mat4 to scale
     * @param {vec3} vec vec3 specifying the scale for each axis
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @param {mat4} dest if specified, mat otherwise
     */
    mat4.scale = function (mat, vec, dest) {
        var x = vec[0], y = vec[1], z = vec[2];

        if (!dest || mat === dest) {
            mat[0] *= x;
            mat[1] *= x;
            mat[2] *= x;
            mat[3] *= x;
            mat[4] *= y;
            mat[5] *= y;
            mat[6] *= y;
            mat[7] *= y;
            mat[8] *= z;
            mat[9] *= z;
            mat[10] *= z;
            mat[11] *= z;
            return mat;
        }

        dest[0] = mat[0] * x;
        dest[1] = mat[1] * x;
        dest[2] = mat[2] * x;
        dest[3] = mat[3] * x;
        dest[4] = mat[4] * y;
        dest[5] = mat[5] * y;
        dest[6] = mat[6] * y;
        dest[7] = mat[7] * y;
        dest[8] = mat[8] * z;
        dest[9] = mat[9] * z;
        dest[10] = mat[10] * z;
        dest[11] = mat[11] * z;
        dest[12] = mat[12];
        dest[13] = mat[13];
        dest[14] = mat[14];
        dest[15] = mat[15];
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the specified axis
     * If rotating around a primary axis (X,Y,Z) one of the specialized rotation functions should be used instead for performance
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {vec3} axis vec3 representing the axis to rotate around
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotate = function (mat, angle, axis, dest) {
        var x = axis[0], y = axis[1], z = axis[2],
            len = Math.sqrt(x * x + y * y + z * z),
            s, c, t,
            a00, a01, a02, a03,
            a10, a11, a12, a13,
            a20, a21, a22, a23,
            b00, b01, b02,
            b10, b11, b12,
            b20, b21, b22;

        if (!len) { return null; }
        if (len !== 1) {
            len = 1 / len;
            x *= len;
            y *= len;
            z *= len;
        }

        s = Math.sin(angle);
        c = Math.cos(angle);
        t = 1 - c;

        a00 = mat[0]; a01 = mat[1]; a02 = mat[2]; a03 = mat[3];
        a10 = mat[4]; a11 = mat[5]; a12 = mat[6]; a13 = mat[7];
        a20 = mat[8]; a21 = mat[9]; a22 = mat[10]; a23 = mat[11];

        // Construct the elements of the rotation matrix
        b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
        b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
        b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform rotation-specific matrix multiplication
        dest[0] = a00 * b00 + a10 * b01 + a20 * b02;
        dest[1] = a01 * b00 + a11 * b01 + a21 * b02;
        dest[2] = a02 * b00 + a12 * b01 + a22 * b02;
        dest[3] = a03 * b00 + a13 * b01 + a23 * b02;

        dest[4] = a00 * b10 + a10 * b11 + a20 * b12;
        dest[5] = a01 * b10 + a11 * b11 + a21 * b12;
        dest[6] = a02 * b10 + a12 * b11 + a22 * b12;
        dest[7] = a03 * b10 + a13 * b11 + a23 * b12;

        dest[8] = a00 * b20 + a10 * b21 + a20 * b22;
        dest[9] = a01 * b20 + a11 * b21 + a21 * b22;
        dest[10] = a02 * b20 + a12 * b21 + a22 * b22;
        dest[11] = a03 * b20 + a13 * b21 + a23 * b22;
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the X axis
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotateX = function (mat, angle, dest) {
        var s = Math.sin(angle),
            c = Math.cos(angle),
            a10 = mat[4],
            a11 = mat[5],
            a12 = mat[6],
            a13 = mat[7],
            a20 = mat[8],
            a21 = mat[9],
            a22 = mat[10],
            a23 = mat[11];

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];

            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform axis-specific matrix multiplication
        dest[4] = a10 * c + a20 * s;
        dest[5] = a11 * c + a21 * s;
        dest[6] = a12 * c + a22 * s;
        dest[7] = a13 * c + a23 * s;

        dest[8] = a10 * -s + a20 * c;
        dest[9] = a11 * -s + a21 * c;
        dest[10] = a12 * -s + a22 * c;
        dest[11] = a13 * -s + a23 * c;
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the Y axis
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotateY = function (mat, angle, dest) {
        var s = Math.sin(angle),
            c = Math.cos(angle),
            a00 = mat[0],
            a01 = mat[1],
            a02 = mat[2],
            a03 = mat[3],
            a20 = mat[8],
            a21 = mat[9],
            a22 = mat[10],
            a23 = mat[11];

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];

            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform axis-specific matrix multiplication
        dest[0] = a00 * c + a20 * -s;
        dest[1] = a01 * c + a21 * -s;
        dest[2] = a02 * c + a22 * -s;
        dest[3] = a03 * c + a23 * -s;

        dest[8] = a00 * s + a20 * c;
        dest[9] = a01 * s + a21 * c;
        dest[10] = a02 * s + a22 * c;
        dest[11] = a03 * s + a23 * c;
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the Z axis
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotateZ = function (mat, angle, dest) {
        var s = Math.sin(angle),
            c = Math.cos(angle),
            a00 = mat[0],
            a01 = mat[1],
            a02 = mat[2],
            a03 = mat[3],
            a10 = mat[4],
            a11 = mat[5],
            a12 = mat[6],
            a13 = mat[7];

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
            dest[8] = mat[8];
            dest[9] = mat[9];
            dest[10] = mat[10];
            dest[11] = mat[11];

            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform axis-specific matrix multiplication
        dest[0] = a00 * c + a10 * s;
        dest[1] = a01 * c + a11 * s;
        dest[2] = a02 * c + a12 * s;
        dest[3] = a03 * c + a13 * s;

        dest[4] = a00 * -s + a10 * c;
        dest[5] = a01 * -s + a11 * c;
        dest[6] = a02 * -s + a12 * c;
        dest[7] = a03 * -s + a13 * c;

        return dest;
    };

    /**
     * Generates a frustum matrix with the given bounds
     *
     * @param {number} left Left bound of the frustum
     * @param {number} right Right bound of the frustum
     * @param {number} bottom Bottom bound of the frustum
     * @param {number} top Top bound of the frustum
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.frustum = function (left, right, bottom, top, near, far, dest) {
        if (!dest) { dest = mat4.create(); }
        var rl = (right - left),
            tb = (top - bottom),
            fn = (far - near);
        dest[0] = (near * 2) / rl;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = (near * 2) / tb;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = (right + left) / rl;
        dest[9] = (top + bottom) / tb;
        dest[10] = -(far + near) / fn;
        dest[11] = -1;
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = -(far * near * 2) / fn;
        dest[15] = 0;
        return dest;
    };

    /**
     * Generates a perspective projection matrix with the given bounds
     *
     * @param {number} fovy Vertical field of view
     * @param {number} aspect Aspect ratio. typically viewport width/height
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.perspective = function (fovy, aspect, near, far, dest) {
        var top = near * Math.tan(fovy * Math.PI / 360.0),
            right = top * aspect;
        return mat4.frustum(-right, right, -top, top, near, far, dest);
    };

    /**
     * Generates a orthogonal projection matrix with the given bounds
     *
     * @param {number} left Left bound of the frustum
     * @param {number} right Right bound of the frustum
     * @param {number} bottom Bottom bound of the frustum
     * @param {number} top Top bound of the frustum
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.ortho = function (left, right, bottom, top, near, far, dest) {
        if (!dest) { dest = mat4.create(); }
        var rl = (right - left),
            tb = (top - bottom),
            fn = (far - near);
        dest[0] = 2 / rl;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = 2 / tb;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 0;
        dest[9] = 0;
        dest[10] = -2 / fn;
        dest[11] = 0;
        dest[12] = -(left + right) / rl;
        dest[13] = -(top + bottom) / tb;
        dest[14] = -(far + near) / fn;
        dest[15] = 1;
        return dest;
    };

    /**
     * Generates a look-at matrix with the given eye position, focal point, and up axis
     *
     * @param {vec3} eye Position of the viewer
     * @param {vec3} center Point the viewer is looking at
     * @param {vec3} up vec3 pointing "up"
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.lookAt = function (eye, center, up, dest) {
        if (!dest) { dest = mat4.create(); }

        var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
            eyex = eye[0],
            eyey = eye[1],
            eyez = eye[2],
            upx = up[0],
            upy = up[1],
            upz = up[2],
            centerx = center[0],
            centery = center[1],
            centerz = center[2];

        if (eyex === centerx && eyey === centery && eyez === centerz) {
            return mat4.identity(dest);
        }

        //vec3.direction(eye, center, z);
        z0 = eyex - centerx;
        z1 = eyey - centery;
        z2 = eyez - centerz;

        // normalize (no check needed for 0 because of early return)
        len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
        z0 *= len;
        z1 *= len;
        z2 *= len;

        //vec3.normalize(vec3.cross(up, z, x));
        x0 = upy * z2 - upz * z1;
        x1 = upz * z0 - upx * z2;
        x2 = upx * z1 - upy * z0;
        len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
        if (!len) {
            x0 = 0;
            x1 = 0;
            x2 = 0;
        } else {
            len = 1 / len;
            x0 *= len;
            x1 *= len;
            x2 *= len;
        }

        //vec3.normalize(vec3.cross(z, x, y));
        y0 = z1 * x2 - z2 * x1;
        y1 = z2 * x0 - z0 * x2;
        y2 = z0 * x1 - z1 * x0;

        len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
        if (!len) {
            y0 = 0;
            y1 = 0;
            y2 = 0;
        } else {
            len = 1 / len;
            y0 *= len;
            y1 *= len;
            y2 *= len;
        }

        dest[0] = x0;
        dest[1] = y0;
        dest[2] = z0;
        dest[3] = 0;
        dest[4] = x1;
        dest[5] = y1;
        dest[6] = z1;
        dest[7] = 0;
        dest[8] = x2;
        dest[9] = y2;
        dest[10] = z2;
        dest[11] = 0;
        dest[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
        dest[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
        dest[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
        dest[15] = 1;

        return dest;
    };

    /**
     * Creates a matrix from a quaternion rotation and vector translation
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.translate(dest, vec);
     *     var quatMat = mat4.create();
     *     quat4.toMat4(quat, quatMat);
     *     mat4.multiply(dest, quatMat);
     *
     * @param {quat4} quat Rotation quaternion
     * @param {vec3} vec Translation vector
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to a new mat4
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.fromRotationTranslation = function (quat, vec, dest) {
        if (!dest) { dest = mat4.create(); }

        // Quaternion math
        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;
        dest[3] = 0;
        dest[4] = xy - wz;
        dest[5] = 1 - (xx + zz);
        dest[6] = yz + wx;
        dest[7] = 0;
        dest[8] = xz + wy;
        dest[9] = yz - wx;
        dest[10] = 1 - (xx + yy);
        dest[11] = 0;
        dest[12] = vec[0];
        dest[13] = vec[1];
        dest[14] = vec[2];
        dest[15] = 1;
        
        return dest;
    };

    /**
     * Returns a string representation of a mat4
     *
     * @param {mat4} mat mat4 to represent as a string
     *
     * @returns {string} String representation of mat
     */
    mat4.str = function (mat) {
        return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] +
            ', ' + mat[4] + ', ' + mat[5] + ', ' + mat[6] + ', ' + mat[7] +
            ', ' + mat[8] + ', ' + mat[9] + ', ' + mat[10] + ', ' + mat[11] +
            ', ' + mat[12] + ', ' + mat[13] + ', ' + mat[14] + ', ' + mat[15] + ']';
    };

    /**
     * @class Quaternion
     * @name quat4
     */
    var quat4 = {};

    /**
     * Creates a new instance of a quat4 using the default array type
     * Any javascript array containing at least 4 numeric elements can serve as a quat4
     *
     * @param {quat4} [quat] quat4 containing values to initialize with
     *
     * @returns {quat4} New quat4
     */
    quat4.create = function (quat) {
        var dest = new MatrixArray(4);

        if (quat) {
            dest[0] = quat[0];
            dest[1] = quat[1];
            dest[2] = quat[2];
            dest[3] = quat[3];
        } else {
            dest[0] = dest[1] = dest[2] = dest[3] = 0;
        }

        return dest;
    };

    /**
     * Creates a new instance of a quat4, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value
     * @param {number} z Z value
     * @param {number} w W value

     * @returns {quat4} New quat4
     */
    quat4.createFrom = function (x, y, z, w) {
        var dest = new MatrixArray(4);

        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = w;

        return dest;
    };

    /**
     * Copies the values of one quat4 to another
     *
     * @param {quat4} quat quat4 containing values to copy
     * @param {quat4} dest quat4 receiving copied values
     *
     * @returns {quat4} dest
     */
    quat4.set = function (quat, dest) {
        dest[0] = quat[0];
        dest[1] = quat[1];
        dest[2] = quat[2];
        dest[3] = quat[3];

        return dest;
    };

    /**
     * Compares two quaternions for equality within a certain margin of error
     *
     * @param {quat4} a First vector
     * @param {quat4} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    quat4.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON
        );
    };

    /**
     * Creates a new identity Quat4
     *
     * @param {quat4} [dest] quat4 receiving copied values
     *
     * @returns {quat4} dest is specified, new quat4 otherwise
     */
    quat4.identity = function (dest) {
        if (!dest) { dest = quat4.create(); }
        dest[0] = 0;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 1;
        return dest;
    };

    var identityQuat4 = quat4.identity();

    /**
     * Calculates the W component of a quat4 from the X, Y, and Z components.
     * Assumes that quaternion is 1 unit in length.
     * Any existing W component will be ignored.
     *
     * @param {quat4} quat quat4 to calculate W component of
     * @param {quat4} [dest] quat4 receiving calculated values. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.calculateW = function (quat, dest) {
        var x = quat[0], y = quat[1], z = quat[2];

        if (!dest || quat === dest) {
            quat[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
            return quat;
        }
        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
        return dest;
    };

    /**
     * Calculates the dot product of two quaternions
     *
     * @param {quat4} quat First operand
     * @param {quat4} quat2 Second operand
     *
     * @return {number} Dot product of quat and quat2
     */
    quat4.dot = function(quat, quat2){
        return quat[0]*quat2[0] + quat[1]*quat2[1] + quat[2]*quat2[2] + quat[3]*quat2[3];
    };

    /**
     * Calculates the inverse of a quat4
     *
     * @param {quat4} quat quat4 to calculate inverse of
     * @param {quat4} [dest] quat4 receiving inverse values. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.inverse = function(quat, dest) {
        var q0 = quat[0], q1 = quat[1], q2 = quat[2], q3 = quat[3],
            dot = q0*q0 + q1*q1 + q2*q2 + q3*q3,
            invDot = dot ? 1.0/dot : 0;
        
        // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0
        
        if(!dest || quat === dest) {
            quat[0] *= -invDot;
            quat[1] *= -invDot;
            quat[2] *= -invDot;
            quat[3] *= invDot;
            return quat;
        }
        dest[0] = -quat[0]*invDot;
        dest[1] = -quat[1]*invDot;
        dest[2] = -quat[2]*invDot;
        dest[3] = quat[3]*invDot;
        return dest;
    };


    /**
     * Calculates the conjugate of a quat4
     * If the quaternion is normalized, this function is faster than quat4.inverse and produces the same result.
     *
     * @param {quat4} quat quat4 to calculate conjugate of
     * @param {quat4} [dest] quat4 receiving conjugate values. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.conjugate = function (quat, dest) {
        if (!dest || quat === dest) {
            quat[0] *= -1;
            quat[1] *= -1;
            quat[2] *= -1;
            return quat;
        }
        dest[0] = -quat[0];
        dest[1] = -quat[1];
        dest[2] = -quat[2];
        dest[3] = quat[3];
        return dest;
    };

    /**
     * Calculates the length of a quat4
     *
     * Params:
     * @param {quat4} quat quat4 to calculate length of
     *
     * @returns Length of quat
     */
    quat4.length = function (quat) {
        var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
        return Math.sqrt(x * x + y * y + z * z + w * w);
    };

    /**
     * Generates a unit quaternion of the same direction as the provided quat4
     * If quaternion length is 0, returns [0, 0, 0, 0]
     *
     * @param {quat4} quat quat4 to normalize
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.normalize = function (quat, dest) {
        if (!dest) { dest = quat; }

        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            len = Math.sqrt(x * x + y * y + z * z + w * w);
        if (len === 0) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;
            return dest;
        }
        len = 1 / len;
        dest[0] = x * len;
        dest[1] = y * len;
        dest[2] = z * len;
        dest[3] = w * len;

        return dest;
    };

    /**
     * Performs quaternion addition
     *
     * @param {quat4} quat First operand
     * @param {quat4} quat2 Second operand
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.add = function (quat, quat2, dest) {
        if(!dest || quat === dest) {
            quat[0] += quat2[0];
            quat[1] += quat2[1];
            quat[2] += quat2[2];
            quat[3] += quat2[3];
            return quat;
        }
        dest[0] = quat[0]+quat2[0];
        dest[1] = quat[1]+quat2[1];
        dest[2] = quat[2]+quat2[2];
        dest[3] = quat[3]+quat2[3];
        return dest;
    };

    /**
     * Performs a quaternion multiplication
     *
     * @param {quat4} quat First operand
     * @param {quat4} quat2 Second operand
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.multiply = function (quat, quat2, dest) {
        if (!dest) { dest = quat; }

        var qax = quat[0], qay = quat[1], qaz = quat[2], qaw = quat[3],
            qbx = quat2[0], qby = quat2[1], qbz = quat2[2], qbw = quat2[3];

        dest[0] = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
        dest[1] = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
        dest[2] = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
        dest[3] = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

        return dest;
    };

    /**
     * Transforms a vec3 with the given quaternion
     *
     * @param {quat4} quat quat4 to transform the vector with
     * @param {vec3} vec vec3 to transform
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns dest if specified, vec otherwise
     */
    quat4.multiplyVec3 = function (quat, vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2],
            qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3],

            // calculate quat * vec
            ix = qw * x + qy * z - qz * y,
            iy = qw * y + qz * x - qx * z,
            iz = qw * z + qx * y - qy * x,
            iw = -qx * x - qy * y - qz * z;

        // calculate result * inverse quat
        dest[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        dest[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        dest[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;

        return dest;
    };

    /**
     * Multiplies the components of a quaternion by a scalar value
     *
     * @param {quat4} quat to scale
     * @param {number} val Value to scale by
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.scale = function (quat, val, dest) {
        if(!dest || quat === dest) {
            quat[0] *= val;
            quat[1] *= val;
            quat[2] *= val;
            quat[3] *= val;
            return quat;
        }
        dest[0] = quat[0]*val;
        dest[1] = quat[1]*val;
        dest[2] = quat[2]*val;
        dest[3] = quat[3]*val;
        return dest;
    };

    /**
     * Calculates a 3x3 matrix from the given quat4
     *
     * @param {quat4} quat quat4 to create matrix from
     * @param {mat3} [dest] mat3 receiving operation result
     *
     * @returns {mat3} dest if specified, a new mat3 otherwise
     */
    quat4.toMat3 = function (quat, dest) {
        if (!dest) { dest = mat3.create(); }

        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;

        dest[3] = xy - wz;
        dest[4] = 1 - (xx + zz);
        dest[5] = yz + wx;

        dest[6] = xz + wy;
        dest[7] = yz - wx;
        dest[8] = 1 - (xx + yy);

        return dest;
    };

    /**
     * Calculates a 4x4 matrix from the given quat4
     *
     * @param {quat4} quat quat4 to create matrix from
     * @param {mat4} [dest] mat4 receiving operation result
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    quat4.toMat4 = function (quat, dest) {
        if (!dest) { dest = mat4.create(); }

        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;
        dest[3] = 0;

        dest[4] = xy - wz;
        dest[5] = 1 - (xx + zz);
        dest[6] = yz + wx;
        dest[7] = 0;

        dest[8] = xz + wy;
        dest[9] = yz - wx;
        dest[10] = 1 - (xx + yy);
        dest[11] = 0;

        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;

        return dest;
    };

    /**
     * Performs a spherical linear interpolation between two quat4
     *
     * @param {quat4} quat First quaternion
     * @param {quat4} quat2 Second quaternion
     * @param {number} slerp Interpolation amount between the two inputs
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.slerp = function (quat, quat2, slerp, dest) {
        if (!dest) { dest = quat; }

        var cosHalfTheta = quat[0] * quat2[0] + quat[1] * quat2[1] + quat[2] * quat2[2] + quat[3] * quat2[3],
            halfTheta,
            sinHalfTheta,
            ratioA,
            ratioB;

        if (Math.abs(cosHalfTheta) >= 1.0) {
            if (dest !== quat) {
                dest[0] = quat[0];
                dest[1] = quat[1];
                dest[2] = quat[2];
                dest[3] = quat[3];
            }
            return dest;
        }

        halfTheta = Math.acos(cosHalfTheta);
        sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

        if (Math.abs(sinHalfTheta) < 0.001) {
            dest[0] = (quat[0] * 0.5 + quat2[0] * 0.5);
            dest[1] = (quat[1] * 0.5 + quat2[1] * 0.5);
            dest[2] = (quat[2] * 0.5 + quat2[2] * 0.5);
            dest[3] = (quat[3] * 0.5 + quat2[3] * 0.5);
            return dest;
        }

        ratioA = Math.sin((1 - slerp) * halfTheta) / sinHalfTheta;
        ratioB = Math.sin(slerp * halfTheta) / sinHalfTheta;

        dest[0] = (quat[0] * ratioA + quat2[0] * ratioB);
        dest[1] = (quat[1] * ratioA + quat2[1] * ratioB);
        dest[2] = (quat[2] * ratioA + quat2[2] * ratioB);
        dest[3] = (quat[3] * ratioA + quat2[3] * ratioB);

        return dest;
    };

    /**
     * Creates a quaternion from the given 3x3 rotation matrix.
     * If dest is omitted, a new quaternion will be created.
     *
     * @param {mat3}  mat    the rotation matrix
     * @param {quat4} [dest] an optional receiving quaternion
     *
     * @returns {quat4} the quaternion constructed from the rotation matrix
     *
     */
    quat4.fromRotationMatrix = function(mat, dest) {
        if (!dest) dest = quat4.create();
        
        // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
        // article "Quaternion Calculus and Fast Animation".

        var fTrace = mat[0] + mat[4] + mat[8];
        var fRoot;

        if ( fTrace > 0.0 ) {
            // |w| > 1/2, may as well choose w > 1/2
            fRoot = Math.sqrt(fTrace + 1.0);  // 2w
            dest[3] = 0.5 * fRoot;
            fRoot = 0.5/fRoot;  // 1/(4w)
            dest[0] = (mat[7]-mat[5])*fRoot;
            dest[1] = (mat[2]-mat[6])*fRoot;
            dest[2] = (mat[3]-mat[1])*fRoot;
        } else {
            // |w| <= 1/2
            var s_iNext = quat4.fromRotationMatrix.s_iNext = quat4.fromRotationMatrix.s_iNext || [1,2,0];
            var i = 0;
            if ( mat[4] > mat[0] )
              i = 1;
            if ( mat[8] > mat[i*3+i] )
              i = 2;
            var j = s_iNext[i];
            var k = s_iNext[j];
            
            fRoot = Math.sqrt(mat[i*3+i]-mat[j*3+j]-mat[k*3+k] + 1.0);
            dest[i] = 0.5 * fRoot;
            fRoot = 0.5 / fRoot;
            dest[3] = (mat[k*3+j] - mat[j*3+k]) * fRoot;
            dest[j] = (mat[j*3+i] + mat[i*3+j]) * fRoot;
            dest[k] = (mat[k*3+i] + mat[i*3+k]) * fRoot;
        }
        
        return dest;
    };

    /**
     * Alias. See the description for quat4.fromRotationMatrix().
     */
    mat3.toQuat4 = quat4.fromRotationMatrix;

    (function() {
        var mat = mat3.create();
        
        /**
         * Creates a quaternion from the 3 given vectors. They must be perpendicular
         * to one another and represent the X, Y and Z axes.
         *
         * If dest is omitted, a new quat4 will be created.
         *
         * Example: The default OpenGL orientation has a view vector [0, 0, -1],
         * right vector [1, 0, 0], and up vector [0, 1, 0]. A quaternion representing
         * this orientation could be constructed with:
         *
         *   quat = quat4.fromAxes([0, 0, -1], [1, 0, 0], [0, 1, 0], quat4.create());
         *
         * @param {vec3}  view   the view vector, or direction the object is pointing in
         * @param {vec3}  right  the right vector, or direction to the "right" of the object
         * @param {vec3}  up     the up vector, or direction towards the object's "up"
         * @param {quat4} [dest] an optional receiving quat4
         *
         * @returns {quat4} dest
         **/
        quat4.fromAxes = function(view, right, up, dest) {
            mat[0] = right[0];
            mat[3] = right[1];
            mat[6] = right[2];

            mat[1] = up[0];
            mat[4] = up[1];
            mat[7] = up[2];

            mat[2] = view[0];
            mat[5] = view[1];
            mat[8] = view[2];

            return quat4.fromRotationMatrix(mat, dest);
        };
    })();

    /**
     * Sets a quat4 to the Identity and returns it.
     *
     * @param {quat4} [dest] quat4 to set. If omitted, a
     * new quat4 will be created.
     *
     * @returns {quat4} dest
     */
    quat4.identity = function(dest) {
        if (!dest) dest = quat4.create();
        dest[0] = 0;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 1;
        return dest;
    };

    /**
     * Sets a quat4 from the given angle and rotation axis,
     * then returns it. If dest is not given, a new quat4 is created.
     *
     * @param {Number} angle  the angle in radians
     * @param {vec3}   axis   the axis around which to rotate
     * @param {quat4}  [dest] the optional quat4 to store the result
     *
     * @returns {quat4} dest
     **/
    quat4.fromAngleAxis = function(angle, axis, dest) {
        // The quaternion representing the rotation is
        //   q = cos(A/2)+sin(A/2)*(x*i+y*j+z*k)
        if (!dest) dest = quat4.create();
        
        var half = angle * 0.5;
        var s = Math.sin(half);
        dest[3] = Math.cos(half);
        dest[0] = s * axis[0];
        dest[1] = s * axis[1];
        dest[2] = s * axis[2];
        
        return dest;
    };

    /**
     * Stores the angle and axis in a vec4, where the XYZ components represent
     * the axis and the W (4th) component is the angle in radians.
     *
     * If dest is not given, src will be modified in place and returned, after
     * which it should not be considered not a quaternion (just an axis and angle).
     *
     * @param {quat4} quat   the quaternion whose angle and axis to store
     * @param {vec4}  [dest] the optional vec4 to receive the data
     *
     * @returns {vec4} dest
     */
    quat4.toAngleAxis = function(src, dest) {
        if (!dest) dest = src;
        // The quaternion representing the rotation is
        //   q = cos(A/2)+sin(A/2)*(x*i+y*j+z*k)

        var sqrlen = src[0]*src[0]+src[1]*src[1]+src[2]*src[2];
        if (sqrlen > 0)
        {
            dest[3] = 2 * Math.acos(src[3]);
            var invlen = glMath.invsqrt(sqrlen);
            dest[0] = src[0]*invlen;
            dest[1] = src[1]*invlen;
            dest[2] = src[2]*invlen;
        } else {
            // angle is 0 (mod 2*pi), so any axis will do
            dest[3] = 0;
            dest[0] = 1;
            dest[1] = 0;
            dest[2] = 0;
        }
        
        return dest;
    };

    /**
     * Returns a string representation of a quaternion
     *
     * @param {quat4} quat quat4 to represent as a string
     *
     * @returns {string} String representation of quat
     */
    quat4.str = function (quat) {
        return '[' + quat[0] + ', ' + quat[1] + ', ' + quat[2] + ', ' + quat[3] + ']';
    };
    
    /**
     * @class 2 Dimensional Vector
     * @name vec2
     */
    var vec2 = {};
     
    /**
     * Creates a new vec2, initializing it from vec if vec
     * is given.
     *
     * @param {vec2} [vec] the vector's initial contents
     * @returns {vec2} a new 2D vector
     */
    vec2.create = function(vec) {
        var dest = new MatrixArray(2);

        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
        } else {
            dest[0] = 0;
            dest[1] = 0;
        }
        return dest;
    };

    /**
     * Creates a new instance of a vec2, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value

     * @returns {vec2} New vec2
     */
    vec2.createFrom = function (x, y) {
        var dest = new MatrixArray(2);

        dest[0] = x;
        dest[1] = y;

        return dest;
    };
    
    /**
     * Adds the vec2's together. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.add = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] + vecB[0];
        dest[1] = vecA[1] + vecB[1];
        return dest;
    };
    
    /**
     * Subtracts vecB from vecA. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.subtract = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] - vecB[0];
        dest[1] = vecA[1] - vecB[1];
        return dest;
    };
    
    /**
     * Multiplies vecA with vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.multiply = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] * vecB[0];
        dest[1] = vecA[1] * vecB[1];
        return dest;
    };
    
    /**
     * Divides vecA by vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.divide = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] / vecB[0];
        dest[1] = vecA[1] / vecB[1];
        return dest;
    };
    
    /**
     * Scales vecA by some scalar number. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecA.
     *
     * This is the same as multiplying each component of vecA
     * by the given scalar.
     *
     * @param {vec2}   vecA the vector to be scaled
     * @param {Number} scalar the amount to scale the vector by
     * @param {vec2}   [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.scale = function(vecA, scalar, dest) {
        if (!dest) dest = vecA;
        dest[0] = vecA[0] * scalar;
        dest[1] = vecA[1] * scalar;
        return dest;
    };

    /**
     * Calculates the euclidian distance between two vec2
     *
     * Params:
     * @param {vec2} vecA First vector
     * @param {vec2} vecB Second vector
     *
     * @returns {number} Distance between vecA and vecB
     */
    vec2.dist = function (vecA, vecB) {
        var x = vecB[0] - vecA[0],
            y = vecB[1] - vecA[1];
        return Math.sqrt(x*x + y*y);
    };

    /**
     * Copies the values of one vec2 to another
     *
     * @param {vec2} vec vec2 containing values to copy
     * @param {vec2} dest vec2 receiving copied values
     *
     * @returns {vec2} dest
     */
    vec2.set = function (vec, dest) {
        dest[0] = vec[0];
        dest[1] = vec[1];
        return dest;
    };

    /**
     * Compares two vectors for equality within a certain margin of error
     *
     * @param {vec2} a First vector
     * @param {vec2} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    vec2.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON
        );
    };

    /**
     * Negates the components of a vec2
     *
     * @param {vec2} vec vec2 to negate
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec2} dest if specified, vec otherwise
     */
    vec2.negate = function (vec, dest) {
        if (!dest) { dest = vec; }
        dest[0] = -vec[0];
        dest[1] = -vec[1];
        return dest;
    };

    /**
     * Normlize a vec2
     *
     * @param {vec2} vec vec2 to normalize
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec2} dest if specified, vec otherwise
     */
    vec2.normalize = function (vec, dest) {
        if (!dest) { dest = vec; }
        var mag = vec[0] * vec[0] + vec[1] * vec[1];
        if (mag > 0) {
            mag = Math.sqrt(mag);
            dest[0] = vec[0] / mag;
            dest[1] = vec[1] / mag;
        } else {
            dest[0] = dest[1] = 0;
        }
        return dest;
    };

    /**
     * Computes the cross product of two vec2's. Note that the cross product must by definition
     * produce a 3D vector. If a dest vector is given, it will contain the resultant 3D vector.
     * Otherwise, a scalar number will be returned, representing the vector's Z coordinate, since
     * its X and Y must always equal 0.
     *
     * Examples:
     *    var crossResult = vec3.create();
     *    vec2.cross([1, 2], [3, 4], crossResult);
     *    //=> [0, 0, -2]
     *
     *    vec2.cross([1, 2], [3, 4]);
     *    //=> -2
     *
     * See http://stackoverflow.com/questions/243945/calculating-a-2d-vectors-cross-product
     * for some interesting facts.
     *
     * @param {vec2} vecA left operand
     * @param {vec2} vecB right operand
     * @param {vec2} [dest] optional vec2 receiving result. If not specified a scalar is returned
     *
     */
    vec2.cross = function (vecA, vecB, dest) {
        var z = vecA[0] * vecB[1] - vecA[1] * vecB[0];
        if (!dest) return z;
        dest[0] = dest[1] = 0;
        dest[2] = z;
        return dest;
    };
    
    /**
     * Caclulates the length of a vec2
     *
     * @param {vec2} vec vec2 to calculate length of
     *
     * @returns {Number} Length of vec
     */
    vec2.length = function (vec) {
      var x = vec[0], y = vec[1];
      return Math.sqrt(x * x + y * y);
    };

    /**
     * Caclulates the squared length of a vec2
     *
     * @param {vec2} vec vec2 to calculate squared length of
     *
     * @returns {Number} Squared Length of vec
     */
    vec2.squaredLength = function (vec) {
      var x = vec[0], y = vec[1];
      return x * x + y * y;
    };

    /**
     * Caclulates the dot product of two vec2s
     *
     * @param {vec2} vecA First operand
     * @param {vec2} vecB Second operand
     *
     * @returns {Number} Dot product of vecA and vecB
     */
    vec2.dot = function (vecA, vecB) {
        return vecA[0] * vecB[0] + vecA[1] * vecB[1];
    };
    
    /**
     * Generates a 2D unit vector pointing from one vector to another
     *
     * @param {vec2} vecA Origin vec2
     * @param {vec2} vecB vec2 to point to
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vecA
     *
     * @returns {vec2} dest if specified, vecA otherwise
     */
    vec2.direction = function (vecA, vecB, dest) {
        if (!dest) { dest = vecA; }

        var x = vecA[0] - vecB[0],
            y = vecA[1] - vecB[1],
            len = x * x + y * y;

        if (!len) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        }

        len = 1 / Math.sqrt(len);
        dest[0] = x * len;
        dest[1] = y * len;
        return dest;
    };

    /**
     * Performs a linear interpolation between two vec2
     *
     * @param {vec2} vecA First vector
     * @param {vec2} vecB Second vector
     * @param {Number} lerp Interpolation amount between the two inputs
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vecA
     *
     * @returns {vec2} dest if specified, vecA otherwise
     */
    vec2.lerp = function (vecA, vecB, lerp, dest) {
        if (!dest) { dest = vecA; }
        dest[0] = vecA[0] + lerp * (vecB[0] - vecA[0]);
        dest[1] = vecA[1] + lerp * (vecB[1] - vecA[1]);
        return dest;
    };

    /**
     * Returns a string representation of a vector
     *
     * @param {vec2} vec Vector to represent as a string
     *
     * @returns {String} String representation of vec
     */
    vec2.str = function (vec) {
        return '[' + vec[0] + ', ' + vec[1] + ']';
    };
    
    /**
     * @class 2x2 Matrix
     * @name mat2
     */
    var mat2 = {};
    
    /**
     * Creates a new 2x2 matrix. If src is given, the new matrix
     * is initialized to those values.
     *
     * @param {mat2} [src] the seed values for the new matrix, if any
     * @returns {mat2} a new matrix
     */
    mat2.create = function(src) {
        var dest = new MatrixArray(4);
        
        if (src) {
            dest[0] = src[0];
            dest[1] = src[1];
            dest[2] = src[2];
            dest[3] = src[3];
        } else {
            dest[0] = dest[1] = dest[2] = dest[3] = 0;
        }
        return dest;
    };

    /**
     * Creates a new instance of a mat2, initializing it with the given arguments
     *
     * @param {number} m00
     * @param {number} m01
     * @param {number} m10
     * @param {number} m11

     * @returns {mat2} New mat2
     */
    mat2.createFrom = function (m00, m01, m10, m11) {
        var dest = new MatrixArray(4);

        dest[0] = m00;
        dest[1] = m01;
        dest[2] = m10;
        dest[3] = m11;

        return dest;
    };
    
    /**
     * Copies the values of one mat2 to another
     *
     * @param {mat2} mat mat2 containing values to copy
     * @param {mat2} dest mat2 receiving copied values
     *
     * @returns {mat2} dest
     */
    mat2.set = function (mat, dest) {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        return dest;
    };

    /**
     * Compares two matrices for equality within a certain margin of error
     *
     * @param {mat2} a First matrix
     * @param {mat2} b Second matrix
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    mat2.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON
        );
    };

    /**
     * Sets a mat2 to an identity matrix
     *
     * @param {mat2} [dest] mat2 to set. If omitted a new one will be created.
     *
     * @returns {mat2} dest
     */
    mat2.identity = function (dest) {
        if (!dest) { dest = mat2.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 1;
        return dest;
    };

    /**
     * Transposes a mat2 (flips the values over the diagonal)
     *
     * @param {mat2} mat mat2 to transpose
     * @param {mat2} [dest] mat2 receiving transposed values. If not specified result is written to mat
     *
     * @param {mat2} dest if specified, mat otherwise
     */
    mat2.transpose = function (mat, dest) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (!dest || mat === dest) {
            var a00 = mat[1];
            mat[1] = mat[2];
            mat[2] = a00;
            return mat;
        }
        
        dest[0] = mat[0];
        dest[1] = mat[2];
        dest[2] = mat[1];
        dest[3] = mat[3];
        return dest;
    };

    /**
     * Calculates the determinant of a mat2
     *
     * @param {mat2} mat mat2 to calculate determinant of
     *
     * @returns {Number} determinant of mat
     */
    mat2.determinant = function (mat) {
      return mat[0] * mat[3] - mat[2] * mat[1];
    };
    
    /**
     * Calculates the inverse matrix of a mat2
     *
     * @param {mat2} mat mat2 to calculate inverse of
     * @param {mat2} [dest] mat2 receiving inverse matrix. If not specified result is written to mat
     *
     * @param {mat2} dest is specified, mat otherwise, null if matrix cannot be inverted
     */
    mat2.inverse = function (mat, dest) {
        if (!dest) { dest = mat; }
        var a0 = mat[0], a1 = mat[1], a2 = mat[2], a3 = mat[3];
        var det = a0 * a3 - a2 * a1;
        if (!det) return null;
        
        det = 1.0 / det;
        dest[0] =  a3 * det;
        dest[1] = -a1 * det;
        dest[2] = -a2 * det;
        dest[3] =  a0 * det;
        return dest;
    };
    
    /**
     * Performs a matrix multiplication
     *
     * @param {mat2} matA First operand
     * @param {mat2} matB Second operand
     * @param {mat2} [dest] mat2 receiving operation result. If not specified result is written to matA
     *
     * @returns {mat2} dest if specified, matA otherwise
     */
    mat2.multiply = function (matA, matB, dest) {
        if (!dest) { dest = matA; }
        var a11 = matA[0],
            a12 = matA[1],
            a21 = matA[2],
            a22 = matA[3];
        dest[0] = a11 * matB[0] + a12 * matB[2];
        dest[1] = a11 * matB[1] + a12 * matB[3];
        dest[2] = a21 * matB[0] + a22 * matB[2];
        dest[3] = a21 * matB[1] + a22 * matB[3];
        return dest;
    };

    /**
     * Rotates a 2x2 matrix by an angle
     *
     * @param {mat2}   mat   The matrix to rotate
     * @param {Number} angle The angle in radians
     * @param {mat2} [dest]  Optional mat2 receiving the result. If omitted mat will be used.
     *
     * @returns {mat2} dest if specified, mat otherwise
     */
    mat2.rotate = function (mat, angle, dest) {
        if (!dest) { dest = mat; }
        var a11 = mat[0],
            a12 = mat[1],
            a21 = mat[2],
            a22 = mat[3],
            s = Math.sin(angle),
            c = Math.cos(angle);
        dest[0] = a11 *  c + a12 * s;
        dest[1] = a11 * -s + a12 * c;
        dest[2] = a21 *  c + a22 * s;
        dest[3] = a21 * -s + a22 * c;
        return dest;
    };

    /**
     * Multiplies the vec2 by the given 2x2 matrix
     *
     * @param {mat2} matrix the 2x2 matrix to multiply against
     * @param {vec2} vec    the vector to multiply
     * @param {vec2} [dest] an optional receiving vector. If not given, vec is used.
     *
     * @returns {vec2} The multiplication result
     **/
    mat2.multiplyVec2 = function(matrix, vec, dest) {
      if (!dest) dest = vec;
      var x = vec[0], y = vec[1];
      dest[0] = x * matrix[0] + y * matrix[1];
      dest[1] = x * matrix[2] + y * matrix[3];
      return dest;
    };
    
    /**
     * Scales the mat2 by the dimensions in the given vec2
     *
     * @param {mat2} matrix the 2x2 matrix to scale
     * @param {vec2} vec    the vector containing the dimensions to scale by
     * @param {vec2} [dest] an optional receiving mat2. If not given, matrix is used.
     *
     * @returns {mat2} dest if specified, matrix otherwise
     **/
    mat2.scale = function(matrix, vec, dest) {
      if (!dest) { dest = matrix; }
      var a11 = matrix[0],
          a12 = matrix[1],
          a21 = matrix[2],
          a22 = matrix[3],
          b11 = vec[0],
          b22 = vec[1];
      dest[0] = a11 * b11;
      dest[1] = a12 * b22;
      dest[2] = a21 * b11;
      dest[3] = a22 * b22;
      return dest;
    };

    /**
     * Returns a string representation of a mat2
     *
     * @param {mat2} mat mat2 to represent as a string
     *
     * @param {String} String representation of mat
     */
    mat2.str = function (mat) {
        return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] + ']';
    };
    
    /**
     * @class 4 Dimensional Vector
     * @name vec4
     */
    var vec4 = {};
     
    /**
     * Creates a new vec4, initializing it from vec if vec
     * is given.
     *
     * @param {vec4} [vec] the vector's initial contents
     * @returns {vec4} a new 2D vector
     */
    vec4.create = function(vec) {
        var dest = new MatrixArray(4);
        
        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
            dest[2] = vec[2];
            dest[3] = vec[3];
        } else {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;
        }
        return dest;
    };

    /**
     * Creates a new instance of a vec4, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value
     * @param {number} z Z value
     * @param {number} w W value

     * @returns {vec4} New vec4
     */
    vec4.createFrom = function (x, y, z, w) {
        var dest = new MatrixArray(4);

        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = w;

        return dest;
    };
    
    /**
     * Adds the vec4's together. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.add = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] + vecB[0];
      dest[1] = vecA[1] + vecB[1];
      dest[2] = vecA[2] + vecB[2];
      dest[3] = vecA[3] + vecB[3];
      return dest;
    };
    
    /**
     * Subtracts vecB from vecA. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.subtract = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] - vecB[0];
      dest[1] = vecA[1] - vecB[1];
      dest[2] = vecA[2] - vecB[2];
      dest[3] = vecA[3] - vecB[3];
      return dest;
    };
    
    /**
     * Multiplies vecA with vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.multiply = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] * vecB[0];
      dest[1] = vecA[1] * vecB[1];
      dest[2] = vecA[2] * vecB[2];
      dest[3] = vecA[3] * vecB[3];
      return dest;
    };
    
    /**
     * Divides vecA by vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.divide = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] / vecB[0];
      dest[1] = vecA[1] / vecB[1];
      dest[2] = vecA[2] / vecB[2];
      dest[3] = vecA[3] / vecB[3];
      return dest;
    };
    
    /**
     * Scales vecA by some scalar number. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecA.
     *
     * This is the same as multiplying each component of vecA
     * by the given scalar.
     *
     * @param {vec4}   vecA the vector to be scaled
     * @param {Number} scalar the amount to scale the vector by
     * @param {vec4}   [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.scale = function(vecA, scalar, dest) {
      if (!dest) dest = vecA;
      dest[0] = vecA[0] * scalar;
      dest[1] = vecA[1] * scalar;
      dest[2] = vecA[2] * scalar;
      dest[3] = vecA[3] * scalar;
      return dest;
    };

    /**
     * Copies the values of one vec4 to another
     *
     * @param {vec4} vec vec4 containing values to copy
     * @param {vec4} dest vec4 receiving copied values
     *
     * @returns {vec4} dest
     */
    vec4.set = function (vec, dest) {
        dest[0] = vec[0];
        dest[1] = vec[1];
        dest[2] = vec[2];
        dest[3] = vec[3];
        return dest;
    };

    /**
     * Compares two vectors for equality within a certain margin of error
     *
     * @param {vec4} a First vector
     * @param {vec4} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    vec4.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON
        );
    };

    /**
     * Negates the components of a vec4
     *
     * @param {vec4} vec vec4 to negate
     * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec4} dest if specified, vec otherwise
     */
    vec4.negate = function (vec, dest) {
        if (!dest) { dest = vec; }
        dest[0] = -vec[0];
        dest[1] = -vec[1];
        dest[2] = -vec[2];
        dest[3] = -vec[3];
        return dest;
    };

    /**
     * Caclulates the length of a vec2
     *
     * @param {vec2} vec vec2 to calculate length of
     *
     * @returns {Number} Length of vec
     */
    vec4.length = function (vec) {
      var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
      return Math.sqrt(x * x + y * y + z * z + w * w);
    };

    /**
     * Caclulates the squared length of a vec4
     *
     * @param {vec4} vec vec4 to calculate squared length of
     *
     * @returns {Number} Squared Length of vec
     */
    vec4.squaredLength = function (vec) {
      var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
      return x * x + y * y + z * z + w * w;
    };

    /**
     * Performs a linear interpolation between two vec4
     *
     * @param {vec4} vecA First vector
     * @param {vec4} vecB Second vector
     * @param {Number} lerp Interpolation amount between the two inputs
     * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vecA
     *
     * @returns {vec4} dest if specified, vecA otherwise
     */
    vec4.lerp = function (vecA, vecB, lerp, dest) {
        if (!dest) { dest = vecA; }
        dest[0] = vecA[0] + lerp * (vecB[0] - vecA[0]);
        dest[1] = vecA[1] + lerp * (vecB[1] - vecA[1]);
        dest[2] = vecA[2] + lerp * (vecB[2] - vecA[2]);
        dest[3] = vecA[3] + lerp * (vecB[3] - vecA[3]);
        return dest;
    };

    /**
     * Returns a string representation of a vector
     *
     * @param {vec4} vec Vector to represent as a string
     *
     * @returns {String} String representation of vec
     */
    vec4.str = function (vec) {
        return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ', ' + vec[3] + ']';
    };

    /*
     * Exports
     */

    if(root) {
        root.glMatrixArrayType = MatrixArray;
        root.MatrixArray = MatrixArray;
        root.setMatrixArrayType = setMatrixArrayType;
        root.determineMatrixArrayType = determineMatrixArrayType;
        root.glMath = glMath;
        root.vec2 = vec2;
        root.vec3 = vec3;
        root.vec4 = vec4;
        root.mat2 = mat2;
        root.mat3 = mat3;
        root.mat4 = mat4;
        root.quat4 = quat4;
    }

    return {
        glMatrixArrayType: MatrixArray,
        MatrixArray: MatrixArray,
        setMatrixArrayType: setMatrixArrayType,
        determineMatrixArrayType: determineMatrixArrayType,
        glMath: glMath,
        vec2: vec2,
        vec3: vec3,
        vec4: vec4,
        mat2: mat2,
        mat3: mat3,
        mat4: mat4,
        quat4: quat4
    };
}));

/*global vec3: true, mat4: true */

define('game/bg',
['glmatrix', 'common/sh', 'common/qmath'],
function (glmatrix, sh, qm) {
	var BASE_FOLDER = 'baseq3';
var MAX_QPATH   = 64;
var CMD_BACKUP  = 64;

// If entityState.solid === SOLID_BMODEL, modelIndex is an inline model number
var SOLID_BMODEL = 0xffffff;

/**
 * Cvar flags
 */
var CVF = {
	ARCHIVE:    0x0001,                                    // save to config file
	USERINFO:   0x0002,                                    // sent to server on connect or change
	SERVERINFO: 0x0004,                                    // sent in response to front end requests
	SYSTEMINFO: 0x0008                                     // these cvars will be duplicated on all clients
};

/**
 * Renderer (should be moved)
 */
var MAX_DRAWSURFS  = 0x10000;

/**
 * Snapshot flags
 */
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

/**
 * MAX_* defines used to pre-alloc many structures
 */
var GENTITYNUM_BITS         = 10;
var MAX_CLIENTS             = 32;                          // absolute limit
var MAX_GENTITIES           = (1 << 10);                   // can't be increased without changing drawsurf bit packing
var MAX_MODELS              = 256;                         // these are sent over the net as 8 bits
var MAX_SOUNDS              = 256;                         // so they cannot be blindly increased

/**
 * Faux entity numbers
 */
var ENTITYNUM_NONE          = MAX_GENTITIES-1;
var ENTITYNUM_WORLD         = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL    = MAX_GENTITIES-2;

var MOVE_RUN = 120;                                        // if forwardmove or rightmove are >= MOVE_RUN,
	                                                       // then BUTTON_WALKING should be set

/**
 * Playerstate
 */
var MAX_STATS               = 16;
var MAX_PERSISTANT          = 16;
var MAX_POWERUPS            = 16;
var MAX_WEAPONS             = 16;
var MAX_PS_EVENTS           = 2;
var PMOVEFRAMECOUNTBITS     = 6;

var BUTTON = {
	ATTACK:       1,
	TALK:         2,                                       // displays talk balloon and disables actions
	USE_HOLDABLE: 4,
	GESTURE:      8,
	WALKING:      16,                                      // walking can't just be infered from MOVE_RUN
	                                                       // because a key pressed late in the frame will
	                                                       // only generate a small move value for that frame
	                                                       // walking will use different animations and
	                                                       // won't generate footsteps
	AFFIRMATIVE:  32,
	NEGATIVE:     64,
	GETFLAG:      128,
	GUARDBASE:    256,
	PATROL:       512,
	FOLLOWME:     1024,
	ANY:          2048                                     // any key whatsoever
};

var TR = {
	STATIONARY:  0,
	INTERPOLATE: 1,                              // non-parametric, but interpolate between snapshots
	LINEAR:      2,
	LINEAR_STOP: 3,
	SINE:        4,                              // value = base + sin( time / duration ) * delta
	GRAVITY:     5
};

var SURF = {
	NODAMAGE:    0x1,                            // never give falling damage
	SLICK:       0x2,                            // effects game physics
	SKY:         0x4,                            // lighting from environment map
	LADDER:      0x8,
	NOIMPACT:    0x10,                           // don't make missile explosions
	NOMARKS:     0x20,                           // don't leave missile marks
	FLESH:       0x40,                           // make flesh sounds and effects
	NODRAW:      0x80,                           // don't generate a drawsurface at all
	HINT:        0x100,                          // make a primary bsp splitter
	SKIP:        0x200,                          // completely ignore, allowing non-closed brushes
	NOLIGHTMAP:  0x400,                          // surface doesn't need a lightmap
	POINTLIGHT:  0x800,                          // generate lighting info at vertexes
	METALSTEPS:  0x1000,                         // clanking footsteps
	NOSTEPS:     0x2000,                         // no footstep sounds
	NONSOLID:    0x4000,                         // don't collide against curves with this set
	LIGHTFILTER: 0x8000,                         // act as a light filter during q3map -light
	ALPHASHADOW: 0x10000,                        // do per-pixel light shadow casting in q3map
	NODLIGHT:    0x20000,                        // don't dlight even if solid (solid lava, skies)
	DUST:        0x40000                         // leave a dust trail when walking on this surface
};

var CONTENTS = {
	SOLID:         1,                                      // an eye is never valid in a solid
	LAVA:          8,
	SLIME:         16,
	WATER:         32,
	FOG:           64,

	NOTTEAM1:      0x0080,
	NOTTEAM2:      0x0100,
	NOBOTCLIP:     0x0200,

	AREAPORTAL:    0x8000,

	PLAYERCLIP:    0x10000,
	MONSTERCLIP:   0x20000,
	TELEPORTER:    0x40000,
	JUMPPAD:       0x80000,
	CLUSTERPORTAL: 0x100000,
	DONOTENTER:    0x200000,
	BOTCLIP:       0x400000,
	MOVER:         0x800000,

	ORIGIN:        0x1000000,                              // removed before bsping an entity

	BODY:          0x2000000,                              // should never be on a brush, only in game
	CORPSE:        0x4000000,
	DETAIL:        0x8000000,                              // brushes not used for the bsp
	STRUCTURAL:    0x10000000,                             // brushes used for the bsp
	TRANSLUCENT:   0x20000000,                             // don't consume surface fragments inside
	TRIGGER:       0x40000000,
	NODROP:        0x80000000                              // don't leave bodies or items (death fog, lava)
};
	var GIB_HEALTH = -40;
var ARMOR_PROTECTION = 0.66;

var ITEM_RADIUS = 15;                                      // item sizes are needed for client side pickup detection

var MINS_Z = -24;
var DEFAULT_VIEWHEIGHT = 26;
var CROUCH_VIEWHEIGHT = 12;
var DEAD_VIEWHEIGHT = -16;

var PM = {
	NORMAL:       0,                                       // can accelerate and turn
	NOCLIP:       1,                                       // noclip movement
	SPECTATOR:    2,                                       // still run into walls
	DEAD:         3,                                       // no acceleration or turning, but free falling
	FREEZE:       4,                                       // stuck in place with no control
	INTERMISSION: 5                                        // no movement or status bar
};

var PMF = {
	DUCKED:         1,
	JUMP_HELD:      2,
	BACKWARDS_JUMP: 8,                                     // go into backwards land
	BACKWARDS_RUN:  16,                                    // coast down to backwards run
	TIME_LAND:      32,                                    // pm_time is time before rejump
	TIME_KNOCKBACK: 64,                                    // pm_time is an air-accelerate only time
	TIME_WATERJUMP: 256,                                   // pm_time is waterjump
	RESPAWNED:      512,                                   // clear after attack and jump buttons come up
	USE_ITEM_HELD:  1024,
	GRAPPLE_PULL:   2048,                                  // pull towards grapple location
	FOLLOW:         4096,                                  // spectate following another player
	SCOREBOARD:     8192,                                  // spectate as a scoreboard
	INVULEXPAND:    16384,                                 // invulnerability sphere set to full size
	ALL_TIMES:      (32|64|256)
};

// Weapon state.
var WS = {
	READY:    0,
	RAISING:  1,
	DROPPING: 2,
	FIRING:   3
};

// Item types.
var IT = {
	BAD:                0,
	WEAPON:             1,                                 // EFX: rotate + upscale + minlight
	AMMO:               2,                                 // EFX: rotate
	ARMOR:              3,                                 // EFX: rotate + minlight
	HEALTH:             4,                                 // EFX: static external sphere + rotating internal
	POWERUP:            5,                                 // instant on, timer based
	                                                       // EFX: rotate + external ring that rotates
	HOLDABLE:           6,                                 // single use, holdable item
	                                                       // EFX: rotate + bob
	PERSISTANT_POWERUP: 7,
	TEAM:               8
};

var MASK = {
	ALL:         -1,
	SOLID:       CONTENTS.SOLID,
	PLAYERSOLID: CONTENTS.SOLID | CONTENTS.PLAYERCLIP | CONTENTS.BODY,
	DEADSOLID:   CONTENTS.SOLID | CONTENTS.PLAYERCLIP,
	WATER:       CONTENTS.WATER | CONTENTS.LAVA | CONTENTS.SLIME,
	OPAQUE:      CONTENTS.SOLID | CONTENTS.SLIME | CONTENTS.LAVA,
	SHOT:        CONTENTS.SOLID | CONTENTS.BODY | CONTENTS.CORPSE
};

/**
 * Playerstate flags
 */
var STAT = {
	HEALTH:        0,
	HOLDABLE_ITEM: 1,
	WEAPONS:       2,
	ARMOR:         3,
	DEAD_YAW:      4,				// look this direction when dead (FIXME: get rid of?)
	CLIENTS_READY: 5,				// bit mask of clients wishing to exit the intermission (FIXME: configstring?)
	MAX_HEALTH:    6				// health / armor limit, changable by handicap
};

var WP = {
	NONE:             0,
	GAUNTLET:         1,
	MACHINEGUN:       2,
	SHOTGUN:          3,
	GRENADE_LAUNCHER: 4,
	ROCKET_LAUNCHER:  5,
	LIGHTNING:        6,
	RAILGUN:          7,
	PLASMAGUN:        8,
	BFG:              9,
	GRAPPLING_HOOK:   10,
	NUM_WEAPONS:      11
};

// NOTE: may not have more than 16
var PW = {
	NONE:         0,
	QUAD:         1,
	BATTLESUIT:   2,
	HASTE:        3,
	INVIS:        4,
	REGEN:        5,
	FLIGHT:       6,
	REDFLAG:      7,
	BLUEFLAG:     8,
	NEUTRALFLAG:  9,
	NUM_POWERUPS: 10
};

// PlayerState.persistant[] indexes
// These fields are the only part of player_state that aren't
// cleared on respawn.
// NOTE: may not have more than 16
var PERS = {
	SCORE:                0,                               // !!! MUST NOT CHANGE, SERVER AND GAME BOTH REFERENCE !!!
	HITS:                 1,                               // total points damage inflicted so damage beeps can sound on change
	RANK:                 2,                               // player rank or team rank
	TEAM:                 3,                               // player team
	SPAWN_COUNT:          4,                               // incremented every respawn
	PLAYEREVENTS:         5,                               // 16 bits that can be flipped for events
	ATTACKER:             6,                               // clientnum of last damage inflicter
	ATTACKEE_ARMOR:       7,                               // health/armor of last person we attacked
	KILLED:               8,                               // count of the number of times you died
	// player awards tracking
	IMPRESSIVE_COUNT:     9,                               // two railgun hits in a row
	EXCELLENT_COUNT:      10,                              // two successive kills in a short amount of time
	DEFEND_COUNT:         11,                              // defend awards
	ASSIST_COUNT:         12,                              // assist awards
	GAUNTLET_FRAG_COUNT:  13,                              // kills with the guantlet
	CAPTURES:             14                               // captures
};

/**
 * Entitystate flags
 */
// entityState_t->eType
var ET = {
	GENERAL:          0,
	PLAYER:           1,
	ITEM:             2,
	MISSILE:          3,
	MOVER:            4,
	BEAM:             5,
	PORTAL:           6,
	SPEAKER:          7,
	PUSH_TRIGGER:     8,
	TELEPORT_TRIGGER: 9,
	INVISIBLE:        10,
	GRAPPLE:          11,                                  // grapple hooked on wall
	TEAM:             12,
	EVENTS:           13                                   // any of the EV_* events can be added freestanding
	                                                       // by setting eType to ET_EVENTS + eventNum
	                                                       // this avoids having to set eFlags and eventNum
};

// entityState_t->eFlags
var EF = {
	DEAD:             0x00000001,                          // don't draw a foe marker over players with EF_DEAD
	TELEPORT_BIT:     0x00000004,                          // toggled every time the origin abruptly changes
	AWARD_EXCELLENT:  0x00000008,                          // draw an excellent sprite
	PLAYER_EVENT:     0x00000010,
	BOUNCE:           0x00000010,                          // for missiles
	BOUNCE_HALF:      0x00000020,                          // for missiles
	AWARD_GAUNTLET:   0x00000040,                          // draw a gauntlet sprite
	NODRAW:           0x00000080,                          // may have an event, but no model (unspawned items)
	FIRING:           0x00000100,                          // for lightning gun
	KAMIKAZE:         0x00000200,
	MOVER_STOP:       0x00000400,                          // will push otherwise
	AWARD_CAP:        0x00000800,                          // draw the capture sprite
	TALK:             0x00001000,                          // draw a talk balloon
	CONNECTION:       0x00002000,                          // draw a connection trouble sprite
	VOTED:            0x00004000,                          // already cast a vote
	AWARD_IMPRESSIVE: 0x00008000,                          // draw an impressive sprite
	AWARD_DEFEND:     0x00010000,                          // draw a defend sprite
	AWARD_ASSIST:     0x00020000,                          // draw an assist sprite
	AWARD_DENIED:     0x00040000,                          // denied
	TEAMVOTED:        0x00080000                           // already cast a team vote
};

/**********************************************************
 * 
 * Entitystate events
 * 
 * Entity events are for effects that take place relative
 * to an existing entities origin. Very network efficient.
 *
 * Two bits at the top of the entityState->event field
 * will be incremented with each change in the event so
 * that an identical event started twice in a row can
 * be distinguished. And off the value with ~EV_EVENT_BITS
 * to retrieve the actual event number.
 *
 **********************************************************/
var EV_EVENT_BIT1    = 0x00000100;
var EV_EVENT_BIT2    = 0x00000200;
var EV_EVENT_BITS    = (EV_EVENT_BIT1|EV_EVENT_BIT2);
var EVENT_VALID_MSEC = 300;

var EV = {
	NONE:                0,

	FOOTSTEP:            1,
	FOOTSTEP_METAL:      2,
	FOOTSPLASH:          3,
	FOOTWADE:            4,
	SWIM:                5,

	STEP_4:              6,
	STEP_8:              7,
	STEP_12:             8,
	STEP_16:             9,

	FALL_SHORT:          10,
	FALL_MEDIUM:         11,
	FALL_FAR:            12,

	JUMP_PAD:            13,                               // boing sound at origin, jump sound on player

	JUMP:                14,
	WATER_TOUCH:         15,                               // foot touches
	WATER_LEAVE:         16,                               // foot leaves
	WATER_UNDER:         17,                               // head touches
	WATER_CLEAR:         18,                               // head leaves

	ITEM_PICKUP:         29,                               // normal item pickups are predictable
	GLOBAL_ITEM_PICKUP:  20,                               // powerup / team sounds are broadcast to everyone

	NOAMMO:              21,
	CHANGE_WEAPON:       22,
	FIRE_WEAPON:         23,

	USE_ITEM0:           24,
	USE_ITEM1:           25,
	USE_ITEM2:           26,
	USE_ITEM3:           27,
	USE_ITEM4:           28,
	USE_ITEM5:           29,
	USE_ITEM6:           30,
	USE_ITEM7:           31,
	USE_ITEM8:           32,
	USE_ITEM9:           33,
	USE_ITEM10:          34,
	USE_ITEM11:          35,
	USE_ITEM12:          36,
	USE_ITEM13:          37,
	USE_ITEM14:          38,
	USE_ITEM15:          39,

	ITEM_RESPAWN:        40,
	ITEM_POP:            41,
	PLAYER_TELEPORT_IN:  42,
	PLAYER_TELEPORT_OUT: 43,

	GRENADE_BOUNCE:      44,                               // eventParm will be the soundindex

	GENERAL_SOUND:       45,
	GLOBAL_SOUND:        46,                               // no attenuation
	GLOBAL_TEAM_SOUND:   47,

	BULLET_HIT_FLESH:    48,
	BULLET_HIT_WALL:     49,

	MISSILE_HIT:         50,
	MISSILE_MISS:        51,
	MISSILE_MISS_METAL:  52,
	RAILTRAIL:           53,
	SHOTGUN:             54,
	BULLET:              55,                               // otherEntity is the shooter

	PAIN:                56,
	DEATH1:              57,
	DEATH2:              58,
	DEATH3:              59,
	OBITUARY:            60,

	POWERUP_QUAD:        61,
	POWERUP_BATTLESUIT:  62,
	POWERUP_REGEN:       63,

	GIB_PLAYER:          64,                               // gib a previously living player
	SCOREPLUM:           65,                               // score plum

	DEBUG_LINE:          66,
	STOPLOOPINGSOUND:    67,
	TAUNT:               68,
	TAUNT_YES:           69,
	TAUNT_NO:            70,
	TAUNT_FOLLOWME:      71,
	TAUNT_GETFLAG:       72,
	TAUNT_GUARDBASE:     73,
	TAUNT_PATROL:        74
};

/**
 * Animations
 */
// Flip the togglebit every time an animation
// changes so a restart of the same anim can be detected.
var ANIM_TOGGLEBIT = 128;

var ANIM = {
	BOTH_DEATH1:         0,
	BOTH_DEAD1:          1,
	BOTH_DEATH2:         2,
	BOTH_DEAD2:          3,
	BOTH_DEATH3:         4,
	BOTH_DEAD3:          5,

	TORSO_GESTURE:       6,

	TORSO_ATTACK:        7,
	TORSO_ATTACK2:       8,

	TORSO_DROP:          9,
	TORSO_RAISE:         10,

	TORSO_STAND:         11,
	TORSO_STAND2:        12,

	LEGS_WALKCR:         13,
	LEGS_WALK:           14,
	LEGS_RUN:            15,
	LEGS_BACK:           16,
	LEGS_SWIM:           17,

	LEGS_JUMP:           18,
	LEGS_LAND:           19,

	LEGS_JUMPB:          20,
	LEGS_LANDB:          21,

	LEGS_IDLE:           22,
	LEGS_IDLECR:         23,

	LEGS_TURN:           24,

	TORSO_GETFLAG:       25,
	TORSO_GUARDBASE:     26,
	TORSO_PATROL:        27,
	TORSO_FOLLOWME:      28,
	TORSO_AFFIRMATIVE:   29,
	TORSO_NEGATIVE:      30,

	MAX:                 31,

	LEGS_BACKCR:         32,
	LEGS_BACKWALK:       33,
	FLAG_RUN:            34,
	FLAG_STAND:          35,
	FLAG_STAND2RUN:      36,

	MAX_TOTALANIMATIONS: 37
};

// Means of death
var MOD = {
	UNKNOWN:        0,
	SHOTGUN:        1,
	GAUNTLET:       2,
	MACHINEGUN:     3,
	GRENADE:        4,
	GRENADE_SPLASH: 5,
	ROCKET:         6,
	ROCKET_SPLASH:  7,
	PLASMA:         8,
	PLASMA_SPLASH:  9,
	RAILGUN:        10,
	LIGHTNING:      11,
	BFG:            12,
	BFG_SPLASH:     13,
	WATER:          14,
	SLIME:          15,
	LAVA:           16,
	CRUSH:          17,
	TELEFRAG:       18,
	FALLING:        19,
	SUICIDE:        20,
	TARGET_LASER:   21,
	TRIGGER_HURT:   22,
	GRAPPLE:        23
};

	var DEFAULT_GRAVITY = 800;

var JUMP_VELOCITY = 270;
var MAX_CLIP_PLANES = 5;
var MIN_WALK_NORMAL = 0.7;
var STEPSIZE = 18;
var OVERCLIP = 1.001;
var DEFAULT_VIEWHEIGHT = 26;

var PmoveInfo = function () {
	this.ps        = null;
	this.cmd       = null;
	this.frameTime = 0;
	this.mins      = [0, 0, 0];
	this.maxs      = [0, 0, 0];
	//this.tracemask = 0;                                    // collide against these surfaces
	//this.framecount = 0;

	// results (out)
	//this.numtouch = 0;
	//this.touchents = null; //[MAXTOUCH];
	this.xyspeed   = 0;

	// callbacks to test the world
	// these will be different functions during game and cgame
	this.trace     = null;
};

var GameItemDesc = function (classname, pickupSound, models, icon, pickupName, quantity, giType, giTag, precache, sounds) {
	this.classname   = classname;                           // spawning name
	this.pickupSound = pickupSound;
	this.models      = models;
	this.icon        = icon;
	this.pickupName  = pickupName;
	this.quantity    = quantity;
	this.giType      = giType;                              // IT_* flags
	this.giTag       = giTag;
	this.precache    = precache;
	this.sounds      = sounds;
};

var Animation = function () {
	this.firstFrame  = 0;
	this.numFrames   = 0;
	this.loopFrames  = 0;                                  // 0 to numFrames
	this.frameLerp   = 0;                                  // msec between frames
	this.initialLerp = 0;                                  // msec to get to first frame
	this.reversed    = false;                              // true if animation is reversed
	this.flipflop    = false;                              // true if animation should flipflop back to base
};

	/**
 * CanItemBeGrabbed
 *
 * Returns false if the item should not be picked up.
 * This needs to be the same for client side prediction and server use.
 */
function CanItemBeGrabbed(gametype, ent, ps) {
	// TODO Why is this crashing
	// if (ent.modelIndex < 1 || ent.modelIndex >= itemList.length) {
	// 	throw new Error('CanItemBeGrabbed: index out of range'); /* ERR_DROPPED */
	// }
	
	var item = itemList[ent.modelIndex];
	
	switch (item.giType) {
		case IT.WEAPON:
			return true;	// weapons are always picked up
		
		case IT.AMMO:
			if (ps.ammo[ item.giTag ] >= 200) {
				return false;		// can't hold any more
			}
			return true;
		
		case IT.ARMOR:
			if (ps.stats[STAT.ARMOR] >= ps.stats[STAT.MAX_HEALTH] * 2) {
				return false;
			}
			
			return true;
		
		case IT.HEALTH:
			// Small and mega healths will go over the max, otherwise
			// don't pick up if already at max.
			if (item.quantity == 5 || item.quantity == 100) {
				if (ps.stats[STAT.HEALTH] >= ps.stats[STAT.MAX_HEALTH] * 2) {
					return false;
				}
				
				return true;
			}			
			if (ps.stats[STAT.HEALTH] >= ps.stats[STAT.MAX_HEALTH]) {
				return false;
			}
			return true;
		
		case IT.POWERUP:
			return true;	// powerups are always picked up
		
	// 	case IT.TEAM: // team items, such as flags
	// 		if( gametype == GT.CTF ) {
	// 			// ent.modelIndex2 is non-zero on items if they are dropped
	// 			// we need to know this because we can pick up our dropped flag (and return it)
	// 			// but we can't pick up our flag at base
	// 			if (ps.persistant[PERS_TEAM] == TEAM_RED) {
	// 				if (item.giTag == PW_BLUEFLAG ||
	// 					(item.giTag == PW_REDFLAG && ent.modelIndex2) ||
	// 					(item.giTag == PW_REDFLAG && ps.powerups[PW_BLUEFLAG]) )
	// 					return true;
	// 			} else if (ps.persistant[PERS_TEAM] == TEAM_BLUE) {
	// 				if (item.giTag == PW_REDFLAG ||
	// 					(item.giTag == PW_BLUEFLAG && ent.modelIndex2) ||
	// 					(item.giTag == PW_BLUEFLAG && ps.powerups[PW_REDFLAG]) )
	// 					return true;
	// 			}
	// 		}
	// 
	// 		return false;
		
		case IT.HOLDABLE:
			// Can only hold one item at a time
			if (ps.stats[STAT.HOLDABLE_ITEM]) {
				return false;
			}
			return true;
		
	// 	case IT.BAD:
	// 		log( ERR_DROP, "BG_CanItemBeGrabbed: IT_BAD" );
		
		default:
			break;
	}
	
	return false;
}

/**
 * AddPredictableEventToPlayerstate
 *
 * Handles the sequence numbers.
 */
function AddPredictableEventToPlayerstate(ps, newEvent, eventParm) {
	ps.events[ps.eventSequence % MAX_PS_EVENTS] = newEvent;
	ps.eventParms[ps.eventSequence % MAX_PS_EVENTS] = eventParm;
	ps.eventSequence++;
}

/**
 * PlayerStateToEntityState
 *
 * This is done after each set of usercmd_t on the server,
 * and after local prediction on the client
 */
function PlayerStateToEntityState(ps, es) {
	/*if (ps.pm_type === PM_INTERMISSION || ps.pm_type === PM_SPECTATOR) {
		es.eType = ET.INVISIBLE;
	} else if ( ps.stats[STAT_HEALTH] <= GIB_HEALTH ) {
		es.eType = ET.INVISIBLE;
	} else {
		es.eType = ET.PLAYER;
	}*/

	es.number = ps.clientNum;
	es.eType = ET.PLAYER;

	es.pos.trType = TR.INTERPOLATE;
	vec3.set(ps.origin, es.pos.trBase);
	vec3.set(ps.velocity, es.pos.trDelta);

	es.apos.trType = TR.INTERPOLATE;
	vec3.set(ps.viewangles, es.apos.trBase);

	es.angles2[qm.YAW] = ps.movementDir;
	es.legsAnim = ps.legsAnim;
	es.torsoAnim = ps.torsoAnim;
	es.clientNum = ps.clientNum;                  // ET_PLAYER looks here instead of at number
	                                             // so corpses can also reference the proper config
	es.eFlags = ps.eFlags;
	if (ps.stats[STAT.HEALTH] <= 0) {
		es.eFlags |= EF.DEAD;
	} else {
		es.eFlags &= ~EF.DEAD;
	}

	if (ps.externalEvent) {
		es.event = ps.externalEvent;
		es.eventParm = ps.externalEventParm;
	} else if (ps.entityEventSequence < ps.eventSequence) {
		if (ps.entityEventSequence < ps.eventSequence - MAX_PS_EVENTS) {
			ps.entityEventSequence = ps.eventSequence - MAX_PS_EVENTS;
		}
		var seq = ps.entityEventSequence % MAX_PS_EVENTS;
		es.event = ps.events[seq] | ((ps.entityEventSequence & 3) << 8);
		es.eventParm = ps.eventParms[seq];
		ps.entityEventSequence++;
	}

	es.weapon = ps.weapon;
	es.groundEntityNum = ps.groundEntityNum;

	es.powerups = 0;
	for (var i = 0; i < MAX_POWERUPS; i++) {
		if (ps.powerups[i]) {
			es.powerups |= 1 << i;
		}
	}

	es.loopSound = ps.loopSound;
	es.generic1 = ps.generic1;
}

/**
 * EvaluateTrajectory
 */
function EvaluateTrajectory(tr, atTime, result) {
	var deltaTime;
	var phase;

	switch (tr.trType) {
		case TR.STATIONARY:
		case TR.INTERPOLATE:
			vec3.set(tr.trBase, result);
			break;

		case TR.LINEAR:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime, [0, 0, 0]), result);
			break;

		case TR.SINE:
			deltaTime = (atTime - tr.trTime) / tr.trDuration;
			phase = Math.sin(deltaTime * Math.PI * 2);
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, phase, [0, 0, 0]), result);
			break;

		case TR.LINEAR_STOP:
			if (atTime > tr.trTime + tr.trDuration) {
				atTime = tr.trTime + tr.trDuration;
			}
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			if (deltaTime < 0) {
				deltaTime = 0;
			}
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime, [0, 0, 0]), result);
			break;
		case TR.GRAVITY:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime, [0, 0, 0]), result);
			result[2] -= 0.5 * DEFAULT_GRAVITY * deltaTime * deltaTime;  // FIXME: local gravity...
			break;
		default:
			com.error(sh.Err.DROP, 'EvaluateTrajectory: unknown trType: ' + tr.trType);
			break;
	}
}

/**
 * EvaluateTrajectoryDelta
 * 
 * For determining velocity at a given time
 */
function EvaluateTrajectoryDelta(tr, atTime, result) {
	var deltaTime;
	var phase;

	switch (tr.trType) {
		case TR.STATIONARY:
		case TR.INTERPOLATE:
			result[0] = result[1] = result[2] = 0;
			break;
		case TR.LINEAR:
			vec3.set(tr.trDelta, result);
			break;
		case TR.SINE:
			deltaTime = (atTime - tr.trTime) / tr.trDuration;
			phase = Math.cos(deltaTime * Math.PI * 2);  // derivative of sin = cos
			phase *= 0.5;
			vec3.scale(tr.trDelta, phase, result);
			break;
		case TR.LINEAR_STOP:
			if (atTime > tr.trTime + tr.trDuration) {
				result[0] = result[1] = result[2] = 0;
				return;
			}
			vec3.set(tr.trDelta, result);
			break;
		case TR.GRAVITY:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.set(tr.trDelta, result);
			result[2] -= DEFAULT_GRAVITY * deltaTime;  // FIXME: local gravity...
			break;
		default:
			com.error(sh.Err.DROP, 'EvaluateTrajectoryDelta: unknown trType: ' + tr.trType);
			break;
	}
}

/**
 * TouchJumpPad
 */
function TouchJumpPad(ps, jumppad) {
	// If we didn't hit this same jumppad the previous frame
	// then don't play the event sound again if we are in a fat trigger
	/*if (ps.jumppad_ent !== jumppad.number) {		
		vectoangles( jumppad.origin2, angles);
		p = fabs( AngleNormalize180( angles[qm.PITCH] ) );
		if( p < 45 ) {
			effectNum = 0;
		} else {
			effectNum = 1;
		}
		BG_AddPredictableEventToPlayerstate( EV_JUMP_PAD, effectNum, ps );
	}*/
	// remember hitting this jumppad this frame
	ps.jumppad_ent = jumppad.number;
	ps.jumppad_frame = ps.pmove_framecount;

	// give the player the velocity from the jumppad
	vec3.set(jumppad.origin2, ps.velocity);
}

	var q3movement_stopspeed = 100.0;
var q3movement_duckScale = 0.25;
var q3movement_jumpvelocity = 50;
var q3movement_accelerate = 10.0;
var q3movement_airaccelerate = 1.0;
var q3movement_flyaccelerate = 8.0;
var q3movement_friction = 6.0;
var q3movement_flightfriction = 3.0;
var q3movement_playerRadius = 10.0;

// TODO Move these into a PmoveLocals structure?
var forward = [0, 0, 0];
var right = [0, 0, 0];
var up = [0, 0, 0];
var groundTrace;
var groundPlane;
var walking;
var msec;

/**
 * Pmove
 */
function Pmove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	// TODO WHY DOES THIS HAPPEN
	if (cmd.serverTime < ps.commandTime) {
		//com.error(sh.Err.DROP, 'Pmove: cmd.serverTime < ps.commandTime', cmd.serverTime, ps.commandTime);
		return;  // should not happen
	}

	if (cmd.serverTime > ps.commandTime + 1000) {
		ps.commandTime = cmd.serverTime - 1000;
	}

	ps.pmove_framecount = (ps.pmove_framecount+1) & ((1<<PMOVEFRAMECOUNTBITS)-1);

	// Chop the move up if it is too long, to prevent framerate
	// dependent behavior.
	while (ps.commandTime != cmd.serverTime) {
		msec = cmd.serverTime - ps.commandTime;

		if (msec < 1) {
			msec = 1;
		} else if (msec > 66) {
			msec = 66;
		}

		PmoveSingle(pm);

		if (pm.ps.pm_flags & PMF.JUMP_HELD) {
			pm.cmd.upmove = 20;
		}
	}
}

/**
 * PmoveSingle
 */
function PmoveSingle(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	// Make sure walking button is clear if they are running, to avoid
	// proxy no-footsteps cheats.
	if (Math.abs(pm.cmd.forwardmove) > 64 || Math.abs(pm.cmd.rightmove) > 64) {
		pm.cmd.buttons &= ~BUTTON.WALKING;
	}

	// Set the firing flag for continuous beam weapons.
	if ( !(ps.pm_flags & PMF.RESPAWNED) && ps.pm_type !== PM.INTERMISSION && ps.pm_type !== PM.NOCLIP
		&& (pm.cmd.buttons & BUTTON.ATTACK) && ps.ammo[ps.weapon]) {
		ps.eFlags |= EF.FIRING;
	} else {
		ps.eFlags &= ~EF.FIRING;
	}

	// Clear the respawned flag if attack and use are cleared
	if (ps.stats[STAT.HEALTH] > 0 && 
		!(pm.cmd.buttons & (BUTTON.ATTACK | BUTTON.USE_HOLDABLE))) {
		ps.pm_flags &= ~PMF.RESPAWNED;
	}

	// Determine the time.
	ps.commandTime = cmd.serverTime;
	pm.frameTime = msec * 0.001;

	// Update our view angles.
	UpdateViewAngles(ps, cmd);
	qm.AnglesToVectors(ps.viewangles, forward, right, up);

	// Make sure walking button is clear if they are running, to avoid
	// proxy no-footsteps cheats.
	if (Math.abs(cmd.forwardmove) > 64 || Math.abs(cmd.rightmove) > 64) {
		cmd.buttons &= ~BUTTON.WALKING;
	}

	if (pm.cmd.upmove < 10) {
		// Not holding jump.
		ps.pm_flags &= ~PMF.JUMP_HELD;
	}

	// Decide if backpedaling animations should be used
	if (cmd.forwardmove < 0) {
		ps.pm_flags |= PMF.BACKWARDS_RUN;
	} else if (pm.cmd.forwardmove > 0 || (cmd.forwardmove === 0 && cmd.rightmove)) {
		ps.pm_flags &= ~PMF.BACKWARDS_RUN;
	}

	if (ps.pm_type >= PM.DEAD) {
		cmd.forwardmove = 0;
		cmd.rightmove = 0;
		cmd.upmove = 0;
	}

	// if ( pm->ps->pm_type == PM_SPECTATOR ) {
	// 	PM_CheckDuck ();
	// 	PM_FlyMove ();
	// 	PM_DropTimers ();
	// 	return;
	// }

	// if ( pm->ps->pm_type == PM_NOCLIP ) {
	// 	PM_NoclipMove ();
	// 	PM_DropTimers ();
	// 	return;
	// }

	// if (pm->ps->pm_type == PM_FREEZE) {
	// 	return;		// no movement at all
	// }

	// if ( pm->ps->pm_type == PM_INTERMISSION || pm->ps->pm_type == PM_SPINTERMISSION) {
	// 	return;		// no movement at all
	// }

	// // set watertype, and waterlevel
	// PM_SetWaterLevel();
	// pml.previous_waterlevel = pmove->waterlevel;

	// Set mins, maxs and viewheight.
	CheckDuck(pm);

	// Set ground entity.
	GroundTrace(pm);

	if (ps.pm_type === PM.DEAD) {
		DeadMove(pm);
	}

	// Kill animation timers.
	DropTimers(pm);

	//FlyMove(pm);
	if (walking) {
		WalkMove(pm);
	} else {
		AirMove(pm);
	}

	GroundTrace(pm);

	// Weapons.
	UpdateWeapon(pm);

	// Torso animations.
	TorsoAnimation(pm);

	// Footstep events / legs animations.
	Footsteps(pm);
}

/**
 * CmdScale
 *
 * Returns the scale factor to apply to cmd movements
 * This allows the clients to use axial -127 to 127 values for all directions
 * without getting a sqrt(2) distortion in speed.
 */
function CmdScale(cmd, speed) {
	var max = Math.abs(cmd.forwardmove);
	if (Math.abs(cmd.rightmove) > max) {
		max = Math.abs(cmd.rightmove);
	}
	if (Math.abs(cmd.upmove) > max) {
		max = Math.abs(cmd.upmove);
	}
	if (!max) {
		return 0;
	}

	var total = Math.sqrt(cmd.forwardmove * cmd.forwardmove + cmd.rightmove * cmd.rightmove + cmd.upmove * cmd.upmove);
	var scale = speed * max / (127.0 * total);

	return scale;
}

/**
 * CheckDuck
 */
function CheckDuck(pm) {
	var ps = pm.ps;

	pm.mins[0] = -15;
	pm.mins[1] = -15;

	pm.maxs[0] = 15;
	pm.maxs[1] = 15;

	pm.mins[2] = MINS_Z;

	if (pm.pm_type === PM.DEAD) {
		pm.maxs[2] = -8;
		ps.viewheight = DEAD_VIEWHEIGHT;
		return;
	}

	if (pm.cmd.upmove < 0) {
		// duck
		ps.pm_flags |= PMF.DUCKED;
	} else {
		// stand up if possible
		if (ps.pm_flags & PMF.DUCKED) {
			// Try to stand up.
			pm.maxs[2] = 32;
			var trace = pm.trace(ps.origin, ps.origin, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
			if (!trace.allSolid) {
				ps.pm_flags &= ~PMF.DUCKED;
			}
		}
	}

	if (ps.pm_flags & PMF.DUCKED) {
		pm.maxs[2] = 16;
		ps.viewheight = CROUCH_VIEWHEIGHT;
	} else {
		pm.maxs[2] = 32;
		ps.viewheight = DEFAULT_VIEWHEIGHT;
	}
}

/**
 * CheckJump
 */
function CheckJump(pm) {
	var ps = pm.ps;

	if (pm.cmd.upmove < 10) {
		// not holding jump
		return false;
	}

	// must wait for jump to be released
	if (ps.pm_flags & PMF.JUMP_HELD) {
		// clear upmove so cmdscale doesn't lower running speed
		pm.cmd.upmove = 0;
		return false;
	}

	groundPlane = false; // jumping away
	walking = false;
	ps.pm_flags |= PMF.JUMP_HELD;

	ps.groundEntityNum = ENTITYNUM_NONE;
	ps.velocity[2] = JUMP_VELOCITY;
	AddEvent(pm, EV.JUMP);

	if (pm.cmd.forwardmove >= 0) {
		ForceLegsAnim(pm, ANIM.LEGS_JUMP);
		ps.pm_flags &= ~PMF.BACKWARDS_JUMP;
	} else {
		ForceLegsAnim(pm, ANIM.LEGS_JUMPB);
		ps.pm_flags |= PMF.BACKWARDS_JUMP;
	}

	return true;
}

/**
 * GroundTrace
 */
function GroundTrace(pm) {
	var ps = pm.ps;
	var point = [ps.origin[0], ps.origin[1], ps.origin[2] - 0.25];
	var trace = pm.trace(ps.origin, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

	groundTrace = trace;

	// Do something corrective if the trace starts in a solid.
	if (trace.allSolid) {
		// This will nudge us around and, if successful, copy its
		// new successful trace results into ours.
		if (!CorrectAllSolid(pm, trace)) {
			return;
		}
	}

	// If the trace didn't hit anything, we are in free fall.
	if (trace.fraction === 1.0) {
		GroundTraceMissed(pm);
		return;
	}

	// Check if getting thrown off the ground.
	if (ps.velocity[2] > 0 && vec3.dot(ps.velocity, trace.plane.normal) > 10 ) {
		// go into jump animation
		if (pm.cmd.forwardmove >= 0) {
			ForceLegsAnim(pm, ANIM.LEGS_JUMP);
			ps.pm_flags &= ~PMF.BACKWARDS_JUMP;
		} else {
			ForceLegsAnim(pm, ANIM.LEGS_JUMPB);
			ps.pm_flags |= PMF.BACKWARDS_JUMP;
		}

		ps.groundEntityNum = ENTITYNUM_NONE;
		groundPlane = false;
		walking = false;

		return;
	}

	if (trace.plane.normal[2] < MIN_WALK_NORMAL) {
		ps.groundEntityNum = ENTITYNUM_NONE;
		groundPlane = true;
		walking = false;

		return;
	}

	// TODO return entitynum in tracework
	ps.groundEntityNum = trace.entityNum;
	groundPlane = true;
	walking = true;
}

/**
 * CorrectAllSolid
 */
function CorrectAllSolid(pm, trace) {
	var ps = pm.ps;
	var point = [0, 0, 0];
	var tr;

	// Jitter around.
	for (var i = -1; i <= 1; i++) {
		for (var j = -1; j <= 1; j++) {
			for (var k = -1; k <= 1; k++) {
				vec3.set(ps.origin, point);
				point[0] += i;
				point[1] += j;
				point[2] += k;
				tr = pm.trace(point, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

				if (!tr.allSolid) {
					// Copy the results back into the original so GroundTrace can carry on.
					tr.clone(trace);

					return true;
				}
			}
		}
	}

	ps.groundEntityNum = ENTITYNUM_NONE;
	groundPlane = false;
	walking = false;

	return false;
}

/**
 * GroundTraceMissed
 */
function GroundTraceMissed(pm) {
	var ps = pm.ps;

	if (ps.groundEntityNum !== ENTITYNUM_NONE) {
		// If they aren't in a jumping animation and the ground is a ways away, force into it.
		// If we didn't do the trace, the player would be backflipping down staircases.
		var point = vec3.set(ps.origin, [0, 0, 0]);
		point[2] -= 64;

		var trace = pm.trace(ps.origin, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
		if (trace.fraction === 1.0) {
			if (pm.cmd.forwardmove >= 0) {
				ForceLegsAnim(pm, ANIM.LEGS_JUMP);
				ps.pm_flags &= ~PMF.BACKWARDS_JUMP;
			} else {
				ForceLegsAnim(pm, ANIM.LEGS_JUMPB);
				ps.pm_flags |= PMF.BACKWARDS_JUMP;
			}
		}
	}

	pm.ps.groundEntityNum = ENTITYNUM_NONE;
	groundPlane = false;
	walking = false;
}

/**
 * DeadMove
 */
function DeadMove(pm) {
	if (!walking) {
		return;
	}

	var ps = pm.ps;

	// Extra friction.
	var forward = vec3.length(ps.velocity);
	forward -= 20;
	if (forward <= 0) {
		ps.velocity[0] = ps.velocity[1] = ps.velocity[2] = 0;
	} else {
		vec3.normalize(ps.velocity);
		vec3.scale(ps.velocity, forward);
	}
}



/**
 * FlyMove
 */
function FlyMove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	// normal slowdown
	Friction(pm, true);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = [0, 0, 0];
	for (var i = 0; i < 3; i++) {
		wishvel[i] = scale * forward[i]*cmd.forwardmove + scale * right[i]*cmd.rightmove;
	}
	wishvel[2] += cmd.upmove;
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, [0, 0, 0]);

	Accelerate(pm, wishdir, wishspeed, q3movement_flyaccelerate);
	StepSlideMove(pm, false);
}

/**
 * AirMove
 */
function AirMove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	Friction(pm);

	// Set the movementDir so clients can rotate the legs for strafing.
	SetMovementDir(pm);

	// project moves down to flat plane
	forward[2] = 0;
	right[2] = 0;
	vec3.normalize(forward);
	vec3.normalize(right);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = [0, 0, 0];
	for (var i = 0 ; i < 2 ; i++) {
		wishvel[i] = forward[i]*cmd.forwardmove + right[i]*cmd.rightmove;
	}
	wishvel[2] = 0;
	var wishspeed = vec3.length(wishvel) * scale;
	var wishdir = vec3.normalize(wishvel, [0, 0, 0]);

	// Not on ground, so little effect on velocity.
	Accelerate(pm, wishdir, wishspeed, q3movement_airaccelerate);

	// We may have a ground plane that is very steep, even though
	// we don't have a groundentity. Slide along the steep plane.
	if (groundPlane) {
		ClipVelocity(ps.velocity, groundTrace.plane.normal, ps.velocity, OVERCLIP);
	}

	StepSlideMove(pm, true);
}

/**
 * WalkMove
 */
function WalkMove(pm) {
	var ps = pm.ps;
	var cmd = pm.cmd;

	if (CheckJump(pm)) {
		AirMove(pm);
		return;
	}

	Friction(pm);

	// Set the movementDir so clients can rotate the legs for strafing.
	SetMovementDir(pm);

	// Project moves down to flat plane.
	forward[2] = 0;
	right[2] = 0;

	// Project the forward and right directions onto the ground plane.
	forward = ClipVelocity(forward, groundTrace.plane.normal, OVERCLIP);
	right = ClipVelocity(right, groundTrace.plane.normal, OVERCLIP);	
	vec3.normalize(forward);
	vec3.normalize(right);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = [0, 0, 0];
	for (var i = 0 ; i < 3 ; i++ ) {
		wishvel[i] = forward[i]*cmd.forwardmove + right[i]*cmd.rightmove;
	}
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, [0, 0, 0]);
	wishspeed *= scale;

	// Clamp the speed lower if wading or walking on the bottom.
	/*if (pm.waterlevel) {
		float	waterScale;

		waterScale = pm.waterlevel / 3.0;
		waterScale = 1.0 - ( 1.0 - pm_swimScale ) * waterScale;
		if ( wishspeed > ps.speed * waterScale ) {
			wishspeed = ps.speed * waterScale;
		}
	}*/

	// When a player gets hit, they temporarily lose
	// full control, which allows them to be moved a bit.
	var accelerate = q3movement_accelerate;

	if ((groundTrace.surfaceFlags & SURF.SLICK ) || ps.pm_flags & PMF.TIME_KNOCKBACK) {
		accelerate = q3movement_airaccelerate;
	}

	Accelerate(pm, wishdir, wishspeed, accelerate);

	if ((groundTrace.surfaceFlags & SURF.SLICK ) || ps.pm_flags & PMF.TIME_KNOCKBACK) {
		ps.velocity[2] -= ps.gravity * pm.frameTime;
	}

	var vel = vec3.length(ps.velocity);

	// Slide along the ground plane.
	ps.velocity = ClipVelocity(ps.velocity, groundTrace.plane.normal, OVERCLIP);

	// Don't decrease velocity when going up or down a slope.
	vec3.normalize(ps.velocity);
	vec3.scale(ps.velocity, vel);

	// Don't do anything if standing still.
	if (!ps.velocity[0] && !ps.velocity[1]) {
		return;
	}

	StepSlideMove(pm, false);
}

/**
 * SetMovementDir
 * 
 * Determine the rotation of the legs relative
 * to the facing dir
 */
function SetMovementDir(pm) {
	var ps = pm.ps;

	if (pm.cmd.forwardmove || pm.cmd.rightmove) {
		if (pm.cmd.rightmove === 0 && pm.cmd.forwardmove > 0) {
			ps.movementDir = 0;
		} else if (pm.cmd.rightmove < 0 && pm.cmd.forwardmove > 0) {
			ps.movementDir = 1;
		} else if (pm.cmd.rightmove < 0 && pm.cmd.forwardmove === 0) {
			ps.movementDir = 2;
		} else if (pm.cmd.rightmove < 0 && pm.cmd.forwardmove < 0) {
			ps.movementDir = 3;
		} else if (pm.cmd.rightmove === 0 && pm.cmd.forwardmove < 0) {
			ps.movementDir = 4;
		} else if (pm.cmd.rightmove > 0 && pm.cmd.forwardmove < 0) {
			ps.movementDir = 5;
		} else if (pm.cmd.rightmove > 0 && pm.cmd.forwardmove === 0) {
			ps.movementDir = 6;
		} else if (pm.cmd.rightmove > 0 && pm.cmd.forwardmove > 0) {
			ps.movementDir = 7;
		}
	} else {
		// If they aren't actively going directly sideways,
		// change the animation to the diagonal so they
		// don't stop too crooked.
		if (ps.movementDir === 2) {
			ps.movementDir = 1;
		} else if (ps.movementDir === 6) {
			ps.movementDir = 7;
		} 
	}
}

/**
 * Friction
 */
function Friction(pm, flying) {
	var ps = pm.ps;

	var vec = vec3.set(ps.velocity, [0, 0, 0]);
	if (walking) {
		vec[2] = 0;	// ignore slope movement
	}

	var speed = vec3.length(vec);
	if (speed < 1) {
		ps.velocity[0] = 0;
		ps.velocity[1] = 0; // allow sinking underwater
		// FIXME: still have z friction underwater?
		return;
	}

	var drop = 0;

	// Apply ground friction.
	//if (pm.waterlevel <= 1) {
		if (walking && !(groundTrace.surfaceFlags & SURF.SLICK) ) {
			// if getting knocked back, no friction
			if (!(ps.pm_flags & PMF.TIME_KNOCKBACK)) {
				var control = speed < q3movement_stopspeed ? q3movement_stopspeed : speed;
				drop += control * q3movement_friction * pm.frameTime;
			}
		}
	//}

	// Apply water friction even if just wading.
	/*if (pm.waterlevel) {
		drop += speed*pm_waterfriction*pm.waterlevel*pml.frametime;
	}*/

	if (flying) {
		drop += speed * q3movement_flightfriction * pm.frameTime;
	}

	var newspeed = speed - drop;
	if (newspeed < 0) {
		newspeed = 0;
	}
	newspeed /= speed;

	vec3.scale(ps.velocity, newspeed);
}

/**
 * Accelerate
 */
function Accelerate(pm, wishdir, wishspeed, accel) {
	var ps = pm.ps;
	var currentspeed = vec3.dot(ps.velocity, wishdir);
	var addspeed = wishspeed - currentspeed;

	if (addspeed <= 0) {
		return;
	}

	var accelspeed = accel * pm.frameTime * wishspeed;

	if (accelspeed > addspeed) {
		accelspeed = addspeed;
	}

	vec3.add(ps.velocity, vec3.scale(wishdir, accelspeed, [0, 0, 0]));
}

/**
 * ClipVelocity
 */
function ClipVelocity(vel, normal, overbounce) {
	var backoff = vec3.dot(vel, normal);

	if (backoff < 0) {
		backoff *= overbounce;
	} else {
		backoff /= overbounce;
	}

	var change = vec3.scale(normal, backoff, [0, 0, 0]);
	return vec3.subtract(vel, change, [0, 0, 0]);
}

/**
 * SlideMove
 */
function SlideMove(pm, gravity) {
	var ps = pm.ps;
	var endVelocity = [0, 0, 0];
	var time_left = pm.frameTime;
	var planes = [];
	var numbumps = 4;
	var end = [0, 0, 0];

	if (gravity) {
		vec3.set(ps.velocity, endVelocity);
		endVelocity[2] -= ps.gravity * time_left;
		ps.velocity[2] = (ps.velocity[2] + endVelocity[2]) * 0.5;

		if (groundPlane) {
			// slide along the ground plane
			ps.velocity = ClipVelocity(ps.velocity, groundTrace.plane.normal, OVERCLIP);
		}
	}

	// Never turn against the ground plane.
	if (groundPlane) {
		planes.push(vec3.set(groundTrace.plane.normal, [0, 0, 0]));
	}

	// Never turn against original velocity.
	planes.push(vec3.normalize(ps.velocity, [0, 0, 0]));

	for (var bumpcount = 0; bumpcount < numbumps; bumpcount++) {
		// Calculate position we are trying to move to.
		vec3.add(ps.origin, vec3.scale(ps.velocity, time_left, [0, 0, 0]), end);

		// See if we can make it there.
		var trace = pm.trace(ps.origin, end, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

		if (trace.allSolid) {
			// Entity is completely trapped in another solid.
			ps.velocity[2] = 0; // don't build up falling damage, but allow sideways acceleration
			return false;
		}

		if (trace.fraction > 0) {
			// Actually covered some distance.
			vec3.set(trace.endPos, ps.origin);
		}

		if (trace.fraction === 1) {
			 break;  // moved the entire distance
		}

		// Save entity for contact.
		//PM_AddTouchEnt( trace.entityNum );

		time_left -= time_left * trace.fraction;

		if (planes.length >= MAX_CLIP_PLANES) {
			// this shouldn't really happen
			ps.velocity = [0, 0, 0];
			return false;
		}

		//
		// If this is the same plane we hit before, nudge velocity
		// out along it, which fixes some epsilon issues with
		// non-axial planes.
		//
		for (var i = 0; i < planes.length; i++) {
			if (vec3.dot(trace.plane.normal, planes[i]) > 0.99) {
				vec3.add(ps.velocity, trace.plane.normal);
				break;
			}
		}
		if (i < planes.length) {
			continue;
		}
		planes.push(vec3.set(trace.plane.normal, [0, 0, 0]));

		//
		// Modify velocity so it parallels all of the clip planes.
		//

		// Find a plane that it enters.
		for(var i = 0; i < planes.length; ++i) {
			var into = vec3.dot(ps.velocity, planes[i]);
			if (into >= 0.1) {
				continue;  // move doesn't interact with the plane
			}

			// Slide along the plane.
			var clipVelocity = ClipVelocity(ps.velocity, planes[i], OVERCLIP);
			var endClipVelocity = ClipVelocity(endVelocity, planes[i], OVERCLIP);

			// See if there is a second plane that the new move enters.
			for (var j = 0; j < planes.length; j++) {
				if (j === i) {
					continue;
				}
				if (vec3.dot(clipVelocity, planes[j]) >= 0.1) {
					continue;  // move doesn't interact with the plane
				}

				// Try clipping the move to the plane.
				clipVelocity = ClipVelocity(clipVelocity, planes[j], OVERCLIP);
				endClipVelocity = ClipVelocity(endClipVelocity, planes[j], OVERCLIP);

				// See if it goes back into the first clip plane.
				if (vec3.dot(clipVelocity, planes[i]) >= 0) {
					continue;
				}

				// Slide the original velocity along the crease.
				var dir = vec3.cross(planes[i], planes[j], [0, 0, 0]);
				vec3.normalize(dir);
				var d = vec3.dot(dir, ps.velocity);
				vec3.scale(dir, d, clipVelocity);

				vec3.cross(planes[i], planes[j], dir);
				vec3.normalize(dir);
				d = vec3.dot(dir, endVelocity);
				vec3.scale(dir, d, endClipVelocity);

				// See if there is a third plane the the new move enters.
				for (var k = 0; k < planes.length; k++) {
					if ( k == i || k == j ) {
						continue;
					}
					if (vec3.dot(clipVelocity, planes[k]) >= 0.1) {
						continue;  // move doesn't interact with the plane
					}
					// Stop dead at a tripple plane interaction.
					ps.velocity = [0, 0, 0];
					return false;
				}
			}

			// If we have fixed all interactions, try another move.
			vec3.set(clipVelocity, ps.velocity);
			vec3.set(endClipVelocity, endVelocity);
			break;
		}
	}

	if (gravity) {
		vec3.set(endVelocity, ps.velocity);
	}

	return bumpcount === 0;
}

/**
 * StepSlideMove
 */
function StepSlideMove(pm, gravity) {
	var ps = pm.ps;

	// Make sure these are stored BEFORE the initial SlideMove.
	var start_o = vec3.set(ps.origin, [0, 0, 0]);
	var start_v = vec3.set(ps.velocity, [0, 0, 0]);

	// We got exactly where we wanted to go first try.
	if (SlideMove(pm, gravity)) {
		return;
	}
	
	// Never step up when you still have up velocity.
	var up = [0, 0, 1];
	var down = vec3.set(start_o, [0, 0, 0]);
	down[2] -= STEPSIZE;

	var trace = pm.trace(start_o, down, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	if (ps.velocity[2] > 0 && (trace.fraction === 1.0 || vec3.dot(trace.plane.normal, up) < 0.7)) {
		return;
	}

	// Test the player position if they were a stepheight higher.
	vec3.set(start_o, up);
	up[2] += STEPSIZE;

	trace = pm.trace(start_o, up, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	if (trace.allSolid) {
		return;  // can't step up
	}

	// Try slidemove from this position.
	vec3.set(trace.endPos, ps.origin);
	vec3.set(start_v, ps.velocity);
	SlideMove(pm, gravity);

	// Push down the final amount.
	var stepSize = trace.endPos[2] - start_o[2];
	vec3.set(ps.origin, down);
	down[2] -= stepSize;
	trace = pm.trace(ps.origin, down, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	if (!trace.allSolid) {
		vec3.set(trace.endPos, ps.origin);
	}
	if (trace.fraction < 1.0) {
		ps.velocity = ClipVelocity(ps.velocity, trace.plane.normal, OVERCLIP);
	}

	// Use the step move.
	var delta = ps.origin[2] - start_o[2];
	if (delta > 2) {
		if (delta < 7) {
			AddEvent(pm, EV.STEP_4);
		} else if (delta < 11) {
			AddEvent(pm, EV.STEP_8);
		} else if (delta < 15 ) {
			AddEvent(pm, EV.STEP_12);
		} else {
			AddEvent(pm, EV.STEP_16);
		}
	}
}

/**
 * UpdateViewAngles
 */
function UpdateViewAngles(ps, cmd) {
	if (ps.pm_type === PM.INTERMISSION || ps.pm_type === PM.SPINTERMISSION) {
		return;  // no view changes at all
	}

	if (ps.pm_type !== PM.SPECTATOR && ps.stats[STAT.HEALTH] <= 0) {
		return;  // no view changes at all
	}

	for (var i = 0; i < 3; i++) {
		// Circularly clamp uint16 to in16.
		var temp = (cmd.angles[i] + ps.delta_angles[i]) & 0xFFFF;
		if (temp > 0x7FFF) {
			temp = temp - 0xFFFF;
		}

		if (i === qm.PITCH) {
			// Don't let the player look up or down more than 90 degrees.
			if (temp > 16000) {
				ps.delta_angles[i] = 16000 - cmd.angles[i];
				temp = 16000;
			} else if (temp < -16000) {
				ps.delta_angles[i] = -16000 - cmd.angles[i];
				temp = -16000;
			}
		}

		ps.viewangles[i] = qm.ShortToAngle(temp);
	}
}

/**
 * DropTimers
 */
function DropTimers(pm) {
	var ps = pm.ps;

	// Drop misc timing counter.
	if (ps.pm_time) {
		if (msec >= ps.pm_time) {
			ps.pm_flags &= ~PMF.ALL_TIMES;
			ps.pm_time = 0;
		} else {
			ps.pm_time -= msec;
		}
	}
}

/**
 * UpdateWeapon
 */
function UpdateWeapon(pm) {
	var ps = pm.ps;

	// int		addTime;

	// Don't allow attack until all buttons are up
	if (ps.pm_flags & PMF.RESPAWNED) {
		return;
	}

	// // ignore if spectator
	// if ( pm->ps->persistant[PERS_TEAM] == TEAM_SPECTATOR ) {
	// 	return;
	// }

	// Check for dead player.
	if (ps.pm_type === PM.DEAD) {
		ps.weapon = WP.NONE;
		return;
	}

	// // check for item using
	// if ( pm->cmd.buttons & BUTTON_USE_HOLDABLE ) {
	// 	if ( ! ( pm->ps->pm_flags & PMF.USE_ITEM_HELD ) ) {
	// 		if ( bg_itemlist[pm->ps->stats[STAT_HOLDABLE_ITEM]].giTag == HI_MEDKIT
	// 			&& pm->ps->stats[STAT_HEALTH] >= (pm->ps->stats[STAT_MAX_HEALTH] + 25) ) {
	// 			// don't use medkit if at max health
	// 		} else {
	// 			pm->ps->pm_flags |= PMF.USE_ITEM_HELD;
	// 			PM_AddEvent( EV_USE_ITEM0 + bg_itemlist[pm->ps->stats[STAT_HOLDABLE_ITEM]].giTag );
	// 			pm->ps->stats[STAT_HOLDABLE_ITEM] = 0;
	// 		}
	// 		return;
	// 	}
	// } else {
	// 	pm->ps->pm_flags &= ~PMF.USE_ITEM_HELD;
	// }

	// Make weapon function.
	if (ps.weaponTime > 0) {
		ps.weaponTime -= msec;
	}

	// Check for weapon change.
	// Can't change if weapon is firing, but can change
	// again if lowering or raising.
	if (ps.weaponTime <= 0 || ps.weaponState != WS.FIRING) {
		if (ps.weapon !== pm.cmd.weapon) {
			BeginWeaponChange(pm, pm.cmd.weapon);
		}
	}

	if (ps.weaponTime > 0) {
		return;
	}

	// Change weapon if time.
	if (ps.weaponState === WS.DROPPING) {
		FinishWeaponChange(pm);
		return;
	}

	if (ps.weaponState === WS.RAISING ) {
		ps.weaponState = WS.READY;
		if (ps.weapon === WP.GAUNTLET) {
			StartTorsoAnim(pm, ANIM.TORSO_STAND2);
		} else {
			StartTorsoAnim(pm, ANIM.TORSO_STAND);
		}
		return;
	}

	// Check for fire.
	if (!(pm.cmd.buttons & BUTTON.ATTACK)) {
		ps.weaponTime = 0;
		ps.weaponState = WS.READY;
		return;
	}
	
	// Start the animation even if out of ammo.
	// if (ps.weapon === WP.GAUNTLET) {
	// 	// The guantlet only "fires" when it actually hits something.
	// 	if (!pm.gauntletHit) {
	// 		ps.weaponTime = 0;
	// 		ps.weaponState = WS.READY;
	// 		return;
	// 	}
	// 	StartTorsoAnim(ANIM.TORSO_ATTACK2);
	// } else {
		StartTorsoAnim(pm, ANIM.TORSO_ATTACK);
	// }
	
	ps.weaponState = WS.FIRING;
	
	// Check for out of ammo.
	if (!ps.ammo[ps.weapon]) {
		AddEvent(pm, EV.NOAMMO);
		ps.weaponTime += 500;
		return;
	}
	
	// Take an ammo away if not infinite.
	if (ps.ammo[ps.weapon] !== -1) {
		ps.ammo[ps.weapon]--;
	}
	
	// Fire weapon.
	AddEvent(pm, EV.FIRE_WEAPON);

	var addTime = 0;

	switch (ps.weapon) {
		default:
		case WP.GAUNTLET:
			addTime = 400;
			break;
		case WP.LIGHTNING:
			addTime = 50;
			break;
		case WP.SHOTGUN:
			addTime = 1000;
			break;
		case WP.MACHINEGUN:
			addTime = 100;
			break;
		case WP.GRENADE_LAUNCHER:
			addTime = 800;
			break;
		case WP.ROCKET_LAUNCHER:
			addTime = 800;
			break;
		case WP.PLASMAGUN:
			addTime = 100;
			break;
		case WP.RAILGUN:
			addTime = 1500;
			break;
		case WP.BFG:
			addTime = 200;
			break;
		case WP.GRAPPLING_HOOK:
			addTime = 400;
			break;
	}

	// if (ps.powerups[PW_HASTE]) {
	// 	addTime /= 1.3;
	// }

	ps.weaponTime += addTime;
}

/**
 * BeginWeaponChange
 */
function BeginWeaponChange(pm, weapon) {
	var ps = pm.ps;

	if (weapon <= WP.NONE || weapon >= WP.NUM_WEAPONS) {
		return;
	}

	if (!(ps.stats[STAT.WEAPONS] & (1 << weapon))) {
		return;
	}
	
	if (ps.weaponState == WS.DROPPING) {
		return;
	}

	AddEvent(pm, EV.CHANGE_WEAPON);
	ps.weaponState = WS.DROPPING;
	ps.weaponTime += 200;
	StartTorsoAnim(pm, ANIM.TORSO_DROP);
}

/**
 * FinishWeaponChange
 */
function FinishWeaponChange(pm) {
	var ps = pm.ps;
	var weapon = pm.cmd.weapon;

	if (weapon < WP.NONE || weapon >= WP.NUM_WEAPONS) {
		weapon = WP.NONE;
	}
	if (!(ps.stats[STAT.WEAPONS] & (1 << weapon))) {
		weapon = WP.NONE;
	}

	ps.weapon = weapon;
	ps.weaponState = WS.RAISING;
	ps.weaponTime += 250;
	StartTorsoAnim(pm, ANIM.TORSO_RAISE);
}

/**
 * TorsoAnimation
 */
function TorsoAnimation(pm) {
	var ps = pm.ps;

	if (ps.weaponState === WS.READY) {
		if (ps.weapon == WP.GAUNTLET) {
			ContinueTorsoAnim(pm, ANIM.TORSO_STAND2);
		} else {
			ContinueTorsoAnim(pm, ANIM.TORSO_STAND);
		}
	}
}

/**
 * Footsteps
 */
function Footsteps(pm) {
	var ps = pm.ps;

	// Calculate speed and cycle to be used for
	// all cyclic walking effects.
	pm.xyspeed = Math.sqrt( ps.velocity[0] * ps.velocity[0] + ps.velocity[1] * ps.velocity[1]);

	if (ps.groundEntityNum === ENTITYNUM_NONE) {
		// if (ps.powerups[PW_INVULNERABILITY]) {
		// 	ContinueLegsAnim(pm, ANIM.LEGS_IDLECR);
		// }
		// Airborne leaves position in cycle intact, but doesn't advance.
		if (pm.waterlevel > 1) {
			ContinueLegsAnim(pm, ANIM.LEGS_SWIM);
		}
		return;
	}

	// If not trying to move.
	if (!pm.cmd.forwardmove && !pm.cmd.rightmove) {
		if (pm.xyspeed < 5) {
			ps.bobCycle = 0;  // start at beginning of cycle again
			if (ps.pm_flags & PMF.DUCKED) {
				ContinueLegsAnim(pm, ANIM.LEGS_IDLECR);
			} else {
				ContinueLegsAnim(pm, ANIM.LEGS_IDLE);
			}
		}
		return;
	}
	
	var footstep = false;
	var bobmove = 0.0;

	if (ps.pm_flags & PMF.DUCKED) {
		bobmove = 0.5;  // ducked characters bob much faster
		if (ps.pm_flags & PMF.BACKWARDS_RUN) {
			ContinueLegsAnim(pm, ANIM.LEGS_BACKCR);
		} else {
			ContinueLegsAnim(pm, ANIM.LEGS_WALKCR);
		}
		// Ducked characters never play footsteps.
	} else {
		if (!(pm.cmd.buttons & BUTTON.WALKING)) {
			bobmove = 0.4; // faster speeds bob faster
			if (ps.pm_flags & PMF.BACKWARDS_RUN) {
				ContinueLegsAnim(pm, ANIM.LEGS_BACK);
			}
			else {
				ContinueLegsAnim(pm, ANIM.LEGS_RUN);
			}
			footstep = true;
		} else {
			bobmove = 0.3;  // walking bobs slow
			if (ps.pm_flags & PMF.BACKWARDS_RUN) {
				ContinueLegsAnim(pm, ANIM.LEGS_BACKWALK);
			} else {
				ContinueLegsAnim(pm, ANIM.LEGS_WALK);
			}
		}
	}
	
	// Check for footstep / splash sounds.
	var old = ps.bobCycle;
	ps.bobCycle = parseInt(old + bobmove * msec, 10) % 256;

	// // If we just crossed a cycle boundary, play an apropriate footstep event.
	if (((old + 64) ^ (ps.bobCycle + 64)) & 128) {
	// 	if (pm.waterlevel === 0) {
	// 		// On ground will only play sounds if running
			if (footstep && !pm.noFootsteps) {
				AddEvent(pm, FootstepForSurface());
			}
	// 	} else if (pm.waterlevel === 1) {
	// 		// splashing
//			AddEvent(pm, EntityEvent.FOOTSPLASH);
	// 	} else if (pm.waterlevel === 2) {
	// 		// wading / swimming at surface
//			AddEvent(pm, EntityEvent.SWIM);
	// 	} else if (pm.waterlevel === 3) {
	// 		// no sound when completely underwater
	// 	}
	}
}

/**
 * FootstepForSurface
 */
function FootstepForSurface () {
	if (groundTrace.surfaceFlags & SURF.NOSTEPS) {
		return 0;
	}
	if (groundTrace.surfaceFlags & SURF.METALSTEPS) {
		return EV.FOOTSTEP_METAL;
	}
	return EV.FOOTSTEP;
}

/**
 * AddEvent
 */
function AddEvent(pm, newEvent) {
	AddPredictableEventToPlayerstate(pm.ps, newEvent, 0);
}

/**
 * StartTorsoAnim
 */
function StartTorsoAnim(pm, anim) {
	var ps = pm.ps;

	if (ps.pm_type >= PM.DEAD) {
		return;
	}

	ps.torsoAnim = ((ps.torsoAnim & ANIM_TOGGLEBIT) ^ ANIM_TOGGLEBIT ) | anim;
}

/**
 * StartLegsAnim
 */
function StartLegsAnim(pm, anim) {
	var ps = pm.ps;

	if (ps.pm_type >= PM.DEAD) {
		return;
	}

	if (ps.legsTimer > 0) {
		return;  // a high priority animation is running
	}

	ps.legsAnim = ((ps.legsAnim & ANIM_TOGGLEBIT ) ^ ANIM_TOGGLEBIT ) | anim;
}

/**
 * ContinueLegsAnim
 */
function ContinueLegsAnim(pm, anim) {
	var ps = pm.ps;

	if ((ps.legsAnim & ~ANIM_TOGGLEBIT) === anim) {
		return;
	}

	if (ps.legsTimer > 0) {
		return;  // a high priority animation is running
	}

	StartLegsAnim(pm, anim);
}

/**
 * ContinueTorsoAnim
 */
function ContinueTorsoAnim(pm, anim) {
	var ps = pm.ps;

	if ((ps.torsoAnim & ~ANIM_TOGGLEBIT) === anim) {
		return;
	}

	if (ps.torsoTimer > 0) {
		return;  // a high priority animation is running
	}

	StartTorsoAnim(pm, anim);
}

/**
 * ForceLegsAnim
 */
function ForceLegsAnim(pm, anim) {
	var ps = pm.ps;
	
	ps.legsTimer = 0;
	StartLegsAnim(pm, anim);
}
	// typedef struct gitem_s {
// 	char		*classname;	// spawning name
// 	char		*pickup_sound;
// 	char		*world_model[MAX_ITEM_MODELS];
// 
// 	char		*icon;
// 	char		*pickup_name;	// for printing on pickup
// 
// 	int			quantity;		// for ammo how much, or duration of powerup
// 	itemType_t  giType;			// IT_* flags
// 
// 	int			giTag;
// 
// 	char		*precaches;		// string of all models and images this item will use
// 	char		*sounds;		// string of all sounds this item will use
// } gitem_t;

var itemList = [
	/**
	 * ARMOR
	 */
	new GameItemDesc(
		'item_armor_shard',
		"sound/misc/ar1_pkup",
		[
			'models/powerups/armor/shard.md3'
		],
		'icons/iconr_shard',
		"Armor Shard",
		5,
		IT.ARMOR,
		0
	),
	new GameItemDesc(
		'item_armor_combat',
		"sound/misc/ar2_pkup",
		[
			'models/powerups/armor/armor_yel.md3'
		],
		'icons/iconr_yellow',
		"Armor",
		50,
		IT.ARMOR,
		0
	),
	new GameItemDesc(
		'item_armor_body',
		"sound/misc/ar2_pkup",
		[
			'models/powerups/armor/armor_red.md3'
		],
		'icons/iconr_red',
		"Heavy Armor",
		100,
		IT.ARMOR,
		0
	),
	/**
	 * HEALTH
	 */
	new GameItemDesc(
		'item_health_small',
		"sound/items/s_health",
		[
			'models/powerups/health/small_cross.md3',
			'models/powerups/health/small_sphere.md3'
		],
		'icons/iconh_green',
		"5 Health",
		5,
		IT.HEALTH,
		0
	),
	new GameItemDesc(
		'item_health',
		"sound/items/n_health",
		[
			'models/powerups/health/medium_cross.md3',
			'models/powerups/health/medium_sphere.md3'
		],
		'icons/iconh_yellow',
		"25 Health",
		25,
		IT.HEALTH,
		0
	),
	new GameItemDesc(
		'item_health_large',
		"sound/items/l_health",
		[
			'models/powerups/health/large_cross.md3',
			'models/powerups/health/large_sphere.md3'
		],
		'icons/iconh_red',
		"50 Health",
		50,
		IT.HEALTH,
		0
	),
	new GameItemDesc(
		'item_health_mega',
		"sound/items/m_health",
		[
			'models/powerups/health/mega_cross.md3',
			'models/powerups/health/mega_sphere.md3'
		],
		'icons/iconh_mega',
		"Mega Health",
		100,
		IT.HEALTH,
		0
	),
	/**
	 * WEAPONS
	 */
	new GameItemDesc(
		'weapon_gauntlet',
		"sound/misc/w_pkup",
		[
			'models/weapons2/gauntlet/gauntlet.md3'
		],
		'icons/iconw_gauntlet',
		"Gauntlet",
		0,
		IT.WEAPON,
		WP.GAUNTLET
	),
	new GameItemDesc(
		'weapon_shotgun',
		"sound/misc/w_pkup",
		[
			'models/weapons2/shotgun/shotgun.md3'
		],
		'icons/iconw_shotgun',
		"Shotgun",
		10,
		IT.WEAPON,
		WP.SHOTGUN
	),
	new GameItemDesc(
		'weapon_machinegun',
		"sound/misc/w_pkup",
		[
			'models/weapons2/machinegun/machinegun.md3'
		],
		'icons/iconw_machinegun',
		"Machinegun",
		40,
		IT.WEAPON,
		WP.MACHINEGUN
	),
	new GameItemDesc(
		'weapon_grenadelauncher',
		"sound/misc/w_pkup",
		[
			'models/weapons2/grenadel/grenadel.md3'
		],
		'icons/iconw_grenade',
		"Grenade Launcher",
		10,
		IT.WEAPON,
		WP.GRENADE_LAUNCHER,
		undefined,
		[
			"sound/weapons/grenade/hgrenb1a",
			"sound/weapons/grenade/hgrenb2a.wav"
		]
	),
	new GameItemDesc(
		'weapon_rocketlauncher',
		"sound/misc/w_pkup",
		[
			'models/weapons2/rocketl/rocketl.md3'
		],
		'icons/iconw_rocket',
		"Rocket Launcher",
		10,
		IT.WEAPON,
		WP.ROCKET_LAUNCHER
	),
	new GameItemDesc(
		'weapon_lightning',
		"sound/misc/w_pkup",
		[
			'models/weapons2/lightning/lightning.md3'
		],
		'icons/iconw_lightning',
		"Lightning Gun",
		100,
		IT.WEAPON,
		WP.LIGHTNING
	),
	new GameItemDesc(
		'weapon_railgun',
		"sound/misc/w_pkup",
		[
			'models/weapons2/railgun/railgun.md3'
		],
		'icons/iconw_railgun',
		"Railgun",
		10,
		IT.WEAPON,
		WP.RAILGUN
	),
	new GameItemDesc(
		'weapon_plasmagun',
		"sound/misc/w_pkup",
		[
			'models/weapons2/plasma/plasma.md3'
		],
		'icons/iconw_plasma',
		"Plasma Gun",
		50,
		IT.WEAPON,
		WP.PLASMAGUN
	),
	/**
	 * AMMO ITEMS
	 */
	new GameItemDesc(
		'ammo_shells',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/shotgunam.md3'
		],
		'icons/icona_shotgun',
		"Shells",
		10,
		IT.AMMO,
		WP.SHOTGUN
	),
	new GameItemDesc(
		'ammo_bullets',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/machinegunam.md3'
		],
		'icons/icona_machinegun',
		"Bullets",
		50,
		IT.AMMO,
		WP.MACHINEGUN
	),
	new GameItemDesc(
		'ammo_grenades',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/grenadeam.md3'
		],
		'icons/icona_grenade',
		"Grenades",
		5,
		IT.AMMO,
		WP.GRENADE_LAUNCHER
	),
	new GameItemDesc(
		'ammo_cells',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/plasmaam.md3'
		],
		'icons/icona_plasma',
		"Cells",
		30,
		IT.AMMO,
		WP.PLASMAGUN
	),
	new GameItemDesc(
		'ammo_lightning',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/lightningam.md3'
		],
		'icons/icona_lightning',
		"Lightning",
		60,
		IT.AMMO,
		WP.LIGHTNING
	),
	new GameItemDesc(
		'ammo_rockets',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/rocketam.md3'
		],
		'icons/icona_rocket',
		"Rockets",
		5,
		IT.AMMO,
		WP.ROCKET_LAUNCHER
	),
	new GameItemDesc(
		'ammo_slugs',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/railgunam.md3'
		],
		'icons/icona_railgun',
		"Slugs",
		10,
		IT.AMMO,
		WP.RAILGUN
	),
	new GameItemDesc(
		'ammo_bfg',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/bfgam.md3'
		],
		'icons/icona_bfg',
		"Bfg Ammo",
		15,
		IT.AMMO,
		WP.BFG
	),
	/**
	 * POWERUPS
	 */
	new GameItemDesc(
		'item_quad',
		"sound/items/quaddamage",
		[
			'models/powerups/instant/quad.md3',
			'models/powerups/instant/quad_ring.md3'
		],
		'icons/quad',
		"Quad Damage",
		30,
		IT.POWERUP,
		0,
		undefined,
		[
			"sound/items/damage2",
			"sound/items/damage3.wav"
		]
	)
];

	
	return {
		PmoveInfo:                        PmoveInfo,
		Animation:                        Animation,

		ItemList:                         itemList,
		Pmove:                            Pmove,
		UpdateViewAngles:                 UpdateViewAngles,
		CanItemBeGrabbed:                 CanItemBeGrabbed,
		AddPredictableEventToPlayerstate: AddPredictableEventToPlayerstate,
		PlayerStateToEntityState:         PlayerStateToEntityState,
		EvaluateTrajectory:               EvaluateTrajectory,
		EvaluateTrajectoryDelta:          EvaluateTrajectoryDelta,
		TouchJumpPad:                     TouchJumpPad
	};
});


/*global vec3: true, mat4: true */

define('game/gm',
['underscore', 'glmatrix', 'common/sh', 'common/qmath', 'game/bg'],
function (_, glmatrix, sh, qm, bg) {
	var BASE_FOLDER = 'baseq3';
var MAX_QPATH   = 64;
var CMD_BACKUP  = 64;

// If entityState.solid === SOLID_BMODEL, modelIndex is an inline model number
var SOLID_BMODEL = 0xffffff;

/**
 * Cvar flags
 */
var CVF = {
	ARCHIVE:    0x0001,                                    // save to config file
	USERINFO:   0x0002,                                    // sent to server on connect or change
	SERVERINFO: 0x0004,                                    // sent in response to front end requests
	SYSTEMINFO: 0x0008                                     // these cvars will be duplicated on all clients
};

/**
 * Renderer (should be moved)
 */
var MAX_DRAWSURFS  = 0x10000;

/**
 * Snapshot flags
 */
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

/**
 * MAX_* defines used to pre-alloc many structures
 */
var GENTITYNUM_BITS         = 10;
var MAX_CLIENTS             = 32;                          // absolute limit
var MAX_GENTITIES           = (1 << 10);                   // can't be increased without changing drawsurf bit packing
var MAX_MODELS              = 256;                         // these are sent over the net as 8 bits
var MAX_SOUNDS              = 256;                         // so they cannot be blindly increased

/**
 * Faux entity numbers
 */
var ENTITYNUM_NONE          = MAX_GENTITIES-1;
var ENTITYNUM_WORLD         = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL    = MAX_GENTITIES-2;

var MOVE_RUN = 120;                                        // if forwardmove or rightmove are >= MOVE_RUN,
	                                                       // then BUTTON_WALKING should be set

/**
 * Playerstate
 */
var MAX_STATS               = 16;
var MAX_PERSISTANT          = 16;
var MAX_POWERUPS            = 16;
var MAX_WEAPONS             = 16;
var MAX_PS_EVENTS           = 2;
var PMOVEFRAMECOUNTBITS     = 6;

var BUTTON = {
	ATTACK:       1,
	TALK:         2,                                       // displays talk balloon and disables actions
	USE_HOLDABLE: 4,
	GESTURE:      8,
	WALKING:      16,                                      // walking can't just be infered from MOVE_RUN
	                                                       // because a key pressed late in the frame will
	                                                       // only generate a small move value for that frame
	                                                       // walking will use different animations and
	                                                       // won't generate footsteps
	AFFIRMATIVE:  32,
	NEGATIVE:     64,
	GETFLAG:      128,
	GUARDBASE:    256,
	PATROL:       512,
	FOLLOWME:     1024,
	ANY:          2048                                     // any key whatsoever
};

var TR = {
	STATIONARY:  0,
	INTERPOLATE: 1,                              // non-parametric, but interpolate between snapshots
	LINEAR:      2,
	LINEAR_STOP: 3,
	SINE:        4,                              // value = base + sin( time / duration ) * delta
	GRAVITY:     5
};

var SURF = {
	NODAMAGE:    0x1,                            // never give falling damage
	SLICK:       0x2,                            // effects game physics
	SKY:         0x4,                            // lighting from environment map
	LADDER:      0x8,
	NOIMPACT:    0x10,                           // don't make missile explosions
	NOMARKS:     0x20,                           // don't leave missile marks
	FLESH:       0x40,                           // make flesh sounds and effects
	NODRAW:      0x80,                           // don't generate a drawsurface at all
	HINT:        0x100,                          // make a primary bsp splitter
	SKIP:        0x200,                          // completely ignore, allowing non-closed brushes
	NOLIGHTMAP:  0x400,                          // surface doesn't need a lightmap
	POINTLIGHT:  0x800,                          // generate lighting info at vertexes
	METALSTEPS:  0x1000,                         // clanking footsteps
	NOSTEPS:     0x2000,                         // no footstep sounds
	NONSOLID:    0x4000,                         // don't collide against curves with this set
	LIGHTFILTER: 0x8000,                         // act as a light filter during q3map -light
	ALPHASHADOW: 0x10000,                        // do per-pixel light shadow casting in q3map
	NODLIGHT:    0x20000,                        // don't dlight even if solid (solid lava, skies)
	DUST:        0x40000                         // leave a dust trail when walking on this surface
};

var CONTENTS = {
	SOLID:         1,                                      // an eye is never valid in a solid
	LAVA:          8,
	SLIME:         16,
	WATER:         32,
	FOG:           64,

	NOTTEAM1:      0x0080,
	NOTTEAM2:      0x0100,
	NOBOTCLIP:     0x0200,

	AREAPORTAL:    0x8000,

	PLAYERCLIP:    0x10000,
	MONSTERCLIP:   0x20000,
	TELEPORTER:    0x40000,
	JUMPPAD:       0x80000,
	CLUSTERPORTAL: 0x100000,
	DONOTENTER:    0x200000,
	BOTCLIP:       0x400000,
	MOVER:         0x800000,

	ORIGIN:        0x1000000,                              // removed before bsping an entity

	BODY:          0x2000000,                              // should never be on a brush, only in game
	CORPSE:        0x4000000,
	DETAIL:        0x8000000,                              // brushes not used for the bsp
	STRUCTURAL:    0x10000000,                             // brushes used for the bsp
	TRANSLUCENT:   0x20000000,                             // don't consume surface fragments inside
	TRIGGER:       0x40000000,
	NODROP:        0x80000000                              // don't leave bodies or items (death fog, lava)
};
	var GIB_HEALTH = -40;
var ARMOR_PROTECTION = 0.66;

var ITEM_RADIUS = 15;                                      // item sizes are needed for client side pickup detection

var MINS_Z = -24;
var DEFAULT_VIEWHEIGHT = 26;
var CROUCH_VIEWHEIGHT = 12;
var DEAD_VIEWHEIGHT = -16;

var PM = {
	NORMAL:       0,                                       // can accelerate and turn
	NOCLIP:       1,                                       // noclip movement
	SPECTATOR:    2,                                       // still run into walls
	DEAD:         3,                                       // no acceleration or turning, but free falling
	FREEZE:       4,                                       // stuck in place with no control
	INTERMISSION: 5                                        // no movement or status bar
};

var PMF = {
	DUCKED:         1,
	JUMP_HELD:      2,
	BACKWARDS_JUMP: 8,                                     // go into backwards land
	BACKWARDS_RUN:  16,                                    // coast down to backwards run
	TIME_LAND:      32,                                    // pm_time is time before rejump
	TIME_KNOCKBACK: 64,                                    // pm_time is an air-accelerate only time
	TIME_WATERJUMP: 256,                                   // pm_time is waterjump
	RESPAWNED:      512,                                   // clear after attack and jump buttons come up
	USE_ITEM_HELD:  1024,
	GRAPPLE_PULL:   2048,                                  // pull towards grapple location
	FOLLOW:         4096,                                  // spectate following another player
	SCOREBOARD:     8192,                                  // spectate as a scoreboard
	INVULEXPAND:    16384,                                 // invulnerability sphere set to full size
	ALL_TIMES:      (32|64|256)
};

// Weapon state.
var WS = {
	READY:    0,
	RAISING:  1,
	DROPPING: 2,
	FIRING:   3
};

// Item types.
var IT = {
	BAD:                0,
	WEAPON:             1,                                 // EFX: rotate + upscale + minlight
	AMMO:               2,                                 // EFX: rotate
	ARMOR:              3,                                 // EFX: rotate + minlight
	HEALTH:             4,                                 // EFX: static external sphere + rotating internal
	POWERUP:            5,                                 // instant on, timer based
	                                                       // EFX: rotate + external ring that rotates
	HOLDABLE:           6,                                 // single use, holdable item
	                                                       // EFX: rotate + bob
	PERSISTANT_POWERUP: 7,
	TEAM:               8
};

var MASK = {
	ALL:         -1,
	SOLID:       CONTENTS.SOLID,
	PLAYERSOLID: CONTENTS.SOLID | CONTENTS.PLAYERCLIP | CONTENTS.BODY,
	DEADSOLID:   CONTENTS.SOLID | CONTENTS.PLAYERCLIP,
	WATER:       CONTENTS.WATER | CONTENTS.LAVA | CONTENTS.SLIME,
	OPAQUE:      CONTENTS.SOLID | CONTENTS.SLIME | CONTENTS.LAVA,
	SHOT:        CONTENTS.SOLID | CONTENTS.BODY | CONTENTS.CORPSE
};

/**
 * Playerstate flags
 */
var STAT = {
	HEALTH:        0,
	HOLDABLE_ITEM: 1,
	WEAPONS:       2,
	ARMOR:         3,
	DEAD_YAW:      4,				// look this direction when dead (FIXME: get rid of?)
	CLIENTS_READY: 5,				// bit mask of clients wishing to exit the intermission (FIXME: configstring?)
	MAX_HEALTH:    6				// health / armor limit, changable by handicap
};

var WP = {
	NONE:             0,
	GAUNTLET:         1,
	MACHINEGUN:       2,
	SHOTGUN:          3,
	GRENADE_LAUNCHER: 4,
	ROCKET_LAUNCHER:  5,
	LIGHTNING:        6,
	RAILGUN:          7,
	PLASMAGUN:        8,
	BFG:              9,
	GRAPPLING_HOOK:   10,
	NUM_WEAPONS:      11
};

// NOTE: may not have more than 16
var PW = {
	NONE:         0,
	QUAD:         1,
	BATTLESUIT:   2,
	HASTE:        3,
	INVIS:        4,
	REGEN:        5,
	FLIGHT:       6,
	REDFLAG:      7,
	BLUEFLAG:     8,
	NEUTRALFLAG:  9,
	NUM_POWERUPS: 10
};

// PlayerState.persistant[] indexes
// These fields are the only part of player_state that aren't
// cleared on respawn.
// NOTE: may not have more than 16
var PERS = {
	SCORE:                0,                               // !!! MUST NOT CHANGE, SERVER AND GAME BOTH REFERENCE !!!
	HITS:                 1,                               // total points damage inflicted so damage beeps can sound on change
	RANK:                 2,                               // player rank or team rank
	TEAM:                 3,                               // player team
	SPAWN_COUNT:          4,                               // incremented every respawn
	PLAYEREVENTS:         5,                               // 16 bits that can be flipped for events
	ATTACKER:             6,                               // clientnum of last damage inflicter
	ATTACKEE_ARMOR:       7,                               // health/armor of last person we attacked
	KILLED:               8,                               // count of the number of times you died
	// player awards tracking
	IMPRESSIVE_COUNT:     9,                               // two railgun hits in a row
	EXCELLENT_COUNT:      10,                              // two successive kills in a short amount of time
	DEFEND_COUNT:         11,                              // defend awards
	ASSIST_COUNT:         12,                              // assist awards
	GAUNTLET_FRAG_COUNT:  13,                              // kills with the guantlet
	CAPTURES:             14                               // captures
};

/**
 * Entitystate flags
 */
// entityState_t->eType
var ET = {
	GENERAL:          0,
	PLAYER:           1,
	ITEM:             2,
	MISSILE:          3,
	MOVER:            4,
	BEAM:             5,
	PORTAL:           6,
	SPEAKER:          7,
	PUSH_TRIGGER:     8,
	TELEPORT_TRIGGER: 9,
	INVISIBLE:        10,
	GRAPPLE:          11,                                  // grapple hooked on wall
	TEAM:             12,
	EVENTS:           13                                   // any of the EV_* events can be added freestanding
	                                                       // by setting eType to ET_EVENTS + eventNum
	                                                       // this avoids having to set eFlags and eventNum
};

// entityState_t->eFlags
var EF = {
	DEAD:             0x00000001,                          // don't draw a foe marker over players with EF_DEAD
	TELEPORT_BIT:     0x00000004,                          // toggled every time the origin abruptly changes
	AWARD_EXCELLENT:  0x00000008,                          // draw an excellent sprite
	PLAYER_EVENT:     0x00000010,
	BOUNCE:           0x00000010,                          // for missiles
	BOUNCE_HALF:      0x00000020,                          // for missiles
	AWARD_GAUNTLET:   0x00000040,                          // draw a gauntlet sprite
	NODRAW:           0x00000080,                          // may have an event, but no model (unspawned items)
	FIRING:           0x00000100,                          // for lightning gun
	KAMIKAZE:         0x00000200,
	MOVER_STOP:       0x00000400,                          // will push otherwise
	AWARD_CAP:        0x00000800,                          // draw the capture sprite
	TALK:             0x00001000,                          // draw a talk balloon
	CONNECTION:       0x00002000,                          // draw a connection trouble sprite
	VOTED:            0x00004000,                          // already cast a vote
	AWARD_IMPRESSIVE: 0x00008000,                          // draw an impressive sprite
	AWARD_DEFEND:     0x00010000,                          // draw a defend sprite
	AWARD_ASSIST:     0x00020000,                          // draw an assist sprite
	AWARD_DENIED:     0x00040000,                          // denied
	TEAMVOTED:        0x00080000                           // already cast a team vote
};

/**********************************************************
 * 
 * Entitystate events
 * 
 * Entity events are for effects that take place relative
 * to an existing entities origin. Very network efficient.
 *
 * Two bits at the top of the entityState->event field
 * will be incremented with each change in the event so
 * that an identical event started twice in a row can
 * be distinguished. And off the value with ~EV_EVENT_BITS
 * to retrieve the actual event number.
 *
 **********************************************************/
var EV_EVENT_BIT1    = 0x00000100;
var EV_EVENT_BIT2    = 0x00000200;
var EV_EVENT_BITS    = (EV_EVENT_BIT1|EV_EVENT_BIT2);
var EVENT_VALID_MSEC = 300;

var EV = {
	NONE:                0,

	FOOTSTEP:            1,
	FOOTSTEP_METAL:      2,
	FOOTSPLASH:          3,
	FOOTWADE:            4,
	SWIM:                5,

	STEP_4:              6,
	STEP_8:              7,
	STEP_12:             8,
	STEP_16:             9,

	FALL_SHORT:          10,
	FALL_MEDIUM:         11,
	FALL_FAR:            12,

	JUMP_PAD:            13,                               // boing sound at origin, jump sound on player

	JUMP:                14,
	WATER_TOUCH:         15,                               // foot touches
	WATER_LEAVE:         16,                               // foot leaves
	WATER_UNDER:         17,                               // head touches
	WATER_CLEAR:         18,                               // head leaves

	ITEM_PICKUP:         29,                               // normal item pickups are predictable
	GLOBAL_ITEM_PICKUP:  20,                               // powerup / team sounds are broadcast to everyone

	NOAMMO:              21,
	CHANGE_WEAPON:       22,
	FIRE_WEAPON:         23,

	USE_ITEM0:           24,
	USE_ITEM1:           25,
	USE_ITEM2:           26,
	USE_ITEM3:           27,
	USE_ITEM4:           28,
	USE_ITEM5:           29,
	USE_ITEM6:           30,
	USE_ITEM7:           31,
	USE_ITEM8:           32,
	USE_ITEM9:           33,
	USE_ITEM10:          34,
	USE_ITEM11:          35,
	USE_ITEM12:          36,
	USE_ITEM13:          37,
	USE_ITEM14:          38,
	USE_ITEM15:          39,

	ITEM_RESPAWN:        40,
	ITEM_POP:            41,
	PLAYER_TELEPORT_IN:  42,
	PLAYER_TELEPORT_OUT: 43,

	GRENADE_BOUNCE:      44,                               // eventParm will be the soundindex

	GENERAL_SOUND:       45,
	GLOBAL_SOUND:        46,                               // no attenuation
	GLOBAL_TEAM_SOUND:   47,

	BULLET_HIT_FLESH:    48,
	BULLET_HIT_WALL:     49,

	MISSILE_HIT:         50,
	MISSILE_MISS:        51,
	MISSILE_MISS_METAL:  52,
	RAILTRAIL:           53,
	SHOTGUN:             54,
	BULLET:              55,                               // otherEntity is the shooter

	PAIN:                56,
	DEATH1:              57,
	DEATH2:              58,
	DEATH3:              59,
	OBITUARY:            60,

	POWERUP_QUAD:        61,
	POWERUP_BATTLESUIT:  62,
	POWERUP_REGEN:       63,

	GIB_PLAYER:          64,                               // gib a previously living player
	SCOREPLUM:           65,                               // score plum

	DEBUG_LINE:          66,
	STOPLOOPINGSOUND:    67,
	TAUNT:               68,
	TAUNT_YES:           69,
	TAUNT_NO:            70,
	TAUNT_FOLLOWME:      71,
	TAUNT_GETFLAG:       72,
	TAUNT_GUARDBASE:     73,
	TAUNT_PATROL:        74
};

/**
 * Animations
 */
// Flip the togglebit every time an animation
// changes so a restart of the same anim can be detected.
var ANIM_TOGGLEBIT = 128;

var ANIM = {
	BOTH_DEATH1:         0,
	BOTH_DEAD1:          1,
	BOTH_DEATH2:         2,
	BOTH_DEAD2:          3,
	BOTH_DEATH3:         4,
	BOTH_DEAD3:          5,

	TORSO_GESTURE:       6,

	TORSO_ATTACK:        7,
	TORSO_ATTACK2:       8,

	TORSO_DROP:          9,
	TORSO_RAISE:         10,

	TORSO_STAND:         11,
	TORSO_STAND2:        12,

	LEGS_WALKCR:         13,
	LEGS_WALK:           14,
	LEGS_RUN:            15,
	LEGS_BACK:           16,
	LEGS_SWIM:           17,

	LEGS_JUMP:           18,
	LEGS_LAND:           19,

	LEGS_JUMPB:          20,
	LEGS_LANDB:          21,

	LEGS_IDLE:           22,
	LEGS_IDLECR:         23,

	LEGS_TURN:           24,

	TORSO_GETFLAG:       25,
	TORSO_GUARDBASE:     26,
	TORSO_PATROL:        27,
	TORSO_FOLLOWME:      28,
	TORSO_AFFIRMATIVE:   29,
	TORSO_NEGATIVE:      30,

	MAX:                 31,

	LEGS_BACKCR:         32,
	LEGS_BACKWALK:       33,
	FLAG_RUN:            34,
	FLAG_STAND:          35,
	FLAG_STAND2RUN:      36,

	MAX_TOTALANIMATIONS: 37
};

// Means of death
var MOD = {
	UNKNOWN:        0,
	SHOTGUN:        1,
	GAUNTLET:       2,
	MACHINEGUN:     3,
	GRENADE:        4,
	GRENADE_SPLASH: 5,
	ROCKET:         6,
	ROCKET_SPLASH:  7,
	PLASMA:         8,
	PLASMA_SPLASH:  9,
	RAILGUN:        10,
	LIGHTNING:      11,
	BFG:            12,
	BFG_SPLASH:     13,
	WATER:          14,
	SLIME:          15,
	LAVA:           16,
	CRUSH:          17,
	TELEFRAG:       18,
	FALLING:        19,
	SUICIDE:        20,
	TARGET_LASER:   21,
	TRIGGER_HURT:   22,
	GRAPPLE:        23
};


	function Game(com, sv) {
		var FRAMETIME = 100; // msec
var CARNAGE_REWARD_TIME = 3000;
var REWARD_SPRITE_TIME = 2000;

var DAMAGE = {
	RADIUS:        0x00000001,                             // damage was indirect
	NO_ARMOR:      0x00000002,                             // armour does not protect from this damage
	NO_KNOCKBACK:  0x00000004,                             // do not affect velocity, just view angles
	NO_PROTECTION: 0x00000008                              // armor, shields, invulnerability, and godmode have no effect
};

// GameEntity flags
var GFL = {
	GODMODE:       0x00000010,
	NOTARGET:      0x00000020,
	TEAMSLAVE:     0x00000400,                             // not the first on the team
	NO_KNOCKBACK:  0x00000800,
	DROPPED_ITEM:  0x00001000,
	NO_BOTS:       0x00002000,                             // spawn point not for bot use
	NO_HUMANS:     0x00004000,                             // spawn point just for bots
	FORCE_GESTURE: 0x00008000                              // force gesture on client
};

var LevelLocals = function () {
	this.framenum     = 0;
	this.previousTime = 0;
	this.time         = 0;
	this.startTime    = 0;
	this.clients      = new Array(MAX_CLIENTS);
	this.gentities    = new Array(MAX_GENTITIES);

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.gentities[i] = new GameEntity();
	}
};

// The server does not know how to interpret most of the values
// in entityStates (level eType), so the game must explicitly flag
// special server behaviors.
var SVF = {
	NOCLIENT:           0x00000001,                        // don't send entity to clients, even if it has effects
	BOT:                0x00000002,                        // set if the entity is a bot
	BROADCAST:          0x00000008,                        // send to all connected clients
	PORTAL:             0x00000020,                        // merge a second pvs at origin2 into snapshots
	USE_CURRENT_ORIGIN: 0x00000040,                        // entity->r.currentOrigin instead of entity->s.origin
	                                                       // for link position (missiles and movers)
	SINGLECLIENT:       0x00000080,                        // only send to a single client (entityShared_t->singleClient)
	NOTSINGLECLIENT:    0x00000100                         // send entity to everyone but one client
};

var GameEntity = function () {
	this.reset();
};

GameEntity.prototype.reset = function () {
	//
	// Shared by game and server.
	//
	this.s             = new sh.EntityState();
	this.linked        = false;
	// SVF_NOCLIENT, SVF_BROADCAST, etc.
	this.svFlags       = 0;
	// Only send to this client when SVF_SINGLECLIENT is set.
	this.singleClient  = 0;
	// If false, assume an explicit mins / maxs bounding box only set by trap_SetBrushModel.
	this.bmodel        = false;
	this.mins          = [0, 0, 0];
	this.maxs          = [0, 0, 0];
	// CONTENTS.TRIGGER, CONTENTS.SOLID, CONTENTS.BODY (non-solid ent should be 0)
	this.contents      = 0;
	// Derived from mins/maxs and origin + rotation.
	this.absmin        = [0, 0, 0];
	this.absmax        = [0, 0, 0];
	// currentOrigin will be used for all collision detection and world linking.
	// it will not necessarily be the same as the trajectory evaluation for the current
	// time, because each entity must be moved one at a time after time is advanced
	// to avoid simultanious collision issues.
	this.currentOrigin = [0, 0, 0];
	this.currentAngles = [0, 0, 0];
	this.client        = null;
	// When a trace call is made and passEntityNum != ENTITYNUM_NONE,
	// an ent will be excluded from testing if:
	// ent.s.number == passEntityNum                   (don't interact with self)
	// ent.ownerNum == passEntityNum                   (don't interact with your own missiles)
	// entity[ent.ownerNum].ownerNum == passEntityNum  (don't interact with other missiles from owner)
	this.ownerNum      = ENTITYNUM_NONE;

	//
	// Game only
	//
	this.parent              = null;
	this.inuse               = false;
	this.classname           = 'noclass';
	this.spawnflags          = 0;

	this.freeTime            = 0;                          // level.time when the object was freed
	this.eventTime           = 0;                          // events will be cleared EVENT_VALID_MSEC after set
	this.freeAfterEvent      = false;
	this.unlinkAfterEvent    = false;

	this.model               = null;
	this.model2              = null;
	this.physicsObject       = false;                      // if true, it can be pushed by movers and fall off edges
	                                                       // all game items are physicsObjects
	this.physicsBounce       = 0;                          // 1.0 = continuous bounce, 0.0 = no bounce
	this.clipmask            = 0;                          // brushes with this content value will be collided against
	                                                       // when moving. items and corpses do not collide against
	                                                       // players, for instance
	// movers
	this.moverState          = 0;
	this.soundPos1           = 0;
	this.sound1to2           = 0;
	this.sound2to1           = 0;
	this.soundPos2           = 0;
	this.soundLoop           = 0;
	this.nextTrain           = null;
	this.prevTrain           = null;
	this.pos1                = [0, 0, 0];
	this.pos2                = [0, 0, 0];

	this.target              = null;
	this.targetName          = null;
	this.team                = null;
	this.targetShaderName    = null;
	this.targetShaderNewName = null;
	this.targetEnt           = null;

	this.nextthink           = 0;
	this.think               = null;

	this.timestamp           = 0;                          // body queue sinking, etc

	this.health              = 0;
	this.takeDamage          = false;

	this.damage              = 0;
	this.splashDamage        = 0;                          // quad will increase this without increasing radius
	this.splashRadius        = 0;
	this.methodOfDeath       = 0;
	this.splashMethodOfDeath = 0;

	this.count               = 0;                          // items

	this.chain               = null;
	this.enemy               = null;
	this.activator           = null;
	this.teamchain           = null; // next entity in team
	this.teammaster          = null; // master of the team

}

// This structure is cleared on each ClientSpawn(),
// except for 'client->pers' and 'client->sess'.
var GameClient = function () {
	this.ps                = new sh.PlayerState();
	this.pers              = new GameClientPersistant();

	this.noclip            = false;

	this.oldOrigin         = [0, 0, 0];

	// Sum up damage over an entire frame, so
	// shotgun blasts give a single big kick.
	this.damage_armor      = 0;                            // damage absorbed by armor
	this.damage_blood      = 0;                            // damage taken out of health
	this.damage_knockback  = 0;                            // impact damage
	this.damage_from       = [0, 0, 0];                    // origin for vector calculation
	this.damage_fromWorld  = false;                        // if true, don't use the damage_from vector

	// Awards
	this.impressive_count  = 0;                            // for "impressive" reward sound
	this.accuracy_shots    = 0;                            // total number of shots
	this.accuracy_hits     = 0;                            // total number of hits

	// Taunts
	this.lastkilled_client = 0;                            // last client that this client killed
	this.lasthurt_mod      = 0;                            // type of damage the client did

	// Timers
	this.respawnTime       = 0;                            // can respawn when time > this, force after g_forcerespwan
	this.inactivityTime    = 0;                            // kick players when time > this
	this.inactivityWarning = 0;                            // true if the five second warning has been given
	this.rewardTime        = 0;                            // clear the EF.AWARD_IMPRESSIVE, etc when time > this
};

// Client data that stays across multiple respawns, but is cleared
// on each level change or team change at ClientBegin()
var GameClientPersistant = function () {
	this.cmd     = new sh.UserCmd();
	this.netname = null;
};
		var level;

var g_speed,
	g_gravity,
	g_knockback,
	g_quadfactor,
	g_weaponRespawn,
	g_weaponTeamRespawn,
	g_forcerespawn,
	g_inactivity,
	g_debugMove,
	g_debugDamage,
	g_debugAlloc,
	g_motd,
	g_blood;

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'GM:');
	Function.apply.call(console.log, console, args);
}

/**
 * error
 */
function error(str) {
	com.error(sh.Err.DROP, str);
}

/**
 * Init
 */
function Init(levelTime) {
	log('Initializing');

	level = new LevelLocals();
	level.time = levelTime;
	level.startTime = levelTime;
	
	g_speed             = com.AddCvar('g_speed',             320);
	g_gravity           = com.AddCvar('g_gravity',           800);
	g_knockback         = com.AddCvar('g_knockback',         1000);
	g_quadfactor        = com.AddCvar('g_quadfactor',        3);
	g_weaponRespawn     = com.AddCvar('g_weaponrespawn',     5);
	g_weaponTeamRespawn = com.AddCvar('g_weaponTeamRespawn', 30);
	g_forcerespawn      = com.AddCvar('g_forcerespawn',      20);
	g_inactivity        = com.AddCvar('g_inactivity',        0);
	g_debugMove         = com.AddCvar('g_debugMove',         0);
	g_debugDamage       = com.AddCvar('g_debugDamage',       0);
	g_debugAlloc        = com.AddCvar('g_debugAlloc',        0);
	g_motd              = com.AddCvar('g_motd',              "");
	g_blood             = com.AddCvar('g_blood',             1);
	
	// Let the server system know where the entites are.
	sv.LocateGameData(level.gentities, level.clients);

	// Spawn all the entities for the current level.
	SpawnAllEntitiesFromDefs();
}

/**
 * Shutdown
 */
function Shutdown() {
}

/**
 * Frame
 */
function Frame(levelTime) {
	level.framenum++;
	level.previousTime = level.time;
	level.time = levelTime;

	for (var i = 0; i < MAX_GENTITIES; i++) {
		var ent = level.gentities[i];
		if (!ent.inuse) {
			continue;
		}

		// Clear events that are too old.
		if (level.time - ent.eventTime > EVENT_VALID_MSEC) {
			if (ent.s.event) {
				ent.s.event = 0;  // &= EV_EVENT_BITS;
				if (ent.client) {
					ent.client.ps.externalEvent = 0;
				}
			}
			
			if (ent.freeAfterEvent) {
				// tempEntities or dropped items completely go away after their event.
				FreeEntity(ent);
				continue;
			}
			// else if (ent->unlinkAfterEvent) {
			// 	// items that will respawn will hide themselves after their pickup event
			// 	ent->unlinkAfterEvent = qfalse;
			// 	trap_UnlinkEntity( ent );
			// }
		}

		// Temporary entities don't think.
		if (ent.freeAfterEvent) {
			continue;
		}
		
		/*if (i < MAX_CLIENTS) {
			ClientThink(ent.client.number);
			continue;
		}*/

		if (ent.s.eType == ET.MISSILE) {
			MissileThink(ent);
			continue;
		}

		EntityThink(ent);
	}
}

		/**
 * TouchTriggers
 *
 * Find all trigger entities that ent's current position touches.
 * Spectators will only interact with teleporters.
 */
function TouchTriggers(ent) {
	if (!ent.client) {
		return;
	}

	var ps = ent.client.ps;
	var range = [40, 40, 52];
	var mins = [0, 0, 0], maxs = [0, 0, 0];
	vec3.subtract(ps.origin, range, mins);
	vec3.add(ps.origin, range, maxs);

	var entityNums = sv.FindEntitiesInBox(mins, maxs);

	/*// can't use ent->absmin, because that has a one unit pad
	vec3.add(ps.origin, ent.r.mins, mins);
	vec3.add(ps.origin, ent.r.maxs, maxs);*/

	for (var i = 0; i < entityNums.length; i++) {
		var hit = level.gentities[entityNums[i]];

		// If they don't have callbacks.
		if (!hit.touch) {
			continue;
		}

		if (!(hit.contents & CONTENTS.TRIGGER)) {
			continue;
		}

		/*if (!trap_EntityContact(mins, maxs, hit) ) {
			continue;
		}*/

		hit.touch.call(this, hit, ent);
	}

	// if we didn't touch a jump pad this pmove frame
	if (ps.jumppad_frame != ps.pmove_framecount) {
		ps.jumppad_frame = 0;
		ps.jumppad_ent = 0;
	}
}
		var playerMins = [-15, -15, -24];
var playerMaxs = [15, 15, 32];

/**
 * ClientConnect
 *
 * Called when a player begins connecting to the server.
 * Called again for every map change or tournement restart.
 *
 * The session information will be valid after exit.
 *
 * Return NULL if the client should be allowed, otherwise return
 * a string with the reason for denial.
 * 
 * Otherwise, the client will be sent the current gamestate
 * and will eventually get to ClientBegin.
 *
 * firstTime will be qtrue the very first time a client connects
 * to the server machine, but qfalse on map changes and tournement
 * restarts.
 */
function ClientConnect(clientNum, firstTime) {
	var client = level.clients[clientNum] = new GameClient();
	var ent = level.gentities[clientNum] = new GameEntity();

	ent.client = client;
	
	/*client.pers.connected = CON_CONNECTING;

	// read or initialize the session data
	if (firstTime || level.newSession) {
		G_InitSessionData( client, userinfo );
	}
	G_ReadSessionData( client );*/

	// get and distribute relevent paramters
	log('ClientConnect ' + clientNum);
	ClientUserinfoChanged(clientNum);

	return null;
}

/**
 *
 * ClientUserInfoChanged
 * 
 * Called from ClientConnect when the player first connects and
 * directly by the server system when the player updates a userinfo variable.
 * 
 * The game can override any of the settings and call trap_SetUserinfo
 * if desired.
 */
function ClientUserinfoChanged(clientNum) {
	var ent = level.gentities[clientNum];
	var client = ent.client;
	var userinfo = sv.GetUserinfo(clientNum);

	client.pers.netname = userinfo['name'];

	var cs = {
		'name': client.pers.netname
	};

	sv.SetConfigstring('player' + clientNum, cs);

	// This is not the userinfo, more like the configstring actually.
	log('ClientUserinfoChanged: ' + clientNum + ' ' + JSON.stringify(cs));
}


/**
 * ClientBegin
 *
 * Called when a client has connected and has the ACTIVE state.
 */
function ClientBegin(clientNum) {
	var ent = level.gentities[clientNum];

	ent.s.number = clientNum;
	ent.client.ps.clientNum = clientNum;

	ClientSpawn(ent);
}

/**
 * ClientThink
 */
function ClientThink(clientNum) {
	var client = level.clients[clientNum];
	var ent = level.gentities[clientNum];
	var oldEventSequence = client.ps.eventSequence;

	// Grab the latest command.
	sv.GetUserCmd(clientNum, ent.client.pers.cmd);

	var cmd = ent.client.pers.cmd;

	// Sanity check the command time to prevent speedup cheating.
	if (cmd.serverTime > level.time + 200) {
		cmd.serverTime = level.time + 200;
	}
	if (cmd.serverTime < level.time - 1000) {
		cmd.serverTime = level.time - 1000;
	}

	// Clear the rewards if time.
	if ( level.time > client.rewardTime ) {
		client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP);
	}

	// Set pmove type.
	if (client.noclip) {
		client.ps.pm_type = PM.NOCLIP;
	} else if (client.ps.stats[STAT.HEALTH] <= 0) {
		client.ps.pm_type = PM.DEAD;
	} else {
		client.ps.pm_type = PM.NORMAL;
	}

	client.ps.gravity = g_gravity();
	client.ps.speed = g_speed();

	// Copy off position before pmove.
	vec3.set(client.ps.origin, client.oldOrigin);

	// Setup for pmove.
	var pm = new bg.PmoveInfo();
	pm.ps = client.ps;
	pm.cmd = cmd;
	pm.tracemask = MASK.PLAYERSOLID;
	pm.trace = sv.Trace;
	pm.client = false;
	bg.Pmove(pm);

	// Save results of pmove.
	bg.PlayerStateToEntityState(ent.client.ps, ent.s);

	// Update game entity info.
	vec3.set(client.ps.origin, ent.currentOrigin);
	vec3.set(pm.mins, ent.mins);
	vec3.set(pm.maxs, ent.maxs);

	// Execute client events.
	ClientEvents(ent, oldEventSequence);

	// Link entity now, after any personal teleporters have been used.
	sv.LinkEntity(ent);

	TouchTriggers(ent);

	// NOTE: now copy the exact origin over otherwise clients can be snapped into solid
	vec3.set(ent.client.ps.origin, ent.currentOrigin);

	// Check for respawning.
	if (client.ps.pm_type === PM.DEAD) {
		// Wait for the attack button to be pressed.
		if (level.time > client.respawnTime) {
			// forcerespawn is to prevent users from waiting out powerups
			if (g_forcerespawn() > 0 && 
				(level.time - client.respawnTime ) > g_forcerespawn() * 1000) {
				ClientRespawn(ent);
				return;
			}
		
			// Pressing attack or use is the normal respawn method
			if (cmd.buttons & (BUTTON.ATTACK | BUTTON.USE_HOLDABLE)) {
				ClientRespawn(ent);
			}
		}
		return;
	}
}

/**
 * ClientEvents
 *
 * Events will be passed on to the clients for presentation,
 * but any server game effects are handled here.
 */
function ClientEvents(ent, oldEventSequence) {
	var client = ent.client;

	if (oldEventSequence < client.ps.eventSequence - MAX_PS_EVENTS) {
		oldEventSequence = client.ps.eventSequence - MAX_PS_EVENTS;
	}
	for (var i = oldEventSequence; i < client.ps.eventSequence; i++) {
		var event = client.ps.events[i % MAX_PS_EVENTS];

		switch (event) {
			// case EV_FALL_MEDIUM:
			// case EV_FALL_FAR:
			// 	if ( ent->s.eType != ET_PLAYER ) {
			// 		break;		// not in the player model
			// 	}
			// 	if ( g_dmflags.integer & DF_NO_FALLING ) {
			// 		break;
			// 	}
			// 	if ( event == EV_FALL_FAR ) {
			// 		damage = 10;
			// 	} else {
			// 		damage = 5;
			// 	}
			// 	ent->pain_debounce_time = level.time + 200;	// no normal pain sound
			// 	G_Damage (ent, NULL, NULL, NULL, NULL, damage, 0, MOD_FALLING);
			// 	break;

			case EV.FIRE_WEAPON:
				FireWeapon(ent);
				break;

			// case EV_USE_ITEM1:  // teleporter
			// 	// Drop flags in CTF.
			// 	item = NULL;
			// 	j = 0;

			// 	if ( ent->client->ps.powerups[ PW_REDFLAG ] ) {
			// 		item = BG_FindItemForPowerup( PW_REDFLAG );
			// 		j = PW_REDFLAG;
			// 	} else if ( ent->client->ps.powerups[ PW_BLUEFLAG ] ) {
			// 		item = BG_FindItemForPowerup( PW_BLUEFLAG );
			// 		j = PW_BLUEFLAG;
			// 	} else if ( ent->client->ps.powerups[ PW_NEUTRALFLAG ] ) {
			// 		item = BG_FindItemForPowerup( PW_NEUTRALFLAG );
			// 		j = PW_NEUTRALFLAG;
			// 	}

			// 	if ( item ) {
			// 		drop = Drop_Item( ent, item, 0 );
			// 		// Decide how many seconds it has left.
			// 		drop->count = ( ent->client->ps.powerups[ j ] - level.time ) / 1000;
			// 		if ( drop->count < 1 ) {
			// 			drop->count = 1;
			// 		}

			// 		ent->client->ps.powerups[ j ] = 0;
			// 	}

			// 	SelectSpawnPoint( ent->client->ps.origin, origin, angles, qfalse );
			// 	TeleportPlayer( ent, origin, angles );
			// 	break;

			// case EV_USE_ITEM2:  // medkit
			// 	ent->health = ent->client->ps.stats[STAT_MAX_HEALTH] + 25;
			// 	break;

			default:
				break;
		}
	}
}

/**
 * GetClientPlayerstate
 */
function GetClientPlayerstate(clientNum) {
	var client = level.clients[clientNum];
	return client.ps;
}

/**
 * ClientSpawn
 */
function ClientSpawn(ent) {
	var client = ent.client;
	var ps = ent.client.ps;

	ent.classname = 'player';
	ent.contents = CONTENTS.BODY;
	ent.takeDamage = true;
	ent.die = Player_Die;
	ent.s.groundEntityNum = ENTITYNUM_NONE;
	vec3.set(playerMins, ent.mins);
	vec3.set(playerMaxs, ent.maxs);

	var spawnpoint = SelectRandomDeathmatchSpawnPoint();
	var spawnorigin = vec3.set(spawnpoint.s.origin, [0, 0, 0]);
	spawnorigin[2] += 9;

	SetOrigin(ent, spawnorigin);
	vec3.set(spawnorigin, ps.origin);
	vec3.set(ps.velocity, [0, 0, 0]);

	// The respawned flag will be cleared after the attack and jump keys come up.
	client.ps.pm_flags |= PMF.RESPAWNED;

	sv.GetUserCmd(client.ps.clientNum, ent.client.pers.cmd);
	SetClientViewAngle(ent, spawnpoint.s.angles);

	// Don't allow full run speed for a bit.
	client.ps.pm_flags |= PMF.TIME_KNOCKBACK;
	client.ps.pm_time = 100;

	client.respawnTime = level.time;
	
	// set max health
// 	client.pers.maxHealth = atoi( Info_ValueForKey( userinfo, "handicap" ) );
// 	if ( client.pers.maxHealth < 1 || client.pers.maxHealth > 100 ) {
		client.pers.maxHealth = 100;
// 	}
	// clear entity values
	client.ps.stats[STAT.MAX_HEALTH] = client.pers.maxHealth;
// 	client.ps.eFlags = flags;
	
	// Set default animations.
	ps.torsoAnim = ANIM.TORSO_STAND;
	ps.legsAnim = ANIM.LEGS_IDLE;

	// Set default weapons
	client.ps.weapon = WP.MACHINEGUN;
	client.ps.stats[STAT.WEAPONS] = (1 << WP.MACHINEGUN);
	client.ps.ammo[WP.MACHINEGUN] = 100;
	client.ps.stats[STAT.WEAPONS] |= (1 << WP.GAUNTLET);
	client.ps.ammo[WP.GAUNTLET] = -1;
	
	// Health will count down towards max_health
	ent.health = client.ps.stats[STAT.HEALTH] = client.ps.stats[STAT.MAX_HEALTH] + 25;
	
	// Run a client frame to drop exactly to the floor,
	// initialize weapon, animations and other things.
	client.ps.commandTime = level.time - 100;
	client.pers.cmd.serverTime = level.time;
	ClientThink(client.ps.clientNum);
	// // run the presend to set anything else
	//ClientEndFrame( ent );

	// Clear entity state values.
	bg.PlayerStateToEntityState(client.ps, ent.s);
}

/**
 * ClientRespawn
 */
function ClientRespawn(ent) {
	// CopyToBodyQue(ent);
	ClientSpawn(ent);
}

/**
 * ClientDisconnect
 *
 * Called when a player drops from the server, will not be
 * called between levels.
 * This should NOT be called directly by any game logic,
 * call sv.DropClient(), which will call this and do
 * server system housekeeping.
 */
function ClientDisconnect(clientNum) {
	var ent = level.gentities[clientNum];

	if (!ent.client/* || ent.client.pers.connected == CON_DISCONNECTED*/) {
		return;
	}

	log('ClientDisconnect: ' + clientNum);

	sv.UnlinkEntity (ent);
	ent.s.modelIndex = 0;
	ent.classname = 'disconnected';
	/*ent.client.pers.connected = CON_DISCONNECTED;
	ent.client.ps.persistant[PERS_TEAM] = TEAM_FREE;
	ent.client.sess.sessionTeam = TEAM_FREE;
	trap_SetConfigstring( CS_PLAYERS + clientNum, "");*/
}

/**
 * SetClientViewAngle
 *
 * Set's the actual entitystate angles, as well as the
 * delta_angles of the playerstate, which the client uses
 * to offset it's own predicted angles when rendering.
 */
function SetClientViewAngle(ent, angles) {
	// Set the delta angle.
	for (var i = 0; i < 3; i++) {
		var cmdAngle = qm.AngleToShort(angles[i]);
		ent.client.ps.delta_angles[i] = cmdAngle - ent.client.pers.cmd.angles[i];
	}
	vec3.set(angles, ent.s.angles);
	vec3.set(ent.s.angles, ent.client.ps.viewangles);
}

/**
 * SelectNearestDeathmatchSpawnPoint
 */
function SelectNearestDeathmatchSpawnPoint(from) {
	var nearestDist = 999999;
	var nearestSpot = null;
	var spawnpoints = FindEntity('classname', 'info_player_deathmatch');

	for (var i = 0; i < spawnpoints.length; i++) {
		var spawnpoint = spawnpoints[i];
		var dist = vec3.length(vec3.subtract(spawnpoint.origin, from, [0, 0, 0]));

		if (dist < nearestDist) {
			nearestDist = dist;
			nearestSpot = spawnpoint;
		}
	}

	return nearestSpot;
}

/**
 * SelectRandomDeathmatchSpawnPoint
 */
function SelectRandomDeathmatchSpawnPoint() {
	var spawnpoints = FindEntity('classname', 'info_player_deathmatch');
	return spawnpoints[Math.floor(Math.random()*spawnpoints.length)];
}

		/**
 * Damage
 *
 * Apply damage to an entity.
 * inflictor, attacker, dir, and point can be NULL for environmental damage.
 *
 * @param {GameEntity} targ      Entity that is being damaged
 * @param {GameEntity} inflictor Entity that is causing the damage
 * @param {GameEntity} attacker  Entity that caused the inflictor to damage targ
 * @param {vec3}       dir       Direction of the attack for knockback
 * @param {vec3}       point     Point at which the damage is being inflicted, used for headshots
 * @param {int}        damage    Amount of damage being inflicted
 * @param {int}        dflags    Flags used to control how Damage works
 *                               DAMAGE.RADIUS:        damage was indirect (from a nearby explosion)
 *                               DAMAGE.NO_ARMOR:      armor does not protect from this damage
 *                               DAMAGE.NO_KNOCKBACK:  do not affect velocity, just view angles
 *                               DAMAGE.NO_PROTECTION: kills godmode, armor, everything
 * @param {MOD}         mod      Method of death.
 */
function Damage(targ, inflictor, attacker, dir, point, damage, dflags, mod) {
	if (!targ.takeDamage) {
		return;
	}

	// // The intermission has already been qualified for, so don't
	// // allow any extra scoring.
	// if (level.intermissionQueued) {
	// 	return;
	// }

	if (!inflictor) {
		inflictor = level.gentities[ENTITYNUM_WORLD];
	}

	if (!attacker) {
		attacker = level.gentities[ENTITYNUM_WORLD];
	}

	// // Shootable doors / buttons don't actually have any health.
	// if (targ.s.eType == ET.MOVER) {
	// 	if (targ.use && targ.moverState == MOVER_POS1) {
	// 		targ.use( targ, inflictor, attacker );
	// 	}
	// 	return;
	// }

	// // Reduce damage by the attacker's handicap value
	// // unless they are rocket jumping.
	// if (attacker.client && attacker !== targ) {
	// 	max = attacker.client.ps.stats[STAT_MAX_HEALTH];
	// 	damage = damage * max / 100;
	// }

	var client = targ.client;
	if (client && client.noclip) {
		return;
	}

	if (!dir) {
		dflags |= DAMAGE.NO_KNOCKBACK;
	} else {
		vec3.normalize(dir);
	}

	var knockback = damage;
	if (knockback > 200) {
		knockback = 200;
	}
	if (targ.flags & GFL.NO_KNOCKBACK) {
		knockback = 0;
	}
	if (dflags & DAMAGE.NO_KNOCKBACK) {
		knockback = 0;
	}

	// Figure momentum add, even if the damage won't be taken.
	if (knockback && targ.client) {
		var mass = 200;
		var kvel = vec3.scale(dir, g_knockback() * knockback / mass, [0, 0, 0]);
		vec3.add(targ.client.ps.velocity, kvel);

		// Set the timer so that the other client can't cancel
		// out the movement immediately.
		if (!targ.client.ps.pm_time) {
			var t = knockback * 2;
			if (t < 50) {
				t = 50;
			} else if (t > 200) {
				t = 200;
			}

			targ.client.ps.pm_time = t;
			targ.client.ps.pm_flags |= PMF.TIME_KNOCKBACK;
		}
	}

	// // Check for completely getting out of the damage.
	// if (!(dflags & DAMAGE.NO_PROTECTION)) {
	// 	// If TF_NO_FRIENDLY_FIRE is set, don't do damage to the target.
	// 	// If the attacker was on the same team.
	// 	if (targ !== attacker && OnSameTeam(targ, attacker)) {
	// 		if (!g_friendlyFire()) {
	// 			return;
	// 		}
	// 	}

	// 	// Check for godmode.
	// 	if (targ.flags & GFL.GODMODE) {
	// 		return;
	// 	}
	// }

	// // Battlesuit protects from all radius damage (but takes knockback)
	// // and protects 50% against all damage.
	// if (client && client.ps.powerups[PW_BATTLESUIT]) {
	// 	AddEvent(targ, EV.POWERUP_BATTLESUIT, 0);
	// 	if ((dflags & DAMAGE.RADIUS) || (mod === MOD.FALLING)) {
	// 		return;
	// 	}
	// 	damage *= 0.5;
	// }

	// // Add to the attacker's hit counter (if the target isn't a general entity like a prox mine).
	// if (attacker.client && client &&
	// 	targ !== attacker && targ.health > 0 &&
	// 	targ.s.eType != ET.MISSILE &&
	// 	targ.s.eType != ET.GENERAL) {
	// 	if (OnSameTeam( targ, attacker)) {
	// 		attacker.client.ps.persistant[PERS.HITS]--;
	// 	} else {
	// 		attacker.client.ps.persistant[PERS.HITS]++;
	// 	}
	// 	attacker.client.ps.persistant[PERS.ATTACKEE_ARMOR] = (targ.health<<8)|(client.ps.stats[STAT.ARMOR]);
	// }

	// Always give half damage if hurting self.
	// Calculated after knockback, so rocket jumping works.
	if (targ === attacker) {
		damage *= 0.5;
	}
	if (damage < 1) {
		damage = 1;
	}

	var take = damage;
	// Save some from armor.
	// asave = CheckArmor(targ, take, dflags);
	// take -= asave;

	if (g_debugDamage.integer) {
		log(level.time, ', client', targ.s.number, ', health', targ.health, ', damage', take, ', armor', asave);
	}

	// Add to the damage inflicted on a player this frame.
	// The total will be turned into screen blends and view angle kicks
	// at the end of the frame.
	// if (client) {
	// 	if (attacker) {
	// 		client.ps.persistant[PERS.ATTACKER] = attacker.s.number;
	// 	} else {
	// 		client.ps.persistant[PERS.ATTACKER] = ENTITYNUM_WORLD;
	// 	}
	// 	client.damage_armor += asave;
	// 	client.damage_blood += take;
	// 	client.damage_knockback += knockback;
	// 	if (dir) {
	// 		vec3.set(dir, client.damage_from)
	// 		client.damage_fromWorld = false;
	// 	} else {
	// 		vec3.set(targ.currentOrigin, client.damage_from);
	// 		client.damage_fromWorld = true;
	// 	}
	// }

	// See if it's the player hurting the emeny flag carrier.
	// if (g_gametype.integer === GT_CTF) {
	// 	Team_CheckHurtCarrier(targ, attacker);
	// }

	// if (targ.client) {
	// 	// set the last client who damaged the target
	// 	targ.client.lasthurt_client = attacker.s.number;
	// 	targ.client.lasthurt_mod = mod;
	// }

	// Do the damage.
	if (take) {
		targ.health = targ.health - take;

		// TODO Is this necessary? We do this in EndClientFrame
		if (targ.client) {
			targ.client.ps.stats[STAT.HEALTH] = targ.health;
		}
			
		if (targ.health <= 0) {
			if (client) {
				targ.flags |= GFL.NO_KNOCKBACK;
			}

			if (targ.health < -999) {
				targ.health = -999;
			}

			targ.enemy = attacker;
			targ.die(targ, inflictor, attacker, take, mod);
			return;
		}
		// } else if (targ.pain) {
		// 	targ.pain (targ, attacker, take);
		// }
	}

}

/**
 * RadiusDamage
 */
function RadiusDamage(origin, attacker, damage, radius, ignore, mod) {
	var v = [0, 0, 0];
	var mins = [0, 0, 0];
	var maxs = [0, 0, 0];
	var hitClient = false;

	if (radius < 1) {
		radius = 1;
	}

	for (var i = 0; i < 3; i++) {
		mins[i] = origin[i] - radius;
		maxs[i] = origin[i] + radius;
	}

	var entityNums = sv.FindEntitiesInBox(mins, maxs);

	for (var e = 0; e < entityNums.length; e++) {
		var ent = level.gentities[entityNums[e]];

		if (ent === ignore) {
			continue;
		}

		if (!ent.takeDamage) {
			continue;
		}

		// Find the distance from the edge of the bounding box.
		for (var i = 0; i < 3; i++) {
			if (origin[i] < ent.absmin[i]) {
				v[i] = ent.absmin[i] - origin[i];
			} else if (origin[i] > ent.absmax[i]) {
				v[i] = origin[i] - ent.absmax[i];
			} else {
				v[i] = 0;
			}
		}

		var dist = vec3.length(v);
		if (dist >= radius) {
			continue;
		}

		points = damage * (1.0 - dist / radius);

		if (CanDamage (ent, origin)) {
			if (LogAccuracyHit(ent, attacker)) {
				hitClient = true;
			}

			var dir = vec3.subtract(ent.currentOrigin, origin, [0, 0, 0]);
			// Push the center of mass higher than the origin so players
			// get knocked into the air more.
			dir[2] += 24;
			
			Damage(ent, null, attacker, dir, origin, points, DAMAGE.RADIUS, mod);
		}
	}

	return hitClient;
}


/**
 * CanDamage
 *
 * Returns true if the inflictor can directly damage the target. Used for
 * explosions and melee attacks.
 */
function CanDamage(targ, origin) {
	// Use the midpoint of the bounds instead of the origin, because
	// bmodels may have their origin is 0,0,0
	var midpoint = vec3.add(targ.absmin, targ.absmax, [0, 0, 0]);
	vec3.scale(midpoint, 0.5);

	var dest = vec3.set(midpoint, [0, 0, 0]);
	var tr = sv.Trace(origin, dest, qm.vec3_origin, qm.vec3_origin, ENTITYNUM_NONE, MASK.SOLID);
	if (tr.fraction === 1.0 || tr.entityNum === targ.s.number) {
		return true;
	}

	// This should probably check in the plane of projection, 
	// rather than in world coordinate, and also include Z.
	vec3.set(midpoint, dest);
	dest[0] += 15.0;
	dest[1] += 15.0;
	tr = sv.Trace(origin, dest, qm.vec3_origin, qm.vec3_origin, ENTITYNUM_NONE, MASK.SOLID);
	if (tr.fraction === 1.0) {
		return true;
	}

	vec3.set(midpoint, dest);
	dest[0] += 15.0;
	dest[1] -= 15.0;
	tr = sv.Trace(origin, dest, qm.vec3_origin, qm.vec3_origin, ENTITYNUM_NONE, MASK.SOLID);
	if (tr.fraction === 1.0) {
		return true;
	}

	vec3.set(midpoint, dest);
	dest[0] -= 15.0;
	dest[1] += 15.0;
	tr = sv.Trace(origin, dest, qm.vec3_origin, qm.vec3_origin, ENTITYNUM_NONE, MASK.SOLID);
	if (tr.fraction === 1.0) {
		return true;
	}

	vec3.set(midpoint, dest);
	dest[0] -= 15.0;
	dest[1] -= 15.0;
	tr = sv.Trace(origin, dest, qm.vec3_origin, qm.vec3_origin, ENTITYNUM_NONE, MASK.SOLID);
	if (tr.fraction === 1.0) {
		return true;
	}

	return false;
}

/**
 * Player_Die
 */
var deathAnim = 0;
function Player_Die(self, inflictor, attacker, damage, meansOfDeath) {
	if (self.client.ps.pm_type === PM.DEAD) {
		return;
	}

	// if (level.intermissiontime) {
	// 	return;
	// }

	// // Check for an almost capture.
	// CheckAlmostCapture(self, attacker);

	// // Check for a player that almost brought in cubes.
	// CheckAlmostScored(self, attacker);

	// if (self.client && self.client.hook) {
	// 	Weapon_HookFree(self.client.hook);
	// }

	self.client.ps.pm_type = PM.DEAD;

	var killer;
	if (attacker) {
		killer = attacker.s.number;
		if (attacker.client) {
			killerName = attacker.client.pers.netname;
		} else {
			killerName = "<non-client>";
		}
	}
	if (killer === undefined || killer < 0 || killer >= MAX_CLIENTS) {
		killer = ENTITYNUM_WORLD;
		killerName = "<world>";
	}

	log('Kill:', killer, self.s.number, meansOfDeath, ',', killerName, 'killed', self.client.pers.netname);

	// Broadcast the death event to everyone
	var ent = TempEntity(self.currentOrigin, EV.OBITUARY);
	ent.s.eventParm = meansOfDeath;
	ent.s.otherEntityNum = self.s.number;
	ent.s.otherEntityNum2 = killer;
	ent.svFlags = SVF.BROADCAST;  // send to everyone

	self.enemy = attacker;

	self.client.ps.persistant[PERS.KILLED]++;

	if (attacker && attacker.client) {
		attacker.client.lastkilled_client = self.s.number;

		// if (attacker == self || OnSameTeam(self, attacker)) {
		// 	AddScore(attacker, self.currentOrigin, -1);
		// } else {
		// 	AddScore(attacker, self.currentOrigin, 1);

			if (meansOfDeath === MOD.GAUNTLET) {
				// Play humiliation on player.
				attacker.client.ps.persistant[PERS.GAUNTLET_FRAG_COUNT]++;

				// Add the sprite over the player's head
				attacker.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
				attacker.client.ps.eFlags |= EF.AWARD_GAUNTLET;
				attacker.client.rewardTime = level.time + REWARD_SPRITE_TIME;

				// Also play humiliation on target.
				self.client.ps.persistant[PERS.PLAYEREVENTS] ^= PLAYEREVENT_GAUNTLETREWARD;
			}

			// check for two kills in a short amount of time
			// if this is close enough to the last kill, give a reward sound
			if ( level.time - attacker.client.lastKillTime < CARNAGE_REWARD_TIME ) {
				// play excellent on player
				attacker.client.ps.persistant[PERS.EXCELLENT_COUNT]++;

				// add the sprite over the player's head
				attacker.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
				attacker.client.ps.eFlags |= EF.AWARD_EXCELLENT;
				attacker.client.rewardTime = level.time + REWARD_SPRITE_TIME;
			}
			attacker.client.lastKillTime = level.time;
		// }
	} else {
		// AddScore(self, self.currentOrigin, -1);
	}

	// // Add team bonuses
	// Team_FragBonuses(self, inflictor, attacker);

	// If I committed suicide, the flag does not fall, it returns.
	// if (meansOfDeath === MOD.SUICIDE) {
	// 	if ( self.client.ps.powerups[PW_NEUTRALFLAG] ) {		// only happens in One Flag CTF
	// 		Team_ReturnFlag( TEAM_FREE );
	// 		self.client.ps.powerups[PW_NEUTRALFLAG] = 0;
	// 	}
	// 	else if ( self.client.ps.powerups[PW_REDFLAG] ) {		// only happens in standard CTF
	// 		Team_ReturnFlag( TEAM_RED );
	// 		self.client.ps.powerups[PW_REDFLAG] = 0;
	// 	}
	// 	else if ( self.client.ps.powerups[PW_BLUEFLAG] ) {	// only happens in standard CTF
	// 		Team_ReturnFlag( TEAM_BLUE );
	// 		self.client.ps.powerups[PW_BLUEFLAG] = 0;
	// 	}
	// }

	// TossClientItems(self);

	// Cmd_Score_f(self);  // show scores

	// // Send updated scores to any clients that are following this one,
	// // or they would get stale scoreboards.
	// for ( i = 0 ; i < level.maxclients ; i++ ) {
	// 	gclient_t	*client;

	// 	client = &level.clients[i];
	// 	if ( client.pers.connected != CON_CONNECTED ) {
	// 		continue;
	// 	}
	// 	if ( client.sess.sessionTeam != TEAM_SPECTATOR ) {
	// 		continue;
	// 	}
	// 	if ( client.sess.spectatorClient == self.s.number ) {
	// 		Cmd_Score_f( g_entities + i );
	// 	}
	// }

	self.takeDamage = true;  // can still be gibbed

	self.s.weapon = WP.NONE;
	self.s.powerups = 0;
	self.contents = CONTENTS.CORPSE;

	self.s.angles[0] = 0;
	self.s.angles[2] = 0;
	LookAtKiller(self, inflictor, attacker);
	vec3.set(self.s.angles, self.client.ps.viewangles);

	self.s.loopSound = 0;
	self.maxs[2] = -8;

	// Don't allow respawn until the death anim is done
	// g_forcerespawn may force spawning at some later time.
	self.client.respawnTime = level.time + 1700;

	// Remove powerups.
	for (var i = 0; i < MAX_POWERUPS; i++) {
		self.client.ps.powerups[i] = 0;
	}

	// // Never gib in a nodrop.
	// var contents = trap_PointContents( self.r.currentOrigin, -1 );

	// if ( (self.health <= GIB_HEALTH && !(contents & CONTENTS_NODROP) && g_blood.integer) || meansOfDeath == MOD_SUICIDE) {
	// 	// gib death
	// 	GibEntity( self, killer );
	// } else {
		// Normal death
		var anim;

		switch (deathAnim) {
			case 0:
				anim = ANIM.BOTH_DEATH1;
				break;
			case 1:
				anim = ANIM.BOTH_DEATH2;
				break;
			case 2:
			default:
				anim = ANIM.BOTH_DEATH3;
				break;
		}

		// For the no-blood option, we need to prevent the health
		// from going to gib level.
		if (self.health <= GIB_HEALTH) {
			self.health = GIB_HEALTH+1;
		}

		self.client.ps.legsAnim = ((self.client.ps.legsAnim & ANIM_TOGGLEBIT) ^ ANIM_TOGGLEBIT) | anim;
		self.client.ps.torsoAnim =  ((self.client.ps.torsoAnim & ANIM_TOGGLEBIT) ^ ANIM_TOGGLEBIT ) | anim;

		AddEvent(self, EV.DEATH1 + i, killer);

		// The body can still be gibbed.
		// self.die = body_die;

		// globally cycle through the different death animations
		deathAnim = (deathAnim + 1) % 3;
	// }

	sv.LinkEntity(self);
}

/**
 * LookAtKiller
 */
function LookAtKiller(self, inflictor, attacker) {
	var dir = [0, 0, 0];

	if (attacker && attacker !== self) {
		vec3.subtract(attacker.s.pos.trBase, self.s.pos.trBase, dir);
	} else if (inflictor && inflictor !== self) {
		vec3.subtract(inflictor.s.pos.trBase, self.s.pos.trBase, dir);
	} else {
		self.client.ps.stats[STAT.DEAD_YAW] = self.s.angles[qm.YAW];
		return;
	}

	self.client.ps.stats[STAT.DEAD_YAW] = VecToYaw(dir);
}

/**
 * VecToYaw
 */
function VecToYaw(vec) {
	var yaw;
	
	if (vec[qm.YAW] === 0 && vec[qm.PITCH] === 0) {
		yaw = 0;
	} else {
		if (vec[qm.PITCH]) {
			yaw = (Math.atan2(vec[qm.YAW], vec[qm.PITCH]) * 180 / Math.PI);
		} else if (vec[qm.YAW] > 0) {
			yaw = 90;
		} else {
			yaw = 270;
		}
		if (yaw < 0) {
			yaw += 360;
		}
	}

	return yaw;
}

/**
 * LogAccuracyHit
 */
function LogAccuracyHit(target, attacker) {
	if (!target.takeDamage) {
		return false;
	}

	if (target === attacker) {
		return false;
	}

	if (!target.client) {
		return false;
	}

	if (!attacker.client) {
		return false;
	}

	if (target.client.ps.stats[STAT.HEALTH] <= 0) {
		return false;
	}

	// if (OnSameTeam(target, attacker)) {
	// 	return false;
	// }

	return true;
}

/**
 * CheckArmor
 */
function CheckArmor(ent, damage, dflags) {
	if (!damage) {
		return 0;
	}

	if (dflags & DAMAGE.NO_ARMOR) {
		return 0;
	}

	var client = ent.client;
	if (!client) {
		return 0;
	}

	var count = client.ps.stats[STAT.ARMOR];
	var save = Math.ceil(damage * ARMOR_PROTECTION);
	if (save >= count) {
		save = count;
	}

	if (!save) {
		return 0;
	}

	client.ps.stats[STAT.ARMOR] -= save;

	return save;
}

		var entityEvents = {};

// Maps entity definition values to entity values.
var keyMap = {
	'origin':     ['s.origin', 'currentOrigin'],
	'angles':     ['s.angles'],
	'targetname': ['targetName']
};

/**
 * SpawnEntity
 */
function SpawnEntity() {
	for (var i = MAX_CLIENTS; i < MAX_GENTITIES; i++) {
		var ent = level.gentities[i];

		if (ent.inuse) {
			continue;
		}

		// We don't immediately re-use freed entities, it can cause confusion
		// in the client snapshots. However, the first couple seconds of
		// server time can involve a lot of freeing and allocating, so relax
		// the replacement policy
		if (ent.freeTime > level.startTime + 2000 && level.time - ent.freeTime < 1000) {
			continue;
		}

		ent.reset();
		ent.s.number = i;
		ent.inuse = true;

		return ent;
	}

	return null;//throw new Error('Game entities is full');
}

/**
 * FreeEntity
 */
function FreeEntity(ent) {
	sv.UnlinkEntity(ent); // unlink from world

	ent.classname = 'freed';
	ent.freeTime = level.time;
	ent.inuse = false;
}

/**
 * TempEntity
 *
 * Spawns an event entity that will be auto-removed.
 * The origin will be snapped to save net bandwidth, so care
 * must be taken if the origin is right on a surface (snap towards start vector first).
 */
function TempEntity(origin, event) {
	var e = SpawnEntity();
	e.s.eType = ET.EVENTS + event;

	e.classname = 'tempEntity';
	e.eventTime = level.time;
	e.freeAfterEvent = true;

	// vec3.set(origin, snapped);
	// SnapVector(snapped);  // save network bandwidth
	SetOrigin(e, origin);

	sv.LinkEntity(e);

	return e;
}


/**
 * FindEntity
 */
function FindEntity(key, value) {
	var results = [];

	for (var i = 0; i < level.gentities.length; i++) {
		var ent = level.gentities[i];
		if (!ent.inuse) {
			continue;
		}

		if (ent[key] === value) {
			results.push(ent);
		}
	}

	return results;
}

/**
 * EntityThink
 */
function EntityThink(ent) {
	var thinktime = ent.nextthink;

	if (thinktime <= 0) {
		return;
	} else if (thinktime > level.time) {
		return;
	}
	
	ent.nextthink = 0;

	if (!ent.think) {
		error('NULL ent->think');
	}

	ent.think.call(this, ent);
}

/**
 * EntityPickTarget
 */
function EntityPickTarget(targetName) {
	if (!targetName) {
		error('EntityPickTarget called with NULL targetname');
	}

	var choices = FindEntity('targetName', targetName);

	if (!choices.length) {
		error('EntityPickTarget: target ' + targetName + ' not found');
	}

	return choices[Math.floor(Math.random()*choices.length)];
}

/**
 * SpawnEntityFromDef
 */
function SpawnEntityFromDef(def) {
	var ent = SpawnEntity();

	// Merge definition info into the entity.
	for (var defKey in def) {
		if (!def.hasOwnProperty(defKey)) {
			continue;
		}

		// Use the mapping if it exists.
		var entKeys = keyMap[defKey] || [defKey];

		// Set all mapped keys.
		for (var i = 0; i < entKeys.length; i++) {
			var entKey = entKeys[i];

			// Don't merge keys that aren't expected.
			// TODO Do we have to use eval?
			var val = eval('ent.' + entKey);
			if (val === undefined) {
				continue;
			}
			eval('ent.' + entKey + ' = def[defKey]');
		}
	}
	
	// Merge entity-specific callbacks in.
	if (entityEvents[ent.classname]) {
		_.extend(ent, entityEvents[ent.classname]);
	}

	// Call spawn function if it exists.
	var spawn;

	// See if we should spawn this as an item.
	for (var i = 0; i < bg.ItemList.length; i++) {
		var item = bg.ItemList[i];

		if (item.classname === ent.classname) {
			SpawnItem(ent, item);
			return;
		}
	}

	if (!ent.spawn) {
		FreeEntity(ent);
		//log(ent.classname + ' doesn\'t have a spawn function', ent.targetname);
		return;
	}

	ent.spawn.call(this, ent);
}

/**
 * SpawnAllEntitiesFromDefs
 *
 * Spawns all the map entities into the game.
 */
function SpawnAllEntitiesFromDefs() {
	var entityDefs = sv.GetEntityDefs();

	for (var i = 0; i < entityDefs.length; i++) {
		var def = entityDefs[i];
		SpawnEntityFromDef(def);
	}
}

/**
 * SetOrigin
 * 
 * Set the entities current origin as well as the entity's
 * associated trajectory information to make it stationary.
 */
function SetOrigin(ent, origin) {
	vec3.set(origin, ent.s.pos.trBase);
	ent.s.pos.trType = TR.STATIONARY;
	ent.s.pos.trTime = 0;
	ent.s.pos.trDuration = 0;
	vec3.set([0, 0, 0], ent.s.pos.trDelta);

	vec3.set(origin, ent.currentOrigin);
}

/**
 * AddPredictableEvent
 *
 * Use for non-pmove events that would also be predicted on the
 * client side: jumppads and item pickups
 * Adds an event + parm and twiddles the event counter
 */
function AddPredictableEvent(ent, event, eventParm) {
	if (!ent.client) {
		return;
	}

	bg.AddPredictableEventToPlayerstate(ent.client.ps, event, eventParm);
}

/**
 * AddEvent
 *
 * Adds an event+parm and twiddles the event counter
 */
function AddEvent(ent, event, eventParm) {
	var bits;

	if (!event) {
		log('AddEvent: zero event added for entity', ent.s.number);
		return;
	}

	// Clients need to add the event in PlayerState instead of EntityState.
	if (ent.client) {
		bits = ent.client.ps.externalEvent & EV_EVENT_BITS;
		bits = (bits + EV_EVENT_BIT1) & EV_EVENT_BITS;
		ent.client.ps.externalEvent = event | bits;
		ent.client.ps.externalEventParm = eventParm;
		ent.client.ps.externalEventTime = level.time;
	} else {
		bits = ent.s.event & EV_EVENT_BITS;
		bits = (bits + EV_EVENT_BIT1) & EV_EVENT_BITS;
		ent.s.event = event | bits;
		ent.s.eventParm = eventParm;
	}
	ent.eventTime = level.time;
}
		var RESPAWN = {
	ARMOR      : 25,
	HEALTH     : 35,
	AMMO       : 40,
	HOLDABLE   : 60,
	MEGAHEALTH : parseInt(35 / 120, 10),
	POWERUP    : 120
};

/**
 * SpawnItem
 *
 * Sets the clipping size and plants the object on the floor.
 * Items can't be immediately dropped to floor, because they might
 * be on an entity that hasn't spawned yet.
 */
function SpawnItem(ent, item) {
	ent.item = item;
	// Some movers spawn on the second frame, so delay item
	// spawns until the third frame so they can ride trains.
	ent.nextthink = level.time + FRAMETIME * 2;
	ent.think = FinishSpawningItem;
	
	//ent.physicsBounce = 0.50;		// items are bouncy
	
	/*if (item.giType == IT_POWERUP ) {
		G_SoundIndex( "sound/items/poweruprespawn.wav" );
		G_SpawnFloat( "noglobalsound", "0", &ent->speed);
	}*/
}

/**
 * FinishSpawningItem
 *
 * Traces down to find where an item should rest, instead of letting them
 * free fall from their spawn points
 */
function FinishSpawningItem(ent) {
	var itemIndex = bg.ItemList.indexOf(ent.item);

	vec3.set([-ITEM_RADIUS, -ITEM_RADIUS, -ITEM_RADIUS], ent.mins);
	vec3.set([ITEM_RADIUS, ITEM_RADIUS, ITEM_RADIUS], ent.maxs);

	ent.s.eType = ET.ITEM;
	ent.s.modelIndex = itemIndex;
	//ent.s.modelIndex2 = 0; // zero indicates this isn't a dropped item

	ent.contents = CONTENTS.TRIGGER;
	ent.touch = TouchItem;
	//ent->use = Use_Item;

	//if (ent.spawnflags & 1) {
		// suspended
		SetOrigin(ent, ent.s.origin);
	//} else {
		// drop to floor
		/*var dest = vec3.create([ent.s.origin[0], ent.s.origin[1], ent.s.origin[2] - 4096]);

		trap_Trace( &tr, ent->s.origin, ent->r.mins, ent->r.maxs, dest, ent->s.number, MASK.SOLID );
		if ( tr.startsolid ) {
			G_Printf ("FinishSpawningItem: %s startsolid at %s\n", ent->classname, vtos(ent->s.origin));
			G_FreeEntity( ent );
			return;
		}

		// allow to ride movers
		ent->s.groundEntityNum = tr.entityNum;

		G_SetOrigin( ent, tr.endPos );*/
	//}

	/*// team slaves and targeted items aren't present at start
	if ( ( ent->flags & FL_TEAMSLAVE ) || ent->targetName ) {
		ent->s.eFlags |= EF_NODRAW;
		ent->r.contents = 0;
		return;
	}

	// powerups don't spawn in for a while
	if ( ent->item->giType == IT_POWERUP ) {
		float	respawn;

		respawn = 45 + crandom() * 15;
		ent->s.eFlags |= EF_NODRAW;
		ent->r.contents = 0;
		ent->nextthink = level.time + respawn * 1000;
		ent->think = RespawnItem;
		return;
	}*/

	sv.LinkEntity(ent);
}

/**
 * RespawnItem
 */
function RespawnItem(self) {
// 	// randomly select from teamed entities
// 	if (self.team) {
// 		gentity_t	*master;
// 		int	count;
// 		int choice;
// 
// 		if ( !ent->teammaster ) {
// 			G_Error( "RespawnItem: bad teammaster");
// 		}
// 		master = ent->teammaster;
// 
// 		for (count = 0, ent = master; ent; ent = ent->teamchain, count++)
// 			;
// 
// 		choice = rand() % count;
// 
// 		for (count = 0, ent = master; count < choice; ent = ent->teamchain, count++)
// 			;
// 	}
	
	self.contents = CONTENTS.TRIGGER;
	self.s.eFlags &= ~EF.NODRAW;
	self.svFlags &= ~SVF.NOCLIENT;
	sv.LinkEntity(self);

// 	if ( self.item.giType == IT.POWERUP ) {
// 		// play powerup spawn sound to all clients
// 		var tent;
// 
// 		// if the powerup respawn sound should Not be global
// 		if (self.speed) {
// 			tent = G_TempEntity( ent->s.pos.trBase, EV_GENERAL_SOUND );
// 		}
// 		else {
// 			tent = G_TempEntity( ent->s.pos.trBase, EV_GLOBAL_SOUND );
// 		}
// 		tent.s.eventParm = G_SoundIndex( "sound/items/poweruprespawn.wav" );
// 		tent.svFlags |= SVF.BROADCAST;
// 	}
// 
// 	if ( self.item.giType == IT.HOLDABLE && self.item.giTag == HI_KAMIKAZE ) {
// 		// play powerup spawn sound to all clients
// 		gentity_t	*te;
// 
// 		// if the powerup respawn sound should Not be global
// 		if (self.speed) {
// 			te = G_TempEntity( ent->s.pos.trBase, EV_GENERAL_SOUND );
// 		}
// 		else {
// 			te = G_TempEntity( ent->s.pos.trBase, EV_GLOBAL_SOUND );
// 		}
// 		te->s.eventParm = G_SoundIndex( "sound/items/kamikazerespawn.wav" );
// 		te->r.svFlags |= SVF_BROADCAST;
// 	}
// 
// play the normal respawn sound only to nearby clients
// 	G_AddEvent( ent, EV_ITEM_RESPAWN, 0 );
// 
	self.nextthink = 0;
}

/**
 * TouchItem
 */
function TouchItem(self, other) {
	var respawn,
		predict;
	
	if (!other.client) { return; }
//	if (!other.health || other.health < 1) { return; } // dead people can't pickup
	
	// The same pickup rules are used for client side and server side.
	if (!bg.CanItemBeGrabbed(/*g_gametype()*/ null, self.s, other.client.ps)) {
		return;
	}

// 	G_LogPrintf( "Item: %i %s\n", other->s.number, ent->item->classname );
// 
// 	predict = other.client.pers['predictItemPickup'];
	
	// call the item-specific pickup function
	switch (self.item.giType) {
		case IT.WEAPON:
			respawn = PickupWeapon(self, other);
			break;
		case IT.AMMO:
			respawn = PickupAmmo(self, other);
			break;
		case IT.ARMOR:
			respawn = PickupArmor(self, other);
			break;
		case IT.HEALTH:
			respawn = PickupHealth(self, other);
			break;
		case IT.POWERUP:
			respawn = PickupPowerup(self, other);
			predict = false;
			break;
		case IT.TEAM:
			respawn = PickupTeam(self, other);
			break;
		case IT.HOLDABLE:
			respawn = PickupHoldable(self, other);
			break;
		default:
			return;
	}
	
	if (!respawn) { return; }
	
// 	// play the normal pickup sound
// 	if (predict) {
		bg.AddPredictableEventToPlayerstate(other.client.ps, EV.ITEM_PICKUP, self.s.modelIndex);
// 	} else {
// 		G_AddEvent( other, EV.ITEM_PICKUP, self.s.modelIndex );
// 	}
// 
// 	// powerup pickups are global broadcasts
// 	if ( self.item->giType == IT.POWERUP || self.item->giType == IT.TEAM) {
// 		// if we want the global sound to play
// 		if (!self.speed) {
// 			gentity_t	*te;
// 
// 			te = G_TempEntity( self.s.pos.trBase, EV_GLOBAL_ITEM_PICKUP );
// 			te->s.eventParm = self.s.modelIndex;
// 			te->r.svFlags |= SVF_BROADCAST;
// 		} else {
// 			gentity_t	*te;
// 
// 			te = G_TempEntity( self.s.pos.trBase, EV_GLOBAL_ITEM_PICKUP );
// 			te->s.eventParm = self.s.modelIndex;
// 			// only send this temp entity to a single client
// 			te->r.svFlags |= SVF_SINGLECLIENT;
// 			te->r.singleClient = other->s.number;
// 		}
// 	}
// 
// 	// fire item targets
// 	G_UseTargets (ent, other);

	// Wait of -1 will not respawn.
	if (self.wait === -1) {
		self.svFlags |= SVF.NOCLIENT;
		self.s.eFlags |= EF.NODRAW;
		self.contents = 0;
		self.unlinkAfterEvent = true;
		return;
	}
	
	// Non-zero wait overrides respawn time.
	if (self.wait) {
		respawn = self.wait;
	}
	
	// Random can be used to vary the respawn time.
	if (self.random) {
		respawn += Math.random() * self.random;
		if (respawn < 1) {
			respawn = 1;
		}
	}
	
// 	// Dropped items will not respawn.
// 	if ( self.flags & FL_DROPPED_ITEM ) {
// 		self.freeAfterEvent = true;
// 	}
	
	// Picked up items still stay around, they just don't
	// draw anything.  This allows respawnable items
	// to be placed on movers.
	self.svFlags |= SVF.NOCLIENT;
	self.s.eFlags |= EF.NODRAW;
	self.contents = 0;
	
	// A negative respawn times means to never respawn this item (but don't 
	// delete it).  This is used by items that are respawned by third party 
	// events such as ctf flags
	if (respawn <= 0) {
		self.nextthink = 0;
		self.think = 0;
	} else {
		self.nextthink = level.time + (respawn * 1000);
		self.think = RespawnItem;
	}
	
	sv.LinkEntity(self);
}

/**
 * PickupWeapon
 */
function PickupWeapon(ent, other) {
	var quantity;
	
	if (ent.count < 0) {
		quantity = 0; // None for you, sir!
	} else {
		if (ent.count) {
			quantity = ent.count;
		} else {
			quantity = ent.item.quantity;
		}

		// // dropped items and teamplay weapons always have full ammo
		// if ( ! (ent->flags & FL_DROPPED_ITEM) && g_gametype.integer != GT_TEAM ) {
		// 	// respawning rules
		// 	// drop the quantity if the already have over the minimum
		// 	if ( other->client->ps.ammo[ ent->item->giTag ] < quantity ) {
		// 		quantity = quantity - other->client->ps.ammo[ ent->item->giTag ];
		// 	} else {
		// 		quantity = 1;		// only add a single shot
		// 	}
		// }
	}
	
	// Add the weapon.
	other.client.ps.stats[STAT.WEAPONS] |= (1 << ent.item.giTag);
	
	AddAmmo(other, ent.item.giTag, quantity);
	
	// team deathmatch has slow weapon respawns
	// if ( g_gametype.integer == GT_TEAM ) {
	// 	return g_weaponTeamRespawn.integer;
	// }
	
	return g_weaponRespawn();
}

/**
 * PickupAmmo
 */
function PickupAmmo(ent, other) {
	var quantity;
	
	if (ent.count) {
		quantity = ent.count;
	} else {
		quantity = ent.item.quantity;
	}
	
	AddAmmo(other, ent.item.giTag, quantity);
	
	return RESPAWN.AMMO;
}

/**
 * AddAmmo
 */
function AddAmmo(ent, weapon, count) {
	ent.client.ps.ammo[weapon] += count;
	
	if (ent.client.ps.ammo[weapon] > 200) {
		ent.client.ps.ammo[weapon] = 200;
	}
}

/**
 * PickupArmor
 */
function PickupArmor(ent, other) {	
	other.client.ps.stats[STAT.ARMOR] += ent.item.quantity;
	
	if (other.client.ps.stats[STAT.ARMOR] > other.client.ps.stats[STAT.MAX_HEALTH] * 2) {
		other.client.ps.stats[STAT.ARMOR] = other.client.ps.stats[STAT.MAX_HEALTH] * 2;
	}
	
	return RESPAWN.ARMOR;
}

/**
 * PickupHealth
 */
function PickupHealth(ent, other) {
	var max,
		quantity;
	
	// small and mega healths will go over the max
	if (ent.item.quantity != 5 && ent.item.quantity != 100) {
		max = other.client.ps.stats[STAT.MAX_HEALTH];
	} else {
		max = other.client.ps.stats[STAT.MAX_HEALTH] * 2;
	}
	
	if (ent.count) {
		quantity = ent.count;
	} else {
		quantity = ent.item.quantity;
	}
	
	other.health += quantity;
	
	if (other.health > max) {
		other.health = max;
	}
	
	other.client.ps.stats[STAT.HEALTH] = other.health;
	
	if (ent.item.quantity == 100) {		// mega health respawns slow
		return RESPAWN.MEGAHEALTH;
	}
	
	return RESPAWN.HEALTH;
}

/**
 * PickupPowerup
 */
function PickupPowerup(ent, other) {
	var quantity,
		i,
		client;
	
	if (other.client.ps.powerups[ent.item.giTag]) {
		// round timing to seconds to make multiple powerup timers
		// count in sync
		other.client.ps.powerups[ent.item.giTag] = level.time - ( level.time % 1000 );
	}
	
	if (ent.count) {
		quantity = ent.count;
	} else {
		quantity = ent.item.quantity;
	}
	
	other.client.ps.powerups[ent.item.giTag] += quantity * 1000;
	
	return RESPAWN.POWERUP;
}

/**
 * TODO : Stub functions for now
 */
function PickupTeam(ent, other) { return 0; }
function PickupHoldable(ent, other) { return RESPAWN.HOLDABLE; }

		/**
 * TeleportPlayer
 */
function TeleportPlayer(player, origin, angles) {
	var noAngles = (angles[0] > 999999.0);

	// use temp events at source and destination to prevent the effect
	// from getting dropped by a second player event
	/*if ( player->client->sess.sessionTeam != TEAM_SPECTATOR ) {
		tent = G_TempEntity( player->client->ps.origin, EV_PLAYER_TELEPORT_OUT );
		tent->s.clientNum = player->s.clientNum;

		tent = G_TempEntity( origin, EV_PLAYER_TELEPORT_IN );
		tent->s.clientNum = player->s.clientNum;
	}*/

	// unlink to make sure it can't possibly interfere with G_KillBox
	sv.UnlinkEntity(player);

	vec3.set(origin, player.client.ps.origin);
	player.client.ps.origin[2] += 1;

	if (!noAngles) {
		// spit the player out
		qm.AnglesToVectors(angles, player.client.ps.velocity, null, null);
		vec3.scale(player.client.ps.velocity, 400);
		player.client.ps.pm_time = 160;  // hold time
		player.client.ps.pm_flags |= PMF.TIME_KNOCKBACK;

		// set angles
		SetClientViewAngle(player, angles);
	}

	// toggle the teleport bit so the client knows to not lerp
	player.client.ps.eFlags ^= EF.TELEPORT_BIT;
	// kill anything at the destination
	/*if ( player->client->sess.sessionTeam != TEAM_SPECTATOR ) {
		G_KillBox (player);
	}*/

	// save results of pmove
	bg.PlayerStateToEntityState(player.client.ps, player.s);

	// use the precise origin for linking
	vec3.set(player.client.ps.origin, player.currentOrigin);

	//if ( player->client->sess.sessionTeam != TEAM_SPECTATOR ) {
		sv.LinkEntity(player);
	//}
}
		var MISSILE_PRESTEP_TIME = 50;

/**
 * MissileThink
 */
function MissileThink(ent) {
	// Get current position.
	var origin = [0, 0, 0];
	bg.EvaluateTrajectory(ent.s.pos, level.time, origin);

	// Trace a line from the previous position to the current position.
	var tr = sv.Trace(ent.currentOrigin, origin, ent.mins, ent.maxs, ent.ownerNum, ent.clipmask);
	if (tr.startSolid || tr.allSolid) {
		// Make sure the tr.entityNum is set to the entity we're stuck in.
		tr = sv.Trace(ent.currentOrigin, ent.currentOrigin, ent.mins, ent.maxs, ent.ownerNum, ent.clipmask);
		tr.fraction = 0;
	} else {
		vec3.set(tr.endPos, ent.currentOrigin);
	}

	sv.LinkEntity(ent);

	if (tr.fraction !== 1) {
		// Never explode or bounce on sky.
		if (tr.surfaceFlags & SURF.NOIMPACT) {
			// // If grapple, reset owner.
			// if (ent.parent && ent.parent.client && ent.parent.client.hook == ent) {
			// 	ent.parent.client.hook = NULL;
			// }
			FreeEntity(ent);
			return;
		}
		
		MissileImpact(ent, tr);

		if (ent.s.eType !== ET.MISSILE) {
			return;  // exploded
		}
	}

	// Check think function after bouncing.
	EntityThink(ent);
}

/**
 * MissileImpact
 */
function MissileImpact(ent, trace) {
	var other = level.gentities[trace.entityNum];
	var hitClient = false;

	// Check for bounce.
	// if (!other.takeDamage &&
	// 	(ent.s.eFlags & (EF.BOUNCE | EF.BOUNCE_HALF))) {
	// 	BounceMissile(ent, trace);
	// 	AddEvent(ent, EV.GRENADE_BOUNCE, 0);
	// 	return;
	// }

	// Impact damage.
	if (other.takeDamage) {
		// FIXME: wrong damage direction?
		if (ent.damage) {
			var velocity = [0, 0, 0];

			if (LogAccuracyHit(other, level.gentities[ent.ownerNum])) {
				level.gentities[ent.ownerNum].client.accuracy_hits++;
				hitClient = true;
			}

			bg.EvaluateTrajectoryDelta(ent.s.pos, level.time, velocity);
			if (vec3.length(velocity) === 0) {
				velocity[2] = 1;  // stepped on a grenade
			}
			
			Damage(other, ent, level.gentities[ent.ownerNum], velocity,
				ent.s.origin, ent.damage, 0, ent.methodOfDeath);
		}
	}

	// if (!strcmp(ent.classname, "hook")) {
	// 	gentity_t *nent;
	// 	vec3_t v;

	// 	nent = G_Spawn();
	// 	if ( other.takeDamage && other.client ) {

	// 		G_AddEvent( nent, EV_MISSILE_HIT, DirToByte( trace.plane.normal ) );
	// 		nent.s.otherEntityNum = other.s.number;

	// 		ent.enemy = other;

	// 		v[0] = other.currentOrigin[0] + (other.mins[0] + other.maxs[0]) * 0.5;
	// 		v[1] = other.currentOrigin[1] + (other.mins[1] + other.maxs[1]) * 0.5;
	// 		v[2] = other.currentOrigin[2] + (other.mins[2] + other.maxs[2]) * 0.5;

	// 		SnapVectorTowards( v, ent.s.pos.trBase );	// save net bandwidth
	// 	} else {
	// 		VectorCopy(trace.endpos, v);
	// 		G_AddEvent( nent, EV_MISSILE_MISS, DirToByte( trace.plane.normal ) );
	// 		ent.enemy = NULL;
	// 	}

	// 	SnapVectorTowards( v, ent.s.pos.trBase );	// save net bandwidth

	// 	nent.freeAfterEvent = qtrue;
	// 	// change over to a normal entity right at the point of impact
	// 	nent.s.eType = ET_GENERAL;
	// 	ent.s.eType = ET_GRAPPLE;

	// 	G_SetOrigin( ent, v );
	// 	G_SetOrigin( nent, v );

	// 	ent.think = Weapon_HookThink;
	// 	ent.nextthink = level.time + FRAMETIME;

	// 	ent.parent.client.ps.pm_flags |= PMF_GRAPPLE_PULL;
	// 	VectorCopy( ent.currentOrigin, ent.parent.client.ps.grapplePoint);

	// 	trap_LinkEntity( ent );
	// 	trap_LinkEntity( nent );

	// 	return;
	// }

	// Is it cheaper in bandwidth to just remove this ent and create a new
	// one, rather than changing the missile into the explosion?
	if (other.takeDamage && other.client) {
		AddEvent(ent, EV.MISSILE_HIT, qm.DirToByte(trace.plane.normal));
		ent.s.otherEntityNum = other.s.number;
	} else if (trace.surfaceFlags & SURF.METALSTEPS) {
		AddEvent(ent, EV.MISSILE_MISS_METAL, qm.DirToByte(trace.plane.normal));
	} else {
		AddEvent(ent, EV.MISSILE_MISS, qm.DirToByte(trace.plane.normal));
	}

	ent.freeAfterEvent = true;

	// Change over to a normal entity right at the point of impact
	ent.s.eType = ET.GENERAL;

	// SnapVectorTowards(trace.endpos, ent.s.pos.trBase );  // save net bandwidth

	SetOrigin(ent, trace.endPos);

	// Splash damage (doesn't apply to person directly hit).
	if (ent.splashDamage) {
		if (RadiusDamage(trace.endPos, ent.parent, ent.splashDamage, ent.splashRadius, other, ent.splashMethodOfDeath)) {
			if (!hitClient) {
				level.gentities[ent.ownerNum].client.accuracy_hits++;
			}
		}
	}

	sv.LinkEntity(ent);
}

/**
 * ExplodeMissile
 *
 * Explode a missile without an impact
 */
function ExplodeMissile(ent) {
	var origin = [0, 0, 0];
	// We don't have a valid direction, so just point straight up.
	var dir = [0, 0, 1];

	bg.EvaluateTrajectory(ent.s.pos, level.time, origin);
	// SnapVector(origin);
	SetOrigin(ent, origin);

	ent.s.eType = ET.GENERAL;
	ent.freeAfterEvent = true;
	AddEvent(ent, EV.MISSILE_MISS, DirToByte(dir));

	// Splash damage
	// if (ent.splashDamage) {
	// 	if (G_RadiusDamage( ent.currentOrigin, ent.parent, ent.splashDamage, ent.splashRadius, ent, ent.splashMethodOfDeath ) ) {
	// 		g_entities[ent.ownerNum].client.accuracy_hits++;
	// 	}
	// }

	sv.LinkEntity(ent);
}

/**
 * FireRocket
 */
function FireRocket(self, start, dir) {
	var rocket = SpawnEntity();
	rocket.classname = 'rocket';
	rocket.nextthink = level.time + 15000;
	rocket.think = ExplodeMissile;
	rocket.s.eType = ET.MISSILE;
	rocket.svFlags = SVF.USE_CURRENT_ORIGIN;
	rocket.s.weapon = WP.ROCKET_LAUNCHER;
	rocket.ownerNum = self.s.number;
	rocket.parent = self;
	rocket.damage = 100;
	rocket.splashDamage = 100;
	rocket.splashRadius = 120;
	rocket.methodOfDeath = MOD.ROCKET;
	rocket.splashMethodOfDeath = MOD.ROCKET_SPLASH;
	rocket.clipmask = MASK.SHOT;

	rocket.s.pos.trType = TR.LINEAR;
	rocket.s.pos.trTime = level.time - MISSILE_PRESTEP_TIME;  // move a bit on the very first frame
	vec3.set(start, rocket.s.pos.trBase);
	vec3.normalize(dir);
	vec3.scale(dir, 900, rocket.s.pos.trDelta);
	// SnapVector( rocket.s.pos.trDelta );  // save net bandwidth
	vec3.set(start, rocket.currentOrigin);

	return rocket;
}
		/**
 * AimAtTarget
 */
function AimAtTarget(self) {
	var origin = vec3.add(self.absmin, self.absmax, [0, 0, 0]);
	vec3.scale(origin, 0.5);

	var ent = EntityPickTarget(self.target);
	if (!ent) {
		FreeEntity(self);
		return;
	}

	var height = ent.s.origin[2] - origin[2];
	var gravity = g_gravity();
	var time = Math.sqrt(height / (0.5 * gravity));
	if (!time) {
		FreeEntity(self);
		return;
	}

	// set s.origin2 to the push velocity
	vec3.subtract(ent.s.origin, origin, self.s.origin2 );
	self.s.origin2[2] = 0;

	var dist = vec3.length(self.s.origin2);
	vec3.normalize(self.s.origin2);

	var forward = dist / time;
	vec3.scale(self.s.origin2, forward);

	self.s.origin2[2] = time * gravity;
}
		var MACHINEGUN_SPREAD      = 200;
var MACHINEGUN_DAMAGE      = 7;
var MACHINEGUN_TEAM_DAMAGE = 5; // wimpier MG in teamplay

var forward = [0, 0, 0];
var right   = [0, 0, 0];
var up      = [0, 0, 0];
var muzzle  = [0, 0, 0];

/**
 * FireWeapon
 */
function FireWeapon(ent) {
	var client = ent.client;

	// if (client.ps.powerups[PW_QUAD] ) {
	// 	s_quadFactor = g_quadfactor.value;
	// } else {
	// 	s_quadFactor = 1;
	// }

	// // Track shots taken for accuracy tracking. Grapple is not a weapon and gauntet is just not tracked.
	// if (ent.s.weapon !== WP.GRAPPLING_HOOK && ent.s.weapon !== WP.GAUNTLET) {
	// 	client.accuracy_shots++;
	// }

	// Set aiming directions.
	qm.AnglesToVectors(client.ps.viewangles, forward, right, up);
	CalcMuzzlePointOrigin(ent, client.oldOrigin, forward, right, up, muzzle);

	// Fire the specific weapon.
	switch (ent.s.weapon) {
		// case WP_GAUNTLET:
		// 	Weapon_Gauntlet( ent );
		// 	break;
		// case WP_LIGHTNING:
		// 	Weapon_LightningFire( ent );
		// 	break;
		// case WP_SHOTGUN:
		// 	weapon_supershotgun_fire( ent );
		// 	break;
		case WP.MACHINEGUN:
			// if (g_gametype.integer !== GT_TEAM) {
				BulletFire(ent, MACHINEGUN_SPREAD, MACHINEGUN_DAMAGE, MOD.MACHINEGUN);
			// } else {
			// 	Bullet_Fire( ent, MACHINEGUN_SPREAD, MACHINEGUN_TEAM_DAMAGE, MOD_MACHINEGUN );
			// }
			break;
		// case WP_GRENADE_LAUNCHER:
		// 	weapon_grenadelauncher_fire( ent );
		// 	break;
		case WP.ROCKET_LAUNCHER:
			RocketLauncherFire(ent);
			break;
		// case WP_PLASMAGUN:
		// 	Weapon_Plasmagun_Fire( ent );
		// 	break;
		// case WP_RAILGUN:
		// 	weapon_railgun_fire( ent );
		// 	break;
		// case WP_BFG:
		// 	BFG_Fire( ent );
		// 	break;
		// case WP_GRAPPLING_HOOK:
		// 	Weapon_GrapplingHook_Fire( ent );
		// 	break;
		default:
			break;
	}
}

/**
 * CalcMuzzlePointOrigin
 * 
 * Set muzzle location relative to pivoting eye.
 */
function CalcMuzzlePointOrigin (ent, origin, forward, right, up, muzzlePoint) {
	vec3.set(ent.s.pos.trBase, muzzlePoint);
	muzzlePoint[2] += ent.client.ps.viewheight;
	vec3.add(muzzlePoint, vec3.scale(forward, 14, [0, 0, 0]));
	// Snap to integer coordinates for more efficient network bandwidth usage.
	// SnapVector(muzzlePoint);
}

/**
 * BulletFire
 */
function BulletFire(ent, spread, damage, mod) {
	// damage *= s_quadFactor;

	var r = Math.random() * Math.PI * 2;
	var u = Math.sin(r) * qm.crandom() * spread * 16;
	r = Math.cos(r) * qm.crandom() * spread * 16;

	var end = vec3.add(muzzle, vec3.scale(forward, 8192*16, [0, 0, 0]), [0, 0, 0]);
	vec3.add(end, vec3.scale(right, r, [0, 0, 0]));
	vec3.add(end, vec3.scale(up, u, [0, 0, 0]));

	var passent = ent.s.number;
	
	// for (var i = 0; i < 10; i++) {
		var tr = sv.Trace(muzzle, end, null, null, passent, MASK.SHOT);

		if (tr.surfaceFlags & SURF.NOIMPACT) {
			return;
		}

		var traceEnt = level.gentities[tr.entityNum];

		// Snap the endpos to integers, but nudged towards the line.
		// SnapVectorTowards(tr.endpos, muzzle);

		// Send bullet impact.
		// if (traceEnt->takeDamage && traceEnt->client) {
		// 	tent = G_TempEntity(tr.endpos, EV_BULLET_HIT_FLESH);
		// 	tent.s.eventParm = traceEnt.s.number;
		// 	// if (LogAccuracyHit(traceEnt, ent)) {
		// 	// 	client.accuracy_hits++;
		// 	// }
		// } else {
			var tent = TempEntity(tr.endPos, EV.BULLET_HIT_WALL);
			tent.s.eventParm = qm.DirToByte(tr.plane.normal);
		// }
		// tent.s.otherEntityNum = ent.s.number;

		// if (traceEnt.takeDamage) {
		// 	G_Damage( traceEnt, ent, ent, forward, tr.endpos, damage, 0, mod);
		// }

		// break;
	// }
}

/**
 * RocketLauncherFire*
 */
function RocketLauncherFire(ent) {
	var m = FireRocket(ent, muzzle, forward);
	// m.damage *= s_quadFactor;
	// m.splashDamage *= s_quadFactor;
}

		entityEvents['info_notnull'] = {
	spawn: function (self) {
		SetOrigin(self, self.s.origin);
	}
};
		entityEvents['info_player_deathmatch'] = {
	spawn: function (self) {
	}
};
		entityEvents['misc_teleporter_dest'] = {
	spawn: function (self) {
		SetOrigin(self, self.s.origin);
	}
};
		entityEvents['target_position'] = {
	spawn: function (self) {
		SetOrigin(self, self.s.origin);
	}
};
		entityEvents['target_push'] = {
	spawn: function (self) {
		if (!self.speed) {
			self.speed = 1000;
		}

		//G_SetMovedir (self->s.angles, self->s.origin2);
		//VectorScale (self->s.origin2, self->speed, self->s.origin2);

		/*if ( self->spawnflags & 1 ) {
			self->noise_index = G_SoundIndex("sound/world/jumppad.wav");
		} else {
			self->noise_index = G_SoundIndex("sound/misc/windfly.wav");
		}*/

		// if ( self->target ) {
		// 	VectorCopy( self->s.origin, self->r.absmin );
		// 	VectorCopy( self->s.origin, self->r.absmax );
		// 	self->think = AimAtTarget;
		// 	self->nextthink = level.time + FRAMETIME;
		// }
	}
};
		entityEvents['trigger_hurt'] = {
	spawn: function (self) {
		sv.SetBrushModel(self, self.model);

		self.s.eType = ET.PUSH_TRIGGER;
		self.contents = CONTENTS.TRIGGER;

		if (self.damage) {
			self.damage = 5;
		}
		
		sv.LinkEntity(self);
	},

	touch: function (self, other) {
		if (self.timestamp > level.time) {
			return;
		}

		if (self.spawnflags & 16) {
			self.timestamp = level.time + 1000;
		} else {
			self.timestamp = level.time + FRAMETIME;
		}

		// Just respawn the player for now.
		ClientSpawn(other);
	}
};
		entityEvents['trigger_push'] = {
	spawn: function (self) {
		sv.SetBrushModel(self, self.model);

		self.s.eType = ET.PUSH_TRIGGER;
		self.contents = CONTENTS.TRIGGER;
		self.nextthink = level.time + FRAMETIME;
		
		sv.LinkEntity(self);
	},

	think: function (self) {
		AimAtTarget(self);
	},

	touch: function (self, other) {
		if (!other.client) {
			return;
		}

		bg.TouchJumpPad(other.client.ps, self.s);
	}
};
		entityEvents['trigger_teleport'] = {
	spawn: function (self) {
		sv.SetBrushModel(self, self.model);

		self.s.eType = ET.TELEPORT_TRIGGER;
		self.contents = CONTENTS.TRIGGER;
		
		sv.LinkEntity(self);
	},

	touch: function (self, other) {
		if (!other.client) {
			return;
		}

		if (other.client.ps.pm_type === PM.DEAD) {
			return;
		}

		var dest = EntityPickTarget(self.target);
		if (!dest) {
			log('Couldn\'t find teleporter destination');
			FreeEntity(self);
			return;
		}

		TeleportPlayer(other, dest.s.origin, dest.s.angles);
	}
};

		return {
			Init:                 Init,
			Shutdown:             Shutdown,
			Frame:                Frame,
			ClientConnect:        ClientConnect,
			ClientBegin:          ClientBegin,
			ClientThink:          ClientThink,
			ClientDisconnect:     ClientDisconnect,
			GetClientPlayerstate: GetClientPlayerstate
		};
	}

	return {
		CreateInstance: function (com, sv) {
			return new Game(com, sv);
		}
	};
});

/**
 * This module is used by the dedicated server to stub
 * the client/ui modules.
 */
define('stub', [], function () {
	return null;
});
define("client/cl", function(){});

/*global vec3: true, mat4: true */

define('clipmap/cm',
['underscore', 'glmatrix', 'ByteBuffer', 'common/sh', 'common/qmath'],
function (_, glmatrix, ByteBuffer, sh, qm) {
	var BASE_FOLDER = 'baseq3';
var MAX_QPATH   = 64;
var CMD_BACKUP  = 64;

// If entityState.solid === SOLID_BMODEL, modelIndex is an inline model number
var SOLID_BMODEL = 0xffffff;

/**
 * Cvar flags
 */
var CVF = {
	ARCHIVE:    0x0001,                                    // save to config file
	USERINFO:   0x0002,                                    // sent to server on connect or change
	SERVERINFO: 0x0004,                                    // sent in response to front end requests
	SYSTEMINFO: 0x0008                                     // these cvars will be duplicated on all clients
};

/**
 * Renderer (should be moved)
 */
var MAX_DRAWSURFS  = 0x10000;

/**
 * Snapshot flags
 */
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

/**
 * MAX_* defines used to pre-alloc many structures
 */
var GENTITYNUM_BITS         = 10;
var MAX_CLIENTS             = 32;                          // absolute limit
var MAX_GENTITIES           = (1 << 10);                   // can't be increased without changing drawsurf bit packing
var MAX_MODELS              = 256;                         // these are sent over the net as 8 bits
var MAX_SOUNDS              = 256;                         // so they cannot be blindly increased

/**
 * Faux entity numbers
 */
var ENTITYNUM_NONE          = MAX_GENTITIES-1;
var ENTITYNUM_WORLD         = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL    = MAX_GENTITIES-2;

var MOVE_RUN = 120;                                        // if forwardmove or rightmove are >= MOVE_RUN,
	                                                       // then BUTTON_WALKING should be set

/**
 * Playerstate
 */
var MAX_STATS               = 16;
var MAX_PERSISTANT          = 16;
var MAX_POWERUPS            = 16;
var MAX_WEAPONS             = 16;
var MAX_PS_EVENTS           = 2;
var PMOVEFRAMECOUNTBITS     = 6;

var BUTTON = {
	ATTACK:       1,
	TALK:         2,                                       // displays talk balloon and disables actions
	USE_HOLDABLE: 4,
	GESTURE:      8,
	WALKING:      16,                                      // walking can't just be infered from MOVE_RUN
	                                                       // because a key pressed late in the frame will
	                                                       // only generate a small move value for that frame
	                                                       // walking will use different animations and
	                                                       // won't generate footsteps
	AFFIRMATIVE:  32,
	NEGATIVE:     64,
	GETFLAG:      128,
	GUARDBASE:    256,
	PATROL:       512,
	FOLLOWME:     1024,
	ANY:          2048                                     // any key whatsoever
};

var TR = {
	STATIONARY:  0,
	INTERPOLATE: 1,                              // non-parametric, but interpolate between snapshots
	LINEAR:      2,
	LINEAR_STOP: 3,
	SINE:        4,                              // value = base + sin( time / duration ) * delta
	GRAVITY:     5
};

var SURF = {
	NODAMAGE:    0x1,                            // never give falling damage
	SLICK:       0x2,                            // effects game physics
	SKY:         0x4,                            // lighting from environment map
	LADDER:      0x8,
	NOIMPACT:    0x10,                           // don't make missile explosions
	NOMARKS:     0x20,                           // don't leave missile marks
	FLESH:       0x40,                           // make flesh sounds and effects
	NODRAW:      0x80,                           // don't generate a drawsurface at all
	HINT:        0x100,                          // make a primary bsp splitter
	SKIP:        0x200,                          // completely ignore, allowing non-closed brushes
	NOLIGHTMAP:  0x400,                          // surface doesn't need a lightmap
	POINTLIGHT:  0x800,                          // generate lighting info at vertexes
	METALSTEPS:  0x1000,                         // clanking footsteps
	NOSTEPS:     0x2000,                         // no footstep sounds
	NONSOLID:    0x4000,                         // don't collide against curves with this set
	LIGHTFILTER: 0x8000,                         // act as a light filter during q3map -light
	ALPHASHADOW: 0x10000,                        // do per-pixel light shadow casting in q3map
	NODLIGHT:    0x20000,                        // don't dlight even if solid (solid lava, skies)
	DUST:        0x40000                         // leave a dust trail when walking on this surface
};

var CONTENTS = {
	SOLID:         1,                                      // an eye is never valid in a solid
	LAVA:          8,
	SLIME:         16,
	WATER:         32,
	FOG:           64,

	NOTTEAM1:      0x0080,
	NOTTEAM2:      0x0100,
	NOBOTCLIP:     0x0200,

	AREAPORTAL:    0x8000,

	PLAYERCLIP:    0x10000,
	MONSTERCLIP:   0x20000,
	TELEPORTER:    0x40000,
	JUMPPAD:       0x80000,
	CLUSTERPORTAL: 0x100000,
	DONOTENTER:    0x200000,
	BOTCLIP:       0x400000,
	MOVER:         0x800000,

	ORIGIN:        0x1000000,                              // removed before bsping an entity

	BODY:          0x2000000,                              // should never be on a brush, only in game
	CORPSE:        0x4000000,
	DETAIL:        0x8000000,                              // brushes not used for the bsp
	STRUCTURAL:    0x10000000,                             // brushes used for the bsp
	TRANSLUCENT:   0x20000000,                             // don't consume surface fragments inside
	TRIGGER:       0x40000000,
	NODROP:        0x80000000                              // don't leave bodies or items (death fog, lava)
};

	// We don't want everyone who requires us to 
	// have the same version of clipmap.
	function ClipMap(imp) {
		var MAX_SUBMODELS        = 256;
var BOX_MODEL_HANDLE     = 255;
var CAPSULE_MODEL_HANDLE = 254;

// Keep 1/8 unit away to keep the position valid before network snapping
// and to avoid various numeric issues.
var SURFACE_CLIP_EPSILON = 0.125;

var ClipMapLocals = function () {
	this.shaders      = null;
	this.brushes      = null;
	this.brushSides   = null;
	this.models       = null;
	this.leafs        = null;
	this.leafBrushes  = null;
	this.leafSurfaces = null;
	this.nodes        = null;
	this.planes       = null;
	this.shaders      = null;
	this.entities     = null;
	this.surfaces     = null;                              // only patches
};

/**********************************************************
 * Clipmap specific BSP structs
 **********************************************************/
var cnode_t = function () {
	this.planeNum    = 0;
	this.childrenNum = [0, 0];
};

var cmodel_t = function () {
	this.mins = [0, 0, 0];
	this.maxs = [0, 0, 0];
	this.leaf = new cleaf_t();                             // submodels don't reference the main tree
};

var cleaf_t = function () {
	this.cluster          = 0;
	this.area             = 0;
	this.firstLeafSurface = 0;
	this.numLeafSurfaces  = 0;
	this.firstLeafBrush   = 0;
	this.numLeafBrushes   = 0;
};

var cbrushside_t = function () {
	this.plane        = null;
	this.surfaceFlags = 0;
	this.shaderNum    = 0;
};

var cbrush_t = function () {
	this.shaderNum  = 0;                                    // the shader that determined the contents
	this.contents   = 0;
	this.bounds     = [[0, 0, 0], [0, 0, 0]];
	this.firstSide  = 0;
	this.numSides   = 0;
	this.checkcount = 0;                                   // to avoid repeated testings
};

/**********************************************************
 * Polylib
 **********************************************************/
var winding_t = function () {
	this.p = [];
};

winding_t.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new winding_t();
	}

	to.p = new Array(this.p.length);
	for (var i = 0; i < this.p.length; i++) {
		to.p[i] = vec3.set(this.p[i], [0, 0, 0]);
	}

	return to;
};

var MAX_POINTS_ON_WINDING = 64;

var SIDE_FRONT = 0;
var SIDE_BACK  = 1;
var SIDE_ON    = 2;
var SIDE_CROSS = 3;

var MAX_MAP_BOUNDS = 65535;

/**********************************************************
 * Patch clipping
 **********************************************************/
var MAX_FACETS         = 1024;
var MAX_PATCH_VERTS    = 1024;
var MAX_PATCH_PLANES   = 2048;
var MAX_GRID_SIZE      = 129;
var SUBDIVIDE_DISTANCE = 16;                               // never more than this units away from curve
var PLANE_TRI_EPSILON  = 0.1;
var WRAP_POINT_EPSILON = 0.1;

var pplane_t = function () {
	this.plane    = [0, 0, 0, 0];
	this.signbits = 0;                                     // signx + (signy<<1) + (signz<<2), used as lookup during collision
};

var pfacet_t = function () {
	this.surfacePlane = 0;
	this.numBorders   = 0;                                 // 3 or four + 6 axial bevels + 4 or 3 * 4 edge bevels
	this.borderPlanes = [
		0, 0, 0, 0,
		0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
	];
	this.borderInward = [
		0, 0, 0, 0,
		0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
	];
	this.borderNoAdjust = [
		false, false, false, false,
		false, false, false, false, false, false,
		false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false
	];
};

var pcollide_t = function () {
	this.bounds = [
		[0, 0, 0],
		[0, 0, 0]
	];
	this.planes = [];                                      // surface planes plus edge planes
	this.facets = [];
};

var cgrid_t = function () {
	this.width      = 0;
	this.height     = 0;
	this.wrapWidth  = 0;
	this.wrapHeight = 0;
	this.points     = new Array(MAX_GRID_SIZE);

	for (var i = 0; i < MAX_GRID_SIZE; i++) {
		this.points[i] = new Array(MAX_GRID_SIZE);

		for (var j = 0; j < MAX_GRID_SIZE; j++) {
			this.points[i][j] = [0, 0, 0];
		}
	}
};

var cpatch_t = function () {
	this.checkcount   = 0;                                 // to avoid repeated testings
	this.surfaceFlags = 0;
	this.contents     = 0;
	this.pc           = null;
};

/**********************************************************
 * Tracing
 **********************************************************/
var TraceResults = function () {
	this.allSolid   = false;                               // if true, plane is not valid
	this.startSolid = false;                               // if true, the initial point was in a solid area
	this.fraction   = 1.0;                                 // time completed, 1.0 = didn't hit anything
	this.endPos     = [0, 0, 0];                           // final position
	this.plane      = new qm.Plane();                      // surface normal at impact, transformed to world space
};

TraceResults.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new TraceResults();
	}

	to.allSolid = this.allSolid;
	to.startSolid = this.startSolid;
	to.fraction = this.fraction;
	vec3.set(this.endPos, to.endPos);
	to.plane = this.plane;

	return to;
};

var MAX_POSITION_LEAFS = 1024;

var LeafList = function () {
	this.list  = new Uint32Array(MAX_POSITION_LEAFS);
	this.count = 0;
};

// Used for oriented capsule collision detection
var Sphere = function () {
	this.use        = false;
	this.radius     = 0;
	this.halfheight = 0;
	this.offset     = [0, 0, 0];
};

Sphere.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new Sphere();
	}

	to.use = this.use;
	to.radius = this.radius;
	to.halfheight = this.halfheight;
	vec3.set(this.offset, to.offset);
};

var TraceWork = function () {
	this.trace     = new TraceResults();
	this.start     = [0, 0, 0];
	this.end       = [0, 0, 0];
	this.size      = [                                     // size of the box being swept through the model
		[0, 0, 0],
		[0, 0, 0]
	];
	this.offsets   = [                                     // [signbits][x] = either size[0][x] or size[1][x]
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	this.maxOffset = 0;                                    // longest corner length from origin
	this.extents   = [0, 0, 0];                            // greatest of abs(size[0]) and abs(size[1])
	this.bounds    = [                                     // enclosing box of start and end surrounding by size
		[0, 0, 0],
		[0, 0, 0]
	];
	this.contents  = 0;                                    // ored contents of the model tracing through
	this.isPoint   = false;                                // optimized case
	this.sphere    = new Sphere();                         // sphere for oriendted capsule collision
};
		/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'CM:');
	Function.apply.call(console.log, console, args);
}
		var cm;

// To allow boxes to be treated as brush models, we allocate
// some extra indexes along with those needed by the map
var BOX_BRUSHES = 1;
var BOX_SIDES   = 6;
var BOX_LEAFS   = 2;
var BOX_PLANES  = 12;

/**
 * LoadMap
 */
function LoadMap(mapName, callback) {
	log('Initializing');
	log('Loading map for ' + mapName);

	cm = new ClipMapLocals();

	imp.sys_ReadFile('maps/' + mapName + '.bsp', 'binary', function (err, data) {
		if (err) throw err;
		
		var bb = new ByteBuffer(data, ByteBuffer.LITTLE_ENDIAN);

		// Parse the header.
		var header = new sh.dheader_t();
		header.ident = bb.readASCIIString(4);
		header.version = bb.readInt();
		for (var i = 0; i < sh.Lumps.NUM_LUMPS; i++) {
			header.lumps[i].fileofs = bb.readInt();
			header.lumps[i].filelen = bb.readInt();
		}

		if (header.ident !== 'IBSP' && header.version !== 46) {
			return;
		}

		LoadShaders(data, header.lumps[sh.Lumps.SHADERS]);
		LoadLeafs(data, header.lumps[sh.Lumps.LEAFS]);
		LoadLeafBrushes(data, header.lumps[sh.Lumps.LEAFBRUSHES]);
		LoadLeafSurfaces(data, header.lumps[sh.Lumps.LEAFSURFACES]);
		LoadPlanes(data, header.lumps[sh.Lumps.PLANES]);
		LoadBrushSides(data, header.lumps[sh.Lumps.BRUSHSIDES]);
		LoadBrushes(data, header.lumps[sh.Lumps.BRUSHES]);
		LoadSubmodels(data, header.lumps[sh.Lumps.MODELS]);
		LoadNodes(data, header.lumps[sh.Lumps.NODES]);
		LoadEntities(data, header.lumps[sh.Lumps.ENTITIES]);
		LoadPatches(data, header.lumps[sh.Lumps.SURFACES], header.lumps[sh.Lumps.DRAWVERTS]);

		InitBoxHull();

		if (callback) {
			callback();
		}
	});
}

/**
 * LoadShaders
 */
function LoadShaders(buffer, shaderLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = shaderLump.fileofs;

	var shaders = cm.shaders = new Array(shaderLump.filelen / sh.dshader_t.size);

	for (var i = 0; i < shaders.length; i++) {
		var shader = shaders[i] = new sh.dshader_t();

		shader.shaderName = bb.readASCIIString(MAX_QPATH);
		shader.flags = bb.readInt();
		shader.contents = bb.readInt();
	}
}

/**
 * LoadLeafs
 */
function LoadLeafs(buffer, leafLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = leafLump.fileofs;

	var numLeafs = leafLump.filelen / sh.dleaf_t.size;
	var leafs = cm.leafs = new Array(numLeafs + BOX_LEAFS);

	for (var i = 0; i < numLeafs; i++) {
		var leaf = leafs[i] = new cleaf_t();

		leaf.cluster = bb.readInt();
		leaf.area = bb.readInt();
		
		// Skip mins/maxs.
		bb.index += 24;

		leaf.firstLeafSurface = bb.readInt();
		leaf.numLeafSurfaces = bb.readInt();
		leaf.firstLeafBrush = bb.readInt();
		leaf.numLeafBrushes = bb.readInt();
	}
}

/**
 * LoadLeafBrushes
 */
function LoadLeafBrushes(buffer, leafBrushLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = leafBrushLump.fileofs;

	var numLeafBrushes = leafBrushLump.filelen / 4;
	var leafBrushes = cm.leafBrushes = new Array(numLeafBrushes + BOX_BRUSHES);

	for (var i = 0; i < leafBrushes.length; i++) {
		leafBrushes[i] = bb.readInt();
	}
}

/**
 * LoadLeafSurfaces
 */
function LoadLeafSurfaces(buffer, leafSurfacesLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);	
	bb.index = leafSurfacesLump.fileofs;

	var leafSurfaces = cm.leafSurfaces = new Array(leafSurfacesLump.filelen / 4);
	for (var i = 0; i < leafSurfaces.length; i++) {
		leafSurfaces[i] = bb.readInt();
	}
}

/**
 * LoadPlanes
 */
function LoadPlanes(buffer, planeLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = planeLump.fileofs;

	var numPlanes = planeLump.filelen / sh.dplane_t.size;
	var planes = cm.planes = new Array(numPlanes + BOX_PLANES);

	for (var i = 0; i < numPlanes; i++) {
		var plane = planes[i] = new qm.Plane();

		plane.normal = [bb.readFloat(), bb.readFloat(), bb.readFloat()];
		plane.dist = bb.readFloat();
		plane.signbits = qm.GetPlaneSignbits(plane.normal);
		plane.type = qm.PlaneTypeForNormal(plane.normal);
	}
}

/**
 * LoadBrushSides
 */
function LoadBrushSides(buffer, brushSideLump) {
	var planes = cm.planes;

	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = brushSideLump.fileofs;

	var numBrushSides = brushSideLump.filelen / sh.dbrushside_t.size;
	var brushSides = cm.brushSides = new Array(numBrushSides + BOX_SIDES);

	for (var i = 0; i < numBrushSides; i++) {
		var side = brushSides[i] = new cbrushside_t();

		var planeNum = bb.readInt();
		var shaderNum = bb.readInt();

		side.plane = planes[planeNum];
		side.shaderNum = shaderNum;
		side.surfaceFlags = cm.shaders[shaderNum].surfaceFlags;
	}
}

/**
 * LoadBrushes
 */
function LoadBrushes(buffer, brushLump) {
	var shaders = cm.shaders;
	var brushSides = cm.brushSides;

	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = brushLump.fileofs;

	var numBrushes = brushLump.filelen / sh.dbrush_t.size;
	var brushes = cm.brushes = new Array(numBrushes + BOX_BRUSHES);

	for (var i = 0; i < numBrushes; i++) {
		var brush = brushes[i] = new cbrush_t();

		brush.firstSide = bb.readInt();
		brush.numSides = bb.readInt();
		brush.shaderNum = bb.readInt();
		brush.bounds = [
			[
				-cm.brushSides[brush.firstSide + 0].plane.dist,
				-cm.brushSides[brush.firstSide + 2].plane.dist,
				-cm.brushSides[brush.firstSide + 4].plane.dist
			],
			[
				cm.brushSides[brush.firstSide + 1].plane.dist,
				cm.brushSides[brush.firstSide + 3].plane.dist,
				cm.brushSides[brush.firstSide + 5].plane.dist
			]
		];
		brush.contents = shaders[brush.shaderNum].contents;
	}
}

/**
 * LoadSubmodels
 */
function LoadSubmodels(buffer, modelLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = modelLump.fileofs;

	var models = cm.models = new Array(modelLump.filelen / sh.dmodel_t.size);

	for (var i = 0; i < models.length; i++) {
		var model = models[i] = new cmodel_t();

		// Spread the mins / maxs by a pixel.
		model.mins = [bb.readFloat() - 1, bb.readFloat() - 1, bb.readFloat() - 1];
		model.maxs = [bb.readFloat() + 1, bb.readFloat() + 1, bb.readFloat() + 1];

		var firstSurface = bb.readInt();
		var numSurfaces = bb.readInt();
		var firstBrush = bb.readInt();
		var numBrushes = bb.readInt();

		if (i === 0) {
			continue;	// world model doesn't need other info
		}

		// // Make a "leaf" just to hold the model's brushes and surfaces.
		// out->leaf.numLeafBrushes = LittleLong( in->numBrushes );
		// indexes = Hunk_Alloc( out->leaf.numLeafBrushes * 4, h_high );
		// out->leaf.firstLeafBrush = indexes - cm.leafbrushes;
		// for ( j = 0 ; j < out->leaf.numLeafBrushes ; j++ ) {
		// 	indexes[j] = LittleLong( in->firstBrush ) + j;
		// }

		// out->leaf.numLeafSurfaces = LittleLong( in->numSurfaces );
		// indexes = Hunk_Alloc( out->leaf.numLeafSurfaces * 4, h_high );
		// out->leaf.firstLeafSurface = indexes - cm.leafsurfaces;
		// for ( j = 0 ; j < out->leaf.numLeafSurfaces ; j++ ) {
		// 	indexes[j] = LittleLong( in->firstSurface ) + j;
		// }
	}
}

function LoadNodes(buffer, nodeLump) {
	var planes = cm.planes;

	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = nodeLump.fileofs;

	var nodes = cm.nodes = new Array(nodeLump.filelen / sh.dnode_t.size);

	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i] = new cnode_t();

		node.planeNum = bb.readInt();
		node.childrenNum = [bb.readInt(), bb.readInt()];

		// Skip mins/maxs.
		bb.index += 24;
	}
}

/**
 * LoadEntities
 */
function LoadEntities(buffer, entityLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = entityLump.fileofs;

	var entityStr = bb.readASCIIString(entityLump.filelen);

	var entities = cm.entities = [];

	entityStr.replace(/\{([^}]*)\}/mg, function($0, entitySrc) {
		var entity = {
			classname: 'unknown'
		};

		entitySrc.replace(/"(.+)" "(.+)"$/mg, function($0, key, value) {

			switch (key) {
				case 'origin':
					value.replace(/(.+) (.+) (.+)/, function($0, x, y, z) {
						entity[key] = [
							parseFloat(x),
							parseFloat(y),
							parseFloat(z)
						];
					});
					break;
				case 'angles':
					value.replace(/(.+) (.+) (.+)/, function($0, x, y, z) {
						entity[key] = [
							parseFloat(x),
							parseFloat(y),
							parseFloat(z)
						];
					});
					break;
				case 'angle':
					entity['angles'] = [0, parseFloat(value), 0];
					break;
				default:
					entity[key] = value;
					break;
			}
		});
		
		entities.push(entity);
	});
}

/**
 * LoadPatches
 */
function LoadPatches(buffer, surfsLump, vertsLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	var count = surfsLump.filelen / sh.dsurface_t.size;
	cm.surfaces = new Array(count);

	// Scan through all the surfaces, but only load patches,
	// not planar faces.
	var patch;
	var width;
	var height;
	var c;
	var dface = new sh.dsurface_t();
	var points = new Array(MAX_PATCH_VERTS);
	for (var i = 0; i < MAX_PATCH_VERTS; i++) {
		points[i] = [0, 0, 0];
	}

	var surfidx = surfsLump.fileofs;

	for (var i = 0; i < count; i++) {
		// Read face into temp variable.
		bb.index = surfidx;

		dface.shaderNum = bb.readInt();
		dface.fogNum = bb.readInt();
		dface.surfaceType = bb.readInt();
		dface.vertex = bb.readInt();
		dface.vertCount = bb.readInt();
		dface.meshVert = bb.readInt();
		dface.meshVertCount = bb.readInt();
		dface.lightmapNum = bb.readInt();
		dface.lmStart = [bb.readInt(), bb.readInt()];
		dface.lmSize = [bb.readInt(), bb.readInt()];
		dface.lmOrigin = [bb.readFloat(), bb.readFloat(), bb.readFloat()];
		dface.lmVecs = [
			[bb.readFloat(), bb.readFloat(), bb.readFloat()],
			[bb.readFloat(), bb.readFloat(), bb.readFloat()],
			[bb.readFloat(), bb.readFloat(), bb.readFloat()]
		];
		dface.patchWidth = bb.readInt();
		dface.patchHeight = bb.readInt();

		if (dface.surfaceType !== sh.MapSurfaceType.PATCH) {
			continue;  // ignore other surfaces
		}

		cm.surfaces[i] = patch = new cpatch_t();

		// Store our current pos before we read the verts.
		surfidx = bb.index;

		// Load the full drawverts onto the stack.
		width = dface.patchWidth;
		height = dface.patchHeight;
		c = width * height;

		if (c > MAX_PATCH_VERTS) {
			com.error(sh.Err.DROP, 'ParseMesh: MAX_PATCH_VERTS');
		}

		for (var j = 0; j < c ; j++) {
			bb.index = vertsLump.fileofs + (dface.vertex + j) * sh.drawVert_t.size;

			points[j][0] = bb.readFloat();
			points[j][1] = bb.readFloat();
			points[j][2] = bb.readFloat();
		}

		patch.contents = cm.shaders[dface.shaderNum].contents;
		patch.surfaceFlags = cm.shaders[dface.shaderNum].flags;

		// Create the internal facet structure
		patch.pc = GeneratePatchCollide(width, height, points);
	}
}

/**
 * InitBoxHull
 * 
 * Set up the planes and nodes so that the six floats of a bounding box
 * can just be stored out and get a proper clipping hull structure.
 */
var box_planes = null;
var box_brush = null;
var box_model = null;

function InitBoxHull() {
	box_planes = new Array(BOX_PLANES);
	for (var i = 0; i < BOX_PLANES; i++) {
		box_planes[i] = cm.planes[cm.planes.length - BOX_PLANES + i] = new qm.Plane();
	}

	box_brush = cm.brushes[cm.brushes.length - BOX_BRUSHES] = new cbrush_t();
	box_brush.firstSide = cm.brushSides.length - BOX_SIDES;
	box_brush.numSides = BOX_SIDES;
	box_brush.contents = CONTENTS.BODY;

	box_model = new cmodel_t();
	box_model.leaf.numLeafBrushes = 1;
	box_model.leaf.firstLeafBrush = cm.leafBrushes.length - BOX_BRUSHES;
	cm.leafBrushes[box_model.leaf.firstLeafBrush] = cm.brushes.length - BOX_BRUSHES;

	for (var i = 0; i < 6; i++) {
		var side = i & 1;

		// Brush sides.
		var s = cm.brushSides[box_brush.firstSide + i] = new sh.dbrushside_t();
		s.plane = box_planes[i * 2 + side];
		s.surfaceFlags = 0;

		// Planes.
		var p = box_planes[i * 2];
		p.type = i >> 1;
		p.normal[0] = p.normal[1] = p.normal[2] = 0;
		p.normal[i >> 1] = 1;
		p.signbits = 0;

		p = box_planes[i * 2 + 1];
		p.type = 3 + (i >> 1);
		p.normal[0] = p.normal[1] = p.normal[2] = 0;
		p.normal[i >> 1] = -1;
		p.signbits = qm.GetPlaneSignbits(p.normal);
	}
}

/**
 * InlineModel
 */
function InlineModel(num) {
	if (num < 0 || num >= cm.models.length) {
		com.error(sh.Err.DROP, 'GetInlineModel: bad number');
	}

	return num;
}

/**
 * TempBoxModel
 *
 * To keep everything totally uniform, bounding boxes are turned into small
 * BSP trees instead of being compared directly.
 * Capsules are handled differently though.
 */
function TempBoxModel(mins, maxs, capsule) {
	vec3.set(mins, box_model.mins);
	vec3.set(maxs, box_model.maxs);

	if (capsule) {
		return CAPSULE_MODEL_HANDLE;
	}

	box_planes[0].dist = maxs[0];
	box_planes[1].dist = -maxs[0];
	box_planes[2].dist = mins[0];
	box_planes[3].dist = -mins[0];
	box_planes[4].dist = maxs[1];
	box_planes[5].dist = -maxs[1];
	box_planes[6].dist = mins[1];
	box_planes[7].dist = -mins[1];
	box_planes[8].dist = maxs[2];
	box_planes[9].dist = -maxs[2];
	box_planes[10].dist = mins[2];
	box_planes[11].dist = -mins[2];

	vec3.set(mins, box_brush.bounds[0]);
	vec3.set(maxs, box_brush.bounds[1]);

	return BOX_MODEL_HANDLE;
}

/**
 * ModelBounds
 */
function ModelBounds(model, mins, maxs) {
	var cmod = ClipHandleToModel(model);
	vec3.set(cmod.mins, mins);
	vec3.set(cmod.maxs, maxs);
}

/**
 * ClipHandleToModel
 */
function ClipHandleToModel(handle) {
	if (handle < 0) {
		com.error(sh.Err.DROP, 'ClipHandleToModel: bad handle ' + handle);
	}
	if (handle < cm.models.length) {
		return cm.models[handle];
	}
	if (handle === BOX_MODEL_HANDLE) {
		return box_model;
	}
	
	com.error(sh.Err.DROP, 'ClipHandleToModel: bad handle ' + cm.models.length + ' < ' + handle);
}
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
		com.error(sh.Err.DROP, 'GeneratePatchFacets: bad parameters');
	}

	if (!(width & 1) || !(height & 1)) {
		com.error(sh.Err.DROP, 'GeneratePatchFacets: even sizes are invalid for quadratic meshes');
	}

	if (width > MAX_GRID_SIZE || height > MAX_GRID_SIZE) {
		com.error(sh.Err.DROP, 'GeneratePatchFacets: source is > MAX_GRID_SIZE');
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

	qm.ClearBounds(pc.bounds[0], pc.bounds[1]);

	for (var i = 0; i < grid.width; i++) {
		for (var j = 0; j < grid.height; j++) {
			qm.AddPointToBounds(grid.points[i][j], pc.bounds[0], pc.bounds[1]);
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
				com.error(sh.Err.DROP, 'MAX_FACETS');
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
					com.error(sh.Err.DROP, 'MAX_FACETS');
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
		com.error(sh.Err.DROP, 'MAX_PATCH_PLANES');
	}

	// TODO Convert to using Plane struct?
	var index = pc.planes.length;

	var pp = new pplane_t();
	Vector4Copy(plane, pp.plane);
	pp.signbits = qm.GetPlaneSignbits(plane);
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

	com.error(sh.Err.DROP, 'EdgePlaneNum: bad k');
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
			com.error(sh.Err.FATAL, 'SetBorderInward: bad parameter');
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
		com.error(sh.Err.DROP, 'MAX_PATCH_PLANES');
	}

	var index = pc.planes.length;

	var pp = new pplane_t();
	Vector4Copy(plane, pp.plane);
	pp.signbits = qm.GetPlaneSignbits(plane);
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

	if (!qm.BoundsIntersect(tw.bounds[0], tw.bounds[1], pc.bounds[0], pc.bounds[1], SURFACE_CLIP_EPSILON)) {
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
	
	w.p[0] = vec3.subtract(org, vright, [0, 0, 0]);
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
		/*********************************************************************
 *
 * LEAF LISTING
 *
 ********************************************************************/

/**
 * BoxLeafnums
 *
 * Fills in a list of all the leafs touched
 */
function BoxLeafnums_r(ll, mins, maxs, nodenum) {
	while (1) {
		if (nodenum < 0) {
			if (ll.count >= MAX_POSITION_LEAFS) {
				return;
			}
			ll.list[ll.count++] = -1 - nodenum;
			return;
		}
	
		var node = cm.nodes[nodenum];
		var s = qm.BoxOnPlaneSide(mins, maxs, cm.planes[node.planeNum]);

		if (s === 1) {
			nodenum = node.childrenNum[0];
		} else if (s === 2) {
			nodenum = node.childrenNum[1];
		} else {
			// go down both
			BoxLeafnums_r(ll, mins, maxs, node.childrenNum[0]);
			nodenum = node.childrenNum[1];
		}
	}
}
		/**
 * TransposeMatrix
 */
function TransposeMatrix(matrix, transpose) {
	for (var i = 0; i < 3; i++) {
		for (var j = 0; j < 3; j++) {
			transpose[i][j] = matrix[j][i];
		}
	}
}

/*********************************************************************
 *
 * Position testing
 *
 ********************************************************************/

/**
 * TestBoxInBrush
 */
function TestBoxInBrush(tw, brush) {
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

	if (tw.sphere.use) {
		// The first six planes are the axial planes, so we only
		// need to test the remainder.
		for (var i = 6; i < brush.numSides; i++) {
			var side = cm.brushSides[brush.firstSide + i];
			var plane = side.plane;

			// Adjust the plane distance apropriately for radius.
			var dist = plane.dist + tw.sphere.radius;

			// Find the closest point on the capsule to the plane.
			var startp = [0, 0, 0];
			var t = vec3.dot(plane.normal, tw.sphere.offset);
			if (t > 0) {
				vec3.subtract(tw.start, tw.sphere.offset, startp);
			} else {
				vec3.add(tw.start, tw.sphere.offset, startp);
			}
			var d1 = vec3.dot(startp, plane.normal) - dist;
			// If completely in front of face, no intersection.
			if (d1 > 0) {
				return;
			}
		}
	} else {
		// The first six planes are the axial planes, so we only
		// need to test the remainder.
		for (var i = 6; i < brush.numSides; i++) {
			var side = cm.brushSides[brush.firstSide + i];
			var plane = side.plane;

			// adjust the plane distance apropriately for mins/maxs
			var dist = plane.dist - vec3.dot(tw.offsets[plane.signbits], plane.normal);
			var d1 = vec3.dot(tw.start, plane.normal) - dist;

			// if completely in front of face, no intersection
			if (d1 > 0) {
				return;
			}
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
				tw->trace.startsolid = tw->trace.allsolid = qtrue;
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
var leaflist = new LeafList();

function PositionTest(tw) {
	var leafs = cm.leafs;
	var mins = vec3.add(tw.start, tw.size[0], [0, 0, 0]);
	var maxs = vec3.add(tw.start, tw.size[1], [0, 0, 0]);

	vec3.add(mins, [-1, -1, -1]);
	vec3.add(maxs, [1, 1, 1]);

	cm.checkcount++;
	leaflist.count = 0;
	BoxLeafnums_r(leaflist, mins, maxs, 0);
	cm.checkcount++;

	// Test the contents of the leafs.
	for (var i = 0; i < leaflist.count; i++) {
		TestInLeaf(tw, leafs[leaflist.list[i]]);

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
	var shaders = cm.shaders;

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
	var mid = [0, 0, 0], midf;

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
	var i;
	var brushes = cm.brushes;
	var leafBrushes = cm.leafBrushes;
	var shaders = cm.shaders;

	// Trace line against all brushes in the leaf.
	for (i = 0; i < leaf.numLeafBrushes; i++) {
		var brushNum = leafBrushes[leaf.firstLeafBrush + i];
		var brush = brushes[brushNum];

		if (brush.checkcount === cm.checkcount) {
			continue;  // already checked this brush in another leaf
		}

		brush.checkcount = cm.checkcount;

		if (!(brush.contents & tw.contents)) {
			continue;
		}

		if (!qm.BoundsIntersect(tw.bounds[0], tw.bounds[1], brush.bounds[0], brush.bounds[1], SURFACE_CLIP_EPSILON)) {
			continue;
		}

		TraceThroughBrush(tw, brush);

		if (!tw.trace.fraction) {
			return;
		}
	}

	// Trace line against all patches in the leaf.
	for (i = 0; i < leaf.numLeafSurfaces; i++) {
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

	if (tw.sphere.use) {
		// Compare the trace against all planes of the brush.
		// Find the latest time the trace crosses a plane towards the interior
		// and the earliest time the trace crosses a plane towards the exterior.
		for (var i = 0; i < brush.numSides; i++) {
			var side = cm.brushSides[brush.firstSide + i];
			var plane = side.plane;

			// Adjust the plane distance apropriately for radius.
			var dist = plane.dist + tw.sphere.radius;

			// Find the closest point on the capsule to the plane.
			var startp = [0, 0, 0];
			var endp = [0, 0, 0];
			var t = vec3.dot(plane.normal, tw.sphere.offset);

			if (t > 0) {
				vec3.subtract(tw.start, tw.sphere.offset, startp);
				vec3.subtract(tw.end, tw.sphere.offset, endp);
			} else {
				vec3.add(tw.start, tw.sphere.offset, startp);
				vec3.add(tw.end, tw.sphere.offset, endp);
			}

			var d1 = vec3.dot(startp, plane.normal ) - dist;
			var d2 = vec3.dot(endp, plane.normal ) - dist;

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
			if (d1 <= 0 && d2 <= 0 ) {
				continue;
			}

			// Crosses face
			if (d1 > d2) {	// enter
				var f = (d1 - SURFACE_CLIP_EPSILON) / (d1 - d2);
				if (f < 0) {
					f = 0;
				}
				if (f > enterFrac) {
					enterFrac = f;
					clipplane = plane;
					leadside = side;
				}
			} else {	// leave
				var f = (d1 + SURFACE_CLIP_EPSILON) / (d1 - d2);
				if (f > 1) {
					f = 1;
				}
				if (f < leaveFrac) {
					leaveFrac = f;
				}
			}
		}
	} else {
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
	}

	//
	// all planes have been checked, and the trace was not
	// completely outside the brush
	//
	if (!startout) {	// original point was inside brush
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
			//tw.trace.surfaceFlags = leadside.surfaceFlags;
			tw.trace.contents = brush.contents;
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
function Trace(start, end, mins, maxs, model, origin, brushmask, capsule, sphere) {
	var tw = new TraceWork();
	var trace = tw.trace;

	if (!cm.checkcount) {
		cm.checkcount = 0;
	}
	cm.checkcount++; // for multi-check avoidance

	// Set basic parms.
	tw.contents = brushmask;

	// adjust so that mins and maxs are always symetric, which
	// avoids some complications with plane expanding of rotated
	// bmodels
	var offset = [0, 0, 0];
	for (var i = 0 ; i < 3 ; i++) {
		offset[i] = (mins[i] + maxs[i]) * 0.5;
		tw.size[0][i] = mins[i] - offset[i];
		tw.size[1][i] = maxs[i] - offset[i];
		tw.start[i] = start[i] + offset[i];
		tw.end[i] = end[i] + offset[i];
	}

	// If a sphere is already specified.
	if (sphere) {
		sphere.clone(tw.sphere);
	} else {
		tw.sphere.use = capsule;
		tw.sphere.radius = (tw.size[1][0] > tw.size[1][2]) ? tw.size[1][2]: tw.size[1][0];
		tw.sphere.halfheight = tw.size[1][2];
		vec3.set([0, 0, tw.size[1][2] - tw.sphere.radius], tw.sphere.offset);
	}

	tw.maxOffset = tw.size[1][0] + tw.size[1][1] + tw.size[1][2];

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
	if (tw.sphere.use) {
		for (var i = 0; i < 3; i++) {
			if (tw.start[i] < tw.end[i]) {
				tw.bounds[0][i] = tw.start[i] - Math.abs(tw.sphere.offset[i]) - tw.sphere.radius;
				tw.bounds[1][i] = tw.end[i] + Math.abs(tw.sphere.offset[i]) + tw.sphere.radius;
			} else {
				tw.bounds[0][i] = tw.end[i] - Math.abs(tw.sphere.offset[i]) - tw.sphere.radius;
				tw.bounds[1][i] = tw.start[i] + Math.abs(tw.sphere.offset[i]) + tw.sphere.radius;
			}
		}
	} else {
		for (var i = 0 ; i < 3 ; i++) {
			if (tw.start[i] < tw.end[i]) {
				tw.bounds[0][i] = tw.start[i] + tw.size[0][i];
				tw.bounds[1][i] = tw.end[i] + tw.size[1][i];
			} else {
				tw.bounds[0][i] = tw.end[i] + tw.size[0][i];
				tw.bounds[1][i] = tw.start[i] + tw.size[1][i];
			}
		}
	}

	//
	// Check for position test special case.
	//
	var cmod = model ? ClipHandleToModel(model) : null;

	if (start[0] == end[0] && start[1] == end[1] && start[2] == end[2]) {
		if (model) {
		// 	if (model == CAPSULE_MODEL_HANDLE) {
		// 		if (tw.sphere.use) {
		// 			TestCapsuleInCapsule(tw, model);
		// 		}
		// 		else {
		// 			TestBoundingBoxInCapsule(tw, model);
		// 		}
		// 	} else {
				TestInLeaf(tw, cmod.leaf);
		// 	}
		} else {
			PositionTest(tw);
		}
	} else {
		//
		// Check for point special case.
		//
		if (tw.size[0][0] === 0 && tw.size[0][1] === 0 && tw.size[0][2] === 0) {
			tw.isPoint = true;
			tw.extents = [0, 0, 0];
		} else {
			tw.isPoint = false;
			tw.extents[0] = tw.size[1][0];
			tw.extents[1] = tw.size[1][1];
			tw.extents[2] = tw.size[1][2];
		}

		if (model) {
		// 	if (model === CAPSULE_MODEL_HANDLE) {
		// 		if (tw.sphere.use) {
		// 			TraceCapsuleThroughCapsule(tw, model);
		// 		} else {
		// 			TraceBoundingBoxThroughCapsule(tw, model);
		// 		}
		// 	} else {
				TraceThroughLeaf(tw, cmod.leaf);
		// 	}
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
	if (!tw.trace.allSolid && tw.trace.fraction !== 1.0 && vec3.squaredLength(tw.trace.plane.normal) <= 0.9999) {
		com.error(sh.Err.DROP, 'Invalid trace result');
	}

	return trace;
}

/**
 * BoxTrace
 */
function BoxTrace(start, end, mins, maxs, model, brushmask, capsule ) {
	return Trace(start, end, mins, maxs, model, [0, 0, 0], brushmask, capsule, null);
}

/**
 * TransformedBoxTrace
 *
 * Handles offseting and rotation of the end points for moving and
 * rotating entities
 */
function TransformedBoxTrace(start, end, mins, maxs, model, brushmask, origin, angles, capsule) {
	if (typeof(mins) === 'undefined') {
		mins = [0, 0, 0];
	}
	
	if (typeof(maxs) === 'undefined') {
		maxs = [0, 0, 0];
	}

	var start_l = [0, 0, 0];
	var end_l = [0, 0, 0];
	var offset = [0, 0, 0];
	var symetricSize = [
		[0, 0, 0],
		[0, 0, 0]
	];
	var matrix = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	var transpose = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
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

	var halfwidth = symetricSize[1][0];
	var halfheight = symetricSize[1][2];

	var sphere = new Sphere();
	sphere.use = capsule;
	sphere.radius = (halfwidth > halfheight) ? halfheight : halfwidth;
	sphere.halfheight = halfheight;

	var t = halfheight - sphere.radius;

	if (rotated) {
		// Rotation on trace line (start-end) instead of rotating the bmodel
		// NOTE: This is still incorrect for bounding boxes because the actual bounding
		//		 box that is swept through the model is not rotated. We cannot rotate
		//		 the bounding box or the bmodel because that would make all the brush
		//		 bevels invalid.
		//		 However this is correct for capsules since a capsule itself is rotated too.
		qm.AnglesToAxis(angles, matrix);
		qm.RotatePoint(start_l, matrix);
		qm.RotatePoint(end_l, matrix);
		// rotated sphere offset for capsule
		sphere.offset[0] = matrix[0][ 2 ] * t;
		sphere.offset[1] = -matrix[1][ 2 ] * t;
		sphere.offset[2] = matrix[2][ 2 ] * t;
	}
	else {
		vec3.set([0, 0, t], sphere.offset);
	}

	// Sweep the box through the model
	var trace = Trace(start_l, end_l, symetricSize[0], symetricSize[1], model, origin, brushmask, capsule, sphere);

	// if the bmodel was rotated and there was a collision
	if (rotated && trace.fraction !== 1.0) {
		// rotation of bmodel collision plane
		TransposeMatrix(matrix, transpose);
		qm.RotatePoint(trace.plane.normal, transpose);
	}

	// Re-calculate the end position of the trace because the trace.endPos
	// calculated by Trace could be rotated and have an offset.
	trace.endPos[0] = start[0] + trace.fraction * (end[0] - start[0]);
	trace.endPos[1] = start[1] + trace.fraction * (end[1] - start[1]);
	trace.endPos[2] = start[2] + trace.fraction * (end[2] - start[2]);

	return trace;
}

		return {
			LoadMap:               LoadMap,
			EntityDefs:            function () { return cm.entities; },
			InlineModel:           InlineModel,
			TempBoxModel:          TempBoxModel,
			ModelBounds:           ModelBounds,
			BoxTrace:              BoxTrace,
			TransformedBoxTrace:   TransformedBoxTrace,
			EmitCollisionSurfaces: EmitCollisionSurfaces
		};
	}

	return {
		CreateInstance: function (imp) {
			return new ClipMap(imp);
		}
	};
});

/*global vec3: true, mat4: true */

define('server/sv',
['underscore', 'ByteBuffer', 'common/sh', 'game/gm', 'client/cl', 'clipmap/cm'],
function (_, ByteBuffer, sh, game, cl, clipmap) {
	var BASE_FOLDER = 'baseq3';
var MAX_QPATH   = 64;
var CMD_BACKUP  = 64;

// If entityState.solid === SOLID_BMODEL, modelIndex is an inline model number
var SOLID_BMODEL = 0xffffff;

/**
 * Cvar flags
 */
var CVF = {
	ARCHIVE:    0x0001,                                    // save to config file
	USERINFO:   0x0002,                                    // sent to server on connect or change
	SERVERINFO: 0x0004,                                    // sent in response to front end requests
	SYSTEMINFO: 0x0008                                     // these cvars will be duplicated on all clients
};

/**
 * Renderer (should be moved)
 */
var MAX_DRAWSURFS  = 0x10000;

/**
 * Snapshot flags
 */
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

/**
 * MAX_* defines used to pre-alloc many structures
 */
var GENTITYNUM_BITS         = 10;
var MAX_CLIENTS             = 32;                          // absolute limit
var MAX_GENTITIES           = (1 << 10);                   // can't be increased without changing drawsurf bit packing
var MAX_MODELS              = 256;                         // these are sent over the net as 8 bits
var MAX_SOUNDS              = 256;                         // so they cannot be blindly increased

/**
 * Faux entity numbers
 */
var ENTITYNUM_NONE          = MAX_GENTITIES-1;
var ENTITYNUM_WORLD         = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL    = MAX_GENTITIES-2;

var MOVE_RUN = 120;                                        // if forwardmove or rightmove are >= MOVE_RUN,
	                                                       // then BUTTON_WALKING should be set

/**
 * Playerstate
 */
var MAX_STATS               = 16;
var MAX_PERSISTANT          = 16;
var MAX_POWERUPS            = 16;
var MAX_WEAPONS             = 16;
var MAX_PS_EVENTS           = 2;
var PMOVEFRAMECOUNTBITS     = 6;

var BUTTON = {
	ATTACK:       1,
	TALK:         2,                                       // displays talk balloon and disables actions
	USE_HOLDABLE: 4,
	GESTURE:      8,
	WALKING:      16,                                      // walking can't just be infered from MOVE_RUN
	                                                       // because a key pressed late in the frame will
	                                                       // only generate a small move value for that frame
	                                                       // walking will use different animations and
	                                                       // won't generate footsteps
	AFFIRMATIVE:  32,
	NEGATIVE:     64,
	GETFLAG:      128,
	GUARDBASE:    256,
	PATROL:       512,
	FOLLOWME:     1024,
	ANY:          2048                                     // any key whatsoever
};

var TR = {
	STATIONARY:  0,
	INTERPOLATE: 1,                              // non-parametric, but interpolate between snapshots
	LINEAR:      2,
	LINEAR_STOP: 3,
	SINE:        4,                              // value = base + sin( time / duration ) * delta
	GRAVITY:     5
};

var SURF = {
	NODAMAGE:    0x1,                            // never give falling damage
	SLICK:       0x2,                            // effects game physics
	SKY:         0x4,                            // lighting from environment map
	LADDER:      0x8,
	NOIMPACT:    0x10,                           // don't make missile explosions
	NOMARKS:     0x20,                           // don't leave missile marks
	FLESH:       0x40,                           // make flesh sounds and effects
	NODRAW:      0x80,                           // don't generate a drawsurface at all
	HINT:        0x100,                          // make a primary bsp splitter
	SKIP:        0x200,                          // completely ignore, allowing non-closed brushes
	NOLIGHTMAP:  0x400,                          // surface doesn't need a lightmap
	POINTLIGHT:  0x800,                          // generate lighting info at vertexes
	METALSTEPS:  0x1000,                         // clanking footsteps
	NOSTEPS:     0x2000,                         // no footstep sounds
	NONSOLID:    0x4000,                         // don't collide against curves with this set
	LIGHTFILTER: 0x8000,                         // act as a light filter during q3map -light
	ALPHASHADOW: 0x10000,                        // do per-pixel light shadow casting in q3map
	NODLIGHT:    0x20000,                        // don't dlight even if solid (solid lava, skies)
	DUST:        0x40000                         // leave a dust trail when walking on this surface
};

var CONTENTS = {
	SOLID:         1,                                      // an eye is never valid in a solid
	LAVA:          8,
	SLIME:         16,
	WATER:         32,
	FOG:           64,

	NOTTEAM1:      0x0080,
	NOTTEAM2:      0x0100,
	NOBOTCLIP:     0x0200,

	AREAPORTAL:    0x8000,

	PLAYERCLIP:    0x10000,
	MONSTERCLIP:   0x20000,
	TELEPORTER:    0x40000,
	JUMPPAD:       0x80000,
	CLUSTERPORTAL: 0x100000,
	DONOTENTER:    0x200000,
	BOTCLIP:       0x400000,
	MOVER:         0x800000,

	ORIGIN:        0x1000000,                              // removed before bsping an entity

	BODY:          0x2000000,                              // should never be on a brush, only in game
	CORPSE:        0x4000000,
	DETAIL:        0x8000000,                              // brushes not used for the bsp
	STRUCTURAL:    0x10000000,                             // brushes used for the bsp
	TRANSLUCENT:   0x20000000,                             // don't consume surface fragments inside
	TRIGGER:       0x40000000,
	NODROP:        0x80000000                              // don't leave bodies or items (death fog, lava)
};
	var MAX_MAP_AREA_BYTES = 32;                     // bit vector of area visibility

/**
 * System events
 */
var SE = {
	CLMSG:       0,
	SVMSG:       1,
	SVSOCKCLOSE: 2,
	KEY:         3,
	MOUSE:       4
};

/**
 * Networking
 */
var PACKET_BACKUP         = 32;                  // number of old messages that must be kept on client and
                                                 // server for delta comrpession and ping estimation
var MAX_PACKET_USERCMDS   = 32;                  // max number of usercmd_t in a packet
var MAX_RELIABLE_COMMANDS = 64;                  // max string commands buffered for restransmit
var MAX_MSGLEN            = 16384;

var CLM = {
	bad:           0,
	move:          1,                            // [[UserCmd]
	moveNoDelta:   2,                            // [[UserCmd]
	clientCommand: 3,                            // [string] message
	EOF:           4
};

var SVM = {
	bad:            0,
	gamestate:      1,
	configstring:   2,                           // [short] [string] only in gamestate messages
	baseline:       3,                           // only in gamestate messages
	serverCommand:  4,                           // [string] to be executed by client game module
	snapshot:       5,
	EOF:            6
};
	var FRAMETIME = 100; // msec
var CARNAGE_REWARD_TIME = 3000;
var REWARD_SPRITE_TIME = 2000;

var DAMAGE = {
	RADIUS:        0x00000001,                             // damage was indirect
	NO_ARMOR:      0x00000002,                             // armour does not protect from this damage
	NO_KNOCKBACK:  0x00000004,                             // do not affect velocity, just view angles
	NO_PROTECTION: 0x00000008                              // armor, shields, invulnerability, and godmode have no effect
};

// GameEntity flags
var GFL = {
	GODMODE:       0x00000010,
	NOTARGET:      0x00000020,
	TEAMSLAVE:     0x00000400,                             // not the first on the team
	NO_KNOCKBACK:  0x00000800,
	DROPPED_ITEM:  0x00001000,
	NO_BOTS:       0x00002000,                             // spawn point not for bot use
	NO_HUMANS:     0x00004000,                             // spawn point just for bots
	FORCE_GESTURE: 0x00008000                              // force gesture on client
};

var LevelLocals = function () {
	this.framenum     = 0;
	this.previousTime = 0;
	this.time         = 0;
	this.startTime    = 0;
	this.clients      = new Array(MAX_CLIENTS);
	this.gentities    = new Array(MAX_GENTITIES);

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.gentities[i] = new GameEntity();
	}
};

// The server does not know how to interpret most of the values
// in entityStates (level eType), so the game must explicitly flag
// special server behaviors.
var SVF = {
	NOCLIENT:           0x00000001,                        // don't send entity to clients, even if it has effects
	BOT:                0x00000002,                        // set if the entity is a bot
	BROADCAST:          0x00000008,                        // send to all connected clients
	PORTAL:             0x00000020,                        // merge a second pvs at origin2 into snapshots
	USE_CURRENT_ORIGIN: 0x00000040,                        // entity->r.currentOrigin instead of entity->s.origin
	                                                       // for link position (missiles and movers)
	SINGLECLIENT:       0x00000080,                        // only send to a single client (entityShared_t->singleClient)
	NOTSINGLECLIENT:    0x00000100                         // send entity to everyone but one client
};

var GameEntity = function () {
	this.reset();
};

GameEntity.prototype.reset = function () {
	//
	// Shared by game and server.
	//
	this.s             = new sh.EntityState();
	this.linked        = false;
	// SVF_NOCLIENT, SVF_BROADCAST, etc.
	this.svFlags       = 0;
	// Only send to this client when SVF_SINGLECLIENT is set.
	this.singleClient  = 0;
	// If false, assume an explicit mins / maxs bounding box only set by trap_SetBrushModel.
	this.bmodel        = false;
	this.mins          = [0, 0, 0];
	this.maxs          = [0, 0, 0];
	// CONTENTS.TRIGGER, CONTENTS.SOLID, CONTENTS.BODY (non-solid ent should be 0)
	this.contents      = 0;
	// Derived from mins/maxs and origin + rotation.
	this.absmin        = [0, 0, 0];
	this.absmax        = [0, 0, 0];
	// currentOrigin will be used for all collision detection and world linking.
	// it will not necessarily be the same as the trajectory evaluation for the current
	// time, because each entity must be moved one at a time after time is advanced
	// to avoid simultanious collision issues.
	this.currentOrigin = [0, 0, 0];
	this.currentAngles = [0, 0, 0];
	this.client        = null;
	// When a trace call is made and passEntityNum != ENTITYNUM_NONE,
	// an ent will be excluded from testing if:
	// ent.s.number == passEntityNum                   (don't interact with self)
	// ent.ownerNum == passEntityNum                   (don't interact with your own missiles)
	// entity[ent.ownerNum].ownerNum == passEntityNum  (don't interact with other missiles from owner)
	this.ownerNum      = ENTITYNUM_NONE;

	//
	// Game only
	//
	this.parent              = null;
	this.inuse               = false;
	this.classname           = 'noclass';
	this.spawnflags          = 0;

	this.freeTime            = 0;                          // level.time when the object was freed
	this.eventTime           = 0;                          // events will be cleared EVENT_VALID_MSEC after set
	this.freeAfterEvent      = false;
	this.unlinkAfterEvent    = false;

	this.model               = null;
	this.model2              = null;
	this.physicsObject       = false;                      // if true, it can be pushed by movers and fall off edges
	                                                       // all game items are physicsObjects
	this.physicsBounce       = 0;                          // 1.0 = continuous bounce, 0.0 = no bounce
	this.clipmask            = 0;                          // brushes with this content value will be collided against
	                                                       // when moving. items and corpses do not collide against
	                                                       // players, for instance
	// movers
	this.moverState          = 0;
	this.soundPos1           = 0;
	this.sound1to2           = 0;
	this.sound2to1           = 0;
	this.soundPos2           = 0;
	this.soundLoop           = 0;
	this.nextTrain           = null;
	this.prevTrain           = null;
	this.pos1                = [0, 0, 0];
	this.pos2                = [0, 0, 0];

	this.target              = null;
	this.targetName          = null;
	this.team                = null;
	this.targetShaderName    = null;
	this.targetShaderNewName = null;
	this.targetEnt           = null;

	this.nextthink           = 0;
	this.think               = null;

	this.timestamp           = 0;                          // body queue sinking, etc

	this.health              = 0;
	this.takeDamage          = false;

	this.damage              = 0;
	this.splashDamage        = 0;                          // quad will increase this without increasing radius
	this.splashRadius        = 0;
	this.methodOfDeath       = 0;
	this.splashMethodOfDeath = 0;

	this.count               = 0;                          // items

	this.chain               = null;
	this.enemy               = null;
	this.activator           = null;
	this.teamchain           = null; // next entity in team
	this.teammaster          = null; // master of the team

}

// This structure is cleared on each ClientSpawn(),
// except for 'client->pers' and 'client->sess'.
var GameClient = function () {
	this.ps                = new sh.PlayerState();
	this.pers              = new GameClientPersistant();

	this.noclip            = false;

	this.oldOrigin         = [0, 0, 0];

	// Sum up damage over an entire frame, so
	// shotgun blasts give a single big kick.
	this.damage_armor      = 0;                            // damage absorbed by armor
	this.damage_blood      = 0;                            // damage taken out of health
	this.damage_knockback  = 0;                            // impact damage
	this.damage_from       = [0, 0, 0];                    // origin for vector calculation
	this.damage_fromWorld  = false;                        // if true, don't use the damage_from vector

	// Awards
	this.impressive_count  = 0;                            // for "impressive" reward sound
	this.accuracy_shots    = 0;                            // total number of shots
	this.accuracy_hits     = 0;                            // total number of hits

	// Taunts
	this.lastkilled_client = 0;                            // last client that this client killed
	this.lasthurt_mod      = 0;                            // type of damage the client did

	// Timers
	this.respawnTime       = 0;                            // can respawn when time > this, force after g_forcerespwan
	this.inactivityTime    = 0;                            // kick players when time > this
	this.inactivityWarning = 0;                            // true if the five second warning has been given
	this.rewardTime        = 0;                            // clear the EF.AWARD_IMPRESSIVE, etc when time > this
};

// Client data that stays across multiple respawns, but is cleared
// on each level change or team change at ClientBegin()
var GameClientPersistant = function () {
	this.cmd     = new sh.UserCmd();
	this.netname = null;
};
	var MAX_SNAPSHOT_ENTITIES = MAX_CLIENTS * PACKET_BACKUP * 64;

// Persistent across all maps.
var ServerStatic = function () {
	this.initialized          = false;
	this.time                 = 0;
	this.snapFlagServerBit    = 0;                         // ^= SNAPFLAG_SERVERCOUNT every SV_SpawnServer()
	this.clients              = new Array(MAX_CLIENTS);
	this.nextSnapshotEntities = 0;                         // next snapshotEntities to use
	this.snapshotEntities     = new Array(MAX_SNAPSHOT_ENTITIES);
	this.msgBuffer            = new ArrayBuffer(MAX_MSGLEN);

	for (var i = 0; i < MAX_CLIENTS; i++) {
		this.clients[i] = new ServerClient();
	}

	for (var i = 0; i < MAX_SNAPSHOT_ENTITIES; i++) {
		this.snapshotEntities[i] = new sh.EntityState();
	}
};

// Reset for each map.
var ServerState = {
	DEAD:    0,                                            // no map loaded
	LOADING: 1,                                            // spawning level entities
	GAME:    2                                             // actively running
};

var ServerLocals = function () {
	this.state           = ServerState.DEAD;
	this.restarting      = false;                          // if true, send configstring changes during SS_LOADING
	this.serverId        = 0;                              // changes each server start
	this.snapshotCounter = 0;                              // incremented for each snapshot built
	this.time            = 0;
	this.timeResidual    = 0;                              // <= 1000 / sv_frame->value
	this.configstrings   = {};
	this.svEntities      = new Array(MAX_GENTITIES);
	this.gameEntities    = null;
	this.gameClients     = null;

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.svEntities[i] = new ServerEntity();
	}
};

var ServerEntity = function () {
	this.worldSector     = null;
	this.baseline        = new sh.EntityState();
	this.snapshotCounter = 0;
};

var CS = {
	FREE:      0,                                          // can be reused for a new connection
	ZOMBIE:    1,                                          // client has been disconnected, but don't reuse
	                                                       // connection for a couple seconds
	CONNECTED: 2,                                          // has been assigned to a client_t, but no gamestate yet
	PRIMED:    3,                                          // gamestate has been sent, but client hasn't sent a usercmd
	ACTIVE:    4                                           // client is fully in game
};

var ServerClient = function () {
	this.reset();
};

ServerClient.prototype.reset = function () {
	this.state                   = CS.FREE;
	this.userinfo                = {};

	this.messageAcknowledge      = 0;
	this.reliableCommands        = new Array(MAX_RELIABLE_COMMANDS);
	this.reliableSequence        = 0;                      // last added reliable message, not necesarily sent or acknowledged yet
	this.reliableAcknowledge     = 0;                      // last acknowledged reliable message

	this.gamestateMessageNum     = -1;

	this.lastUserCmd             = new sh.UserCmd();
	this.lastMessageNum          = 0;                      // for delta compression
	this.lastClientCommand       = 0;                      // reliable client message sequence
	this.lastClientCommandString = null;
	this.name                    = null;                   // extracted from userinfo, high bits masked

	this.deltaMessage            = -1;                     // frame last client usercmd message
	this.nextReliableTime        = 0;                      // svs.time when another reliable command will be allowed
	this.lastSnapshotTime        = 0;
	this.snapshotMsec            = 0;                      // requests a snapshot every snapshotMsec unless rate choked
	this.frames                  = new Array(PACKET_BACKUP);
	
	this.netchan                 = null;
	this.oldServerTime           = 0;
	this.csUpdated               = {};
	
	for (var i = 0; i < PACKET_BACKUP; i++) {
		this.frames[i] = new ClientSnapshot();
	}
};

var ClientSnapshot = function () {
	this.ps          = new sh.PlayerState();
	this.numEntities = 0;
	this.firstEntity = 0;                                  // index into the circular sv_packet_entities[]
	                                                       // the entities MUST be in increasing state number
	                                                       // order, otherwise the delta compression will fail
};
	var sys;
var com;
var dedicated;

var sv;
var svs;
var cm;

var sv_serverid,
	sv_mapname,
	sv_fps,
	sv_timeout,
	sv_zombietime;

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'SV:');
	Function.apply.call(console.log, console, args);
}

/**
 * Init
 */
function Init(sys_, com_, isdedicated) {
	log('Initializing');
	
	sys = sys_;
	com = com_;
	dedicated = isdedicated;

	sv  = new ServerLocals();
	svs = new ServerStatic();
	cm  = clipmap.CreateInstance(ClipmapExports());
	gm  = game.CreateInstance(com, GameExports());
	
	sv_serverid   = com.AddCvar('sv_serverid',   0,       CVF.SYSTEMINFO);
	sv_mapname    = com.AddCvar('sv_mapname',    'nomap', CVF.SERVERINFO);
	// TODO We need to run clientthink outside of our main Frame() think loop.
	sv_fps        = com.AddCvar('sv_fps',        20);   // time rate for running non-clients
	sv_timeout    = com.AddCvar('sv_timeout',    200);  // seconds without any message
	sv_zombietime = com.AddCvar('sv_zombietime', 2);    // seconds to sink messages after disconnect

	RegisterCommands();

	// For dev purposes, simulate command line input.
	setTimeout(function () {
		CmdLoadMap('q3tourney2');
	}, 50);
}

/**
 * GameExports
 */
function GameExports() {
	return {
		LocateGameData:    LocateGameData,
		GetUserCmd:        GetUserCmd,
		GetConfigstring:   GetConfigstring,
		SetConfigstring:   SetConfigstring,
		GetUserinfo:       GetUserinfo,
		SetBrushModel:     SetBrushModel,
		LinkEntity:        LinkEntity,
		UnlinkEntity:      UnlinkEntity,
		FindEntitiesInBox: FindEntitiesInBox,
		GetEntityDefs:     cm.EntityDefs,
		Trace:             Trace
	};
}

/**
 * ClipmapExports
 */
function ClipmapExports() {
	return {
		sys_ReadFile: sys.ReadFile
	};
}

/**
 * FrameMsec
 * 
 * Calculate the # of milliseconds for a single frame.
 */
function FrameMsec() {
	var fps = sv_fps();
	var frameMsec = 1000 / fps;

	if (frameMsec < 1) {
		frameMsec = 1;
	}

	return frameMsec;
}

/**
 * Frame
 */
function Frame(msec) {
	if (!svs.initialized) {
		return;
	}

	var frameMsec = FrameMsec();
	sv.timeResidual += msec;

	// Run the game simulation in chunks.
	var frames = 0;
	while (sv.timeResidual >= frameMsec) {
		sv.timeResidual -= frameMsec;
		svs.time += frameMsec;
		sv.time += frameMsec;

		// Let everything in the world think and move.
		gm.Frame(sv.time);
		frames++;
	}

	CheckTimeouts();

	// Don't send out duplicate snapshots if we didn't run any gameframes.
	if (frames > 0) {
		SendClientMessages();
	}
}

/**
 * CheckTimeouts
 * 
 * If a packet has not been received from a client for timeout->integer 
 * seconds, drop the conneciton. Server time is used instead of
 * realtime to avoid dropping the local client while debugging.
 * 
 * When a client is normally dropped, the client_t goes into a zombie state
 * for a few seconds to make sure any final reliable message gets resent
 * if necessary
 */
function CheckTimeouts() {
	var droppoint = svs.time - 1000 * sv_timeout();
	var zombiepoint = svs.time - 1000 * sv_zombietime();

	for (var i = 0; i < MAX_CLIENTS; i++) {
		var client = svs.clients[i];
		if (client.state === CS.FREE) {
			continue;
		}

		// Message times may be wrong across a changelevel.
		if (client.lastPacketTime > svs.time) {
			client.lastPacketTime = svs.time;
		}

		if (client.state === CS.ZOMBIE && client.lastPacketTime < zombiepoint) {
			log('Going from CS_ZOMBIE to CS_FREE for client', i);
			client.state = CS.FREE;  // can now be reused
			continue;
		}

		if (client.state >= CS.CONNECTED && client.lastPacketTime < droppoint) {
			DropClient(client, 'timed out'); 
			client.state = CS.FREE;  // don't bother with zombie state
		}
	}
}

/**
 * PacketEvent
 */
function PacketEvent(socket, buffer) {	
	if (!svs.initialized) {
		return;
	}

	var msg = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	// Peek in and see if this is a string message.
	if (buffer.byteLength > 4 && msg.view.getInt32(0, !!ByteBuffer.LITTLE_ENDIAN) === -1) {
		ConnectionlessPacket(socket, msg);
		return;
	}

	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (client.state === CS.FREE) {
			continue;
		}

		if (client.netchan.socket !== socket) {
			continue;
		}

		if (com.NetchanProcess(client, msg)) {
			client.lastPacketTime = svs.time;  // don't timeout
			ExecuteClientMessage(client, msg);
		}
		return;
	}
}

/**
 * ConnectionlessPacket
 */
function ConnectionlessPacket(socket, msg) {
	msg.readInt();  // Skip the -1.

	var str = msg.readCString();

	if (str.indexOf('connect') === 0) {
		AcceptClient(socket, str.substr(8));
	}
}

/**
 * SpawnServer
 */
function SpawnServer(mapName) {
	log('Spawning new server for', mapName, 'at', com.frameTime());

	svs.initialized = false;
	
	// Shutdown the game.
	gm.Shutdown();
	
	if (!dedicated) {
		// Update the local client's screen.
		cl.MapLoading();

		// Make sure all the client stuff is unloaded.
		cl.ShutdownSubsystems();
		cl.ShutdownCGame();

		// Restart renderer and sound systems.
		cl.InitSubsystems();
	}

	// Toggle the server bit so clients can detect that a server has changed.
	svs.snapFlagServerBit ^= SNAPFLAG_SERVERCOUNT;

	// Wipe the entire per-level structure.
	var oldServerTime = sv.time;
	sv = new ServerLocals();

	// Load the collision map.
	cm.LoadMap(mapName, function () {
		sv_mapname(mapName);
		// serverid should be different each time.
		sv_serverid(com.frameTime());

		// Clear physics interaction links.
		ClearWorld();

		// Media configstring setting should be done during
		// the loading stage, so connected clients don't have
		// to load during actual gameplay.
		sv.state = ServerState.LOADING;

		// Initialize the game.
		gm.Init(sv.time);

		// Run a few frames to allow everything to settle.
		for (var i = 0; i < 3; i++) {
			gm.Frame(sv.time);
			sv.time += 100;
			svs.time += 100;
		}

		CreateBaselines();

		// Send the new gamestate to all connected clients.
		for (var i = 0; i < MAX_CLIENTS; i++) {
			var client = svs.clients[i];

			if (!client || client.state < CS.CONNECTED) {
				continue;
			}
			
			// Clear gentity pointer to prevent bad snapshots from building.
			client.gentity = null;

			// Reconnect.
			var denied = gm.ClientConnect(i, false);

			if (denied) {
				DropClient(client, denied);
			}

			// When we get the next packet from a connected client,
			// the new gamestate will be sent.
			client.state = CS.CONNECTED;
		}	

		/*// Run another frame to allow things to look at all the players.
		gm.Frame(sv.time);
		sv.time += 100;
		svs.time += 100;*/

		SetConfigstring('systemInfo', com.GetCvarValues(CVF.SYSTEMINFO));
		SetConfigstring('serverInfo', com.GetCvarValues(CVF.SERVERINFO));

		// Any media configstring setting now should issue a warning
		// and any configstring changes should be reliably transmitted
		// to all clients.
		sv.state = ServerState.GAME;

		svs.initialized = true;
	});
}

/**
 * CreateBaselines
 * 
 * Entity baselines are used to compress non-delta messages
 * to the clients -- only the fields that differ from the
 * baseline will be transmitted.
 */
function CreateBaselines() {
	for (var i = 0; i < MAX_GENTITIES; i++) {
		var svent = sv.svEntities[i];
		var gent = GentityForSvEntity(svent);
		if (!gent.linked) {
			continue;
		}

		// Take current state as baseline.
		gent.s.clone(sv.svEntities[i].baseline);
	}
}

/**
 * GetConfigstring
 */
function GetConfigstring(key) {
	return sv.configstrings[key];
}

/**
 * SetConfigstring
 */
function SetConfigstring(key, val) {
	// Don't bother broadcasting an update if no change.
	if (_.isEqual(val, sv.configstrings[key])) {
		return;
	}

	// Change the string.
	sv.configstrings[key] = val;

	// Send it to all the clients if we aren't spawning a new server.
	if (sv.state === ServerState.GAME || sv.restarting) {
		// Send the data to all relevent clients.
		for (var i = 0; i < MAX_CLIENTS; i++) {
			var client = svs.clients[i];

			if (client.state < CS.ACTIVE) {
				if (client.state === CS.PRIMED) {
					client.csUpdated[key] = true;
				}
				continue;
			}
		
			SendConfigstring(client, key);
		}
	}
}

/**
 * SendConfigString
 *
 * Creates and sends the server command necessary to update the CS index for the
 * given client.
 */
function SendConfigstring(client, key) {
	SendServerCommand(client, 'cs', { k: key, v: sv.configstrings[key] });
}

/**
 * UpdateConfigstrings
 * 
 * Called when a client goes from CS.PRIMED to CS.ACTIVE. Updates all
 * Configstring indexes that have changed while the client was in CS.PRIMED.
 */
function UpdateConfigstrings(client) {
	for (var key in sv.configstrings) {
		if (!sv.configstrings.hasOwnProperty(key)) {
			continue;
		}

		// If the CS hasn't changed since we went to CS.PRIMED, ignore.
		if (!client.csUpdated[key]) {
			continue;
		}

		SendConfigstring(client, key);
		client.csUpdated[key] = false;
	}
}

/**
 * GetUserInfo
 */
function GetUserinfo(clientNum) {
	if (clientNum < 0 || clientNum >= MAX_CLIENTS) {
		com.error(sh.Err.DROP, 'GetUserinfo: bad index ' + clientNum);
	}

	return svs.clients[clientNum].userinfo;
}

/**********************************************************
 *
 * Event messages
 *
 **********************************************************/

/**
 * SendServerCommand
 * 
 * Sends a reliable command string to be interpreted by 
 * the client game module: "cp", "print", "chat", etc
 * A NULL client will broadcast to all clients
 */
function SendServerCommand(client, type, msg) {
	if (client !== null) {
		AddServerCommand(client, type, msg);
		return;
	}

	// // Hack to echo broadcast prints to console.
	// if ( com_dedicated->integer && !strncmp( (char *)message, "print", 5) ) {
	// 	Com_Printf ("broadcast: %s\n", SV_ExpandNewlines((char *)message) );
	// }

	// Send the data to all relevent clients.
	for (var i = 0; i < MAX_CLIENTS; i++) {
		AddServerCommand(client, type, msg);
	}
}

/**
 * AddServerCommand
 *  
 * The given command will be transmitted to the client, and is guaranteed to
 * not have future snapshot_t executed before it is executed.
 */
function AddServerCommand(client, type, msg) {
	// Do not send commands until the gamestate has been sent.
	if (client.state < CS.PRIMED) {
		return;
	}

	client.reliableSequence++;

	var cmd = { type: type, value: msg };

	// If we would be losing an old command that hasn't been acknowledged,
	// we must drop the connection.
	// We check == instead of >= so a broadcast print added by SV_DropClient()
	// doesn't cause a recursive drop client.
	if (client.reliableSequence - client.reliableAcknowledge === MAX_RELIABLE_COMMANDS + 1 ) {
		log('----- pending server commands -----');
		for (var i = client.reliableAcknowledge + 1; i <= client.reliableSequence; i++) {
			log('cmd', i, client.reliableCommands[i % MAX_RELIABLE_COMMANDS]);
		}
		log('cmd', i, cmd);
		DropClient(client, 'Server command overflow');
		return;
	}

	// Copy the command off.
	client.reliableCommands[client.reliableSequence % MAX_RELIABLE_COMMANDS] = cmd;
}
	/**
 * SocketClosed
 */
function SocketClosed(socket) {	
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (client.state === CS.FREE) {
			continue;
		}

		if (client.netchan.socket === socket) {
			DropClient(client, 'disconnected');
			return;
		}
	}
}

/**
 * AcceptClient
 */
function AcceptClient(socket, infostr) {
	if (!svs.initialized) {
		return;
	}

	log('A client is connecting');

	// Find a slot for the client.
	var clientNum;
	for (var i = 0; i < MAX_CLIENTS; i++) {
		if (svs.clients[i].state === CS.FREE) {
			clientNum = i;
			break;
		}
	}
	if (clientNum === undefined) {
		//NET_OutOfBandPrint( NS_SERVER, from, "print\nServer is full.\n" );
		log('Rejected a connection.');
		return
	}

	// Create the client.
	var newcl = svs.clients[clientNum];
	newcl.reset();

	newcl.netchan = com.NetchanSetup(sh.NetSrc.SERVER, socket);
	newcl.userinfo = JSON.parse(infostr);

	// Give the game a chance to reject this connection or modify the userinfo.
	var denied = gm.ClientConnect(clientNum, true);

	if (denied) {
		//NET_OutOfBandPrint( NS_SERVER, from, "print\n%s\n", str );
		//Com_DPrintf ("Game rejected a connection: %s.\n", str);
		return;
	}
	
	UserinfoChanged(newcl);

	log('Going from CS_FREE to CS_CONNECTED for ', clientNum);

	newcl.state = CS.CONNECTED;
	newcl.lastSnapshotTime = svs.time;
	newcl.lastPacketTime = svs.time;

	// Let the client know we've accepted them.
	com.NetchanPrint(newcl.netchan, 'connectResponse');

	// When we receive the first packet from the client, we will
	// notice that it is from a different serverid and that the
	// gamestate message was not just sent, forcing a retransmit.
	newcl.gamestateMessageNum = -1;
}

/**
 * DropClient
 *
 * Called when the player is totally leaving the server, either willingly
 * or unwillingly.
 */
function DropClient(client, reason) {
	if (client.state === CS.ZOMBIE) {
		return;  // already dropped
	}

	/*// see if we already have a challenge for this ip
	challenge = &svs.challenges[0];

	for (var i = 0 ; i < MAX_CHALLENGES ; i++, challenge++)
	{
		if(NET_CompareAdr(drop->netchan.remoteAddress, challenge->adr))
		{
			Com_Memset(challenge, 0, sizeof(*challenge));
			break;
		}
	}*/

	// tell everyone why they got dropped
	//SV_SendServerCommand( NULL, "print \"%s" S_COLOR_WHITE " %s\n\"", drop->name, reason );

	// Call the game function for removing a client
	// this will remove the body, among other things.
	var clientNum = GetClientNum(client);
	gm.ClientDisconnect(clientNum);

	// add the disconnect command
	//SV_SendServerCommand( drop, "disconnect \"%s\"", reason);

	// nuke user info
	//SV_SetUserinfo( drop - svs.clients, "" );
	
	//Com_DPrintf( "Going to CS_ZOMBIE for %s\n", drop->name );
	client.state = CS.ZOMBIE;           // become free in a few seconds
}

/**
 * ClientEnterWorld
 */
function ClientEnterWorld(client) {
	var clientNum = svs.clients.indexOf(client);

	client.state = CS.ACTIVE;

	// Resend all configstrings using the cs commands since these are
	// no longer sent when the client is CS_PRIMED.
	UpdateConfigstrings(client);

	gm.ClientBegin(clientNum);

	// The entity is initialized inside of ClientBegin.
	client.gentity = GentityForNum(clientNum);
}

/**
 * UserMove
 */
function UserMove(client, msg, delta) {
	if (delta) {
		client.deltaMessage = client.messageAcknowledge;
	} else {
		client.deltaMessage = -1;
	}

	var cmd = new sh.UserCmd();
	cmd.serverTime = msg.readInt();
	cmd.angles[0] = msg.readUnsignedShort();
	cmd.angles[1] = msg.readUnsignedShort();
	cmd.angles[2] = msg.readUnsignedShort();
	cmd.forwardmove = msg.readByte();
	cmd.rightmove = msg.readByte();
	cmd.upmove = msg.readByte();
	cmd.buttons = msg.readByte();
	cmd.weapon = msg.readByte();

	// If this is the first usercmd we have received
	// this gamestate, put the client into the world.
	if (client.state === CS.PRIMED) {
		ClientEnterWorld(client);
		// now moves can be processed normaly
	}

	if (client.state !== CS.ACTIVE) {
		client.deltaMessage = -1;
		return; // shouldn't happen
	}

	ClientThink(client, cmd);
}

/**
 * ClientThink
 */
function ClientThink(client, cmd) {
	var clientNum = GetClientNum(client);
	
	cmd.clone(client.lastUserCmd);

	gm.ClientThink(clientNum);
}

/**
 * SendClientGameState
 */
function SendClientGameState(client) {
	client.state = CS.PRIMED;
	// When we receive the first packet from the client, we will
	// notice that it is from a different serverid and that the
	// gamestate message was not just sent, forcing a retransmit.
	client.gamestateMessageNum = client.netchan.outgoingSequence;

	var msg = new ByteBuffer(svs.msgBuffer, ByteBuffer.LITTLE_ENDIAN);

	msg.writeInt(client.lastClientCommand);

	msg.writeByte(SVM.gamestate);
	msg.writeInt(client.reliableSequence);

	// Write the configstrings.
	for (var key in sv.configstrings) {
		if (!sv.configstrings.hasOwnProperty(key)) {
			continue;
		}

		msg.writeByte(SVM.configstring);
		msg.writeCString(JSON.stringify({ k: key, v: sv.configstrings[key] }));
	}

	// Write the baselines.
	var nullstate = new sh.EntityState();
	for (var i = 0; i < MAX_GENTITIES; i++) {
		var base = sv.svEntities[i].baseline;
		if (!base.number) {
			continue;
		}
		msg.writeByte(SVM.baseline);
		sh.WriteDeltaEntityState(msg, nullstate, base, true);
	}

	msg.writeByte(SVM.EOF);

	msg.writeInt(GetClientNum(client));

	com.NetchanSend(client.netchan, msg.buffer, msg.index);
}

/**
 * UserinfoChanged
 *
 * Pull specific info from a newly changed userinfo string 
 * into a more C friendly form.
 */
function UserinfoChanged(client) {
	client.name = client.userinfo['name'];

	// Snaps command.
	var snaps = 20;

	if (snaps < 1) {
		snaps = 1;
	} else if(snaps > sv_fps()) {
		snaps = sv_fps();
	}

	snaps = 1000 / snaps;

	if (snaps != client.snapshotMsec) {
		// Reset last sent snapshot so we avoid desync between server frame time and snapshot send time.
		client.lastSnapshotTime = 0;
		client.snapshotMsec = snaps;
	}
}

/**
 * GetClientNum
 */
function GetClientNum(client) {
	return svs.clients.indexOf(client);
}

/** 
 * UpdateUserinfo
 */
function UpdateUserinfo(client, infostr) {
	client.userinfo = JSON.parse(infostr);
	UserinfoChanged(client);

	// call prog code to allow overrides
	var clientNum = GetClientNum(client);
	gm.ClientUserinfoChanged(clientNum);
}

/**
 * Disconnect
 */
function Disconnect(client) {
	DropClient(client, 'disconnected');
}

/**********************************************************
 *
 * User message/command processing
 *
 **********************************************************/

/**
 * ExecuteClientMessage
 */
function ExecuteClientMessage(client, msg) {
	var serverid = msg.readInt();

	client.messageAcknowledge = msg.readInt();
	if (client.messageAcknowledge < 0) {
		// Usually only hackers create messages like this
		// it is more annoying for them to let them hanging.
		return;
	}

	client.reliableAcknowledge = msg.readInt();
	// NOTE: when the client message is fux0red the acknowledgement numbers
	// can be out of range, this could cause the server to send thousands of server
	// commands which the server thinks are not yet acknowledged in SV_UpdateServerCommandsToClient
	if (client.reliableAcknowledge < client.reliableSequence - MAX_RELIABLE_COMMANDS) {
		// Usually only hackers create messages like this
		// it is more annoying for them to let them hanging.
		client.reliableAcknowledge = client.reliableSequence;
		return;
	}

	// If we can tell that the client has dropped the last
	// gamestate we sent them, resend it.
	if (serverid !== sv_serverid()) {
		if (client.messageAcknowledge > client.gamestateMessageNum) {
			SendClientGameState(client);
		}
		return;
	}

	// This client has acknowledged the new gamestate so it's
	// safe to start sending it the real time again.
	if (client.oldServerTime && serverid === sv_serverid()) {
		client.oldServerTime = 0;
	}

	// Read optional clientCommand strings.
	var type;

	while (true) {
		type = msg.readUnsignedByte();

		if (type === CLM.EOF) {
			break;
		}

		if (type !== CLM.clientCommand) {
			break;
		}

		if (!ClientCommand(client, msg)) {
			return;  // we couldn't execute it because of the flood protection
		}

		if (client.state === CS.ZOMBIE) {
			return;  // disconnect command
		}
	}

	// Read the usercmd_t.
	switch (type) {
		case CLM.move:
			UserMove(client, msg, true);
			break;
		case CLM.moveNoDelta:
			UserMove(client, msg, false);
			break;
	}
}

/**
 * ClientCommand
 */
function ClientCommand(client, msg) {
	var sequence = msg.readInt();
	var str = msg.readCString();

	// See if we have already executed it.
	if (client.lastClientCommand >= sequence) {
		return true;
	}

	// drop the connection if we have somehow lost commands
	if (sequence > client.lastClientCommand + 1 ) {
		//Com_Printf( "Client %s lost %i clientCommands\n", cl->name,  seq - cl->lastClientCommand + 1 );
		DropClient(client, 'Lost reliable commands');
		return false;
	}

	// don't allow another command for one second
	client.nextReliableTime = svs.time + 1000;

	ExecuteClientCommand(client, str);

	client.lastClientCommand = sequence;
	client.lastClientCommandString = str;

	return true; // continue procesing
}

/**
 * ExecuteClientCommand
 */
function ExecuteClientCommand(client, str) {
	// see if it is a server level command
	/*for (u=ucmds ; u->name ; u++) {
		if (!strcmp (Cmd_Argv(0), u->name) ) {
			u->func( cl );
			bProcessed = qtrue;
			break;
		}
	}*/
	if (str.indexOf('userinfo') === 0) {
		UpdateUserInfo(client, str.substr(9));
	} else if (str === 'disconnect') {
		Disconnect(client);
	}

	/*// Pass unknown strings to the game.
	if (!u->name && sv.state == SS_GAME && (cl->state == CS_ACTIVE || cl->state == CS_PRIMED)) {
		Cmd_Args_Sanitize();
		VM_Call( gvm, GAME_CLIENT_COMMAND, cl - svs.clients );
	}*/
}
	/**
 * RegisterCommands
 */
function RegisterCommands() {
	com.AddCmd('map', CmdLoadMap);
	com.AddCmd('sectorlist', CmdSectorList);
}

/**
 * CmdLoadMap
 */
function CmdLoadMap(mapName) {
	SpawnServer(mapName);
}
	/**
 * GentityForNum
 */
function GentityForNum(num) {
	return sv.gameEntities[num];
}

/**
 * SvEntityForGentity
 */
function SvEntityForGentity(gent) {
	var num = gent.s.number;

	if (!gent || num < 0 || num >= MAX_GENTITIES) {
		com.error(sh.Err.DROP, 'SvEntityForSharedEntity: bad game entity');
	}

	return sv.svEntities[num];
}

/**
 * GentityForSvEntity
 */
function GentityForSvEntity(ent) {
	var num = sv.svEntities.indexOf(ent);

	if (!ent || num < 0 || num >= MAX_GENTITIES) {
		com.error(sh.Err.DROP, 'SharedEntityForSvEntity: bad sv entity');
	}

	return GentityForNum(num);
}

/**
 * LocateGameData
 */
function LocateGameData(gameEntities, gameClients) {
	sv.gameEntities = gameEntities;
	sv.gameClients = gameClients;
}

/**
 * GetUserCmd
 */
function GetUserCmd(clientNum, cmd) {
	if (clientNum < 0 || clientNum >= MAX_CLIENTS) {
		com.error(sh.Err.DROP, 'GetUsercmd: bad clientNum: ' + clientNum);
	}

	svs.clients[clientNum].lastUserCmd.clone(cmd);
}

/**
 * SetBrushModel
 */
function SetBrushModel(gent, name) {
	if (!name) {
		com.error(sh.Err.DROP, 'SV: SetBrushModel: null');
	}

	if (name.charAt(0) !== '*') {
		com.error(sh.Err.DROP, 'SV: SetBrushModel: ' + name + 'isn\'t a brush model');
	}

	gent.s.modelIndex = parseInt(name.substr(1), 10);

	var h = cm.InlineModel(gent.s.modelIndex);
	cm.ModelBounds(h, gent.mins, gent.maxs);
	gent.bmodel = true;

	// we don't know exactly what is in the brushes
	gent.contents = -1;
}
	/**
 * BuildClientSnapshot
 * 
 * Decides which entities are going to be visible to the client, and
 * copies off the playerstate and areabits.
 */
function BuildClientSnapshot(client, msg) {
	var clent = client.gentity;
	if (!clent || client.state === CS.ZOMBIE) {
		return false; // Client hasn't entered world yet.
	}

	// Bump the counter used to prevent double adding.
	sv.snapshotCounter++;

	var frame = client.frames[client.netchan.outgoingSequence % PACKET_BACKUP];
	var clientNum = GetClientNum(client);
	var ps = gm.GetClientPlayerstate(clientNum);

	// Copy the current PlayerState off.
	ps.clone(frame.ps);

	// Never send client's own entity, because it can
	// be regenerated from the playerstate.
	var clientNum = frame.ps.clientNum;
	var svEnt = sv.svEntities[clientNum];
	svEnt.snapshotCounter = sv.snapshotCounter;

	var entityNumbers = [];
	AddEntitiesVisibleFromPoint(frame.ps.origin, frame, entityNumbers, false);

	frame.numEntities = 0;
	frame.firstEntity = svs.nextSnapshotEntities;

	// Copy the entity states out.
	for (var i = 0; i < entityNumbers.length; i++) {
		var ent = GentityForNum(entityNumbers[i]);
		var state = svs.snapshotEntities[svs.nextSnapshotEntities % MAX_SNAPSHOT_ENTITIES];

		ent.s.clone(state);
		svs.nextSnapshotEntities++;
		frame.numEntities++;
	}

	return true;
}

/**
 * AddEntitiesVisibleFromPoint
 */
function AddEntitiesVisibleFromPoint(origin, frame, eNums, portal) {
	/*leafnum = cm.PointLeafnum (origin);
	clientarea = cm.LeafArea (leafnum);
	clientcluster = cm.LeafCluster (leafnum);

	// calculate the visible areas
	frame->areabytes =cm.WriteAreaBits( frame->areabits, clientarea );

	clientpvs = cm.ClusterPVS (clientcluster);*/

	for (var i = 0; i < MAX_GENTITIES; i++) {
		var ent = GentityForNum(i);

		// Never send entities that aren't linked in.
		if (!ent || !ent.linked) {
			continue;
		}

		if (ent.s.number !== i) {
			com.error(sh.Err.DROP, 'Entity number does not match.. WTF');
			/*log('FIXING ENT->S.NUMBER!!!');
			ent.s.number = e;*/
		}

		// Entities can be flagged to explicitly not be sent to the client.
		if (ent.svFlags & SVF.NOCLIENT) {
			continue;
		}

		// Entities can be flagged to be sent to only one client.
		if (ent.svFlags & SVF.SINGLECLIENT) {
			if (ent.singleClient != frame.ps.clientNum) {
				continue;
			}
		}
		// Entities can be flagged to be sent to everyone but one client.
		if (ent.svFlags & SVF.NOTSINGLECLIENT) {
			if (ent.singleClient === frame.ps.clientNum) {
				continue;
			}
		}

		var svEnt = SvEntityForGentity(ent);

		// Don't double add an entity through portals.
		if (svEnt.snapshotCounter === sv.snapshotCounter) {
			continue;
		}

		// Broadcast entities are always sent.
		if (ent.svFlags & SVF.BROADCAST) {
			AddEntToSnapshot(svEnt, ent, eNums);
			continue;
		}

		// // Ignore if not touching a PV leaf.
		// // Check area.
		// if ( !CM_AreasConnected( clientarea, svEnt->areanum ) ) {
		// 	// doors can legally straddle two areas, so
		// 	// we may need to check another one
		// 	if ( !CM_AreasConnected( clientarea, svEnt->areanum2 ) ) {
		// 		continue;		// blocked by a door
		// 	}
		// }

		// bitvector = clientpvs;

		// // Check individual leafs.
		// if ( !svEnt->numClusters ) {
		// 	continue;
		// }
		// l = 0;
		// for ( i=0 ; i < svEnt->numClusters ; i++ ) {
		// 	l = svEnt->clusternums[i];
		// 	if ( bitvector[l >> 3] & (1 << (l&7) ) ) {
		// 		break;
		// 	}
		// }

		// // If we haven't found it to be visible,
		// // check overflow clusters that coudln't be stored.
		// if ( i == svEnt->numClusters ) {
		// 	if ( svEnt->lastCluster ) {
		// 		for ( ; l <= svEnt->lastCluster ; l++ ) {
		// 			if ( bitvector[l >> 3] & (1 << (l&7) ) ) {
		// 				break;
		// 			}
		// 		}
		// 		if ( l == svEnt->lastCluster ) {
		// 			continue;	// not visible
		// 		}
		// 	} else {
		// 		continue;
		// 	}
		// }

		// Add it.
		AddEntToSnapshot(svEnt, ent, eNums);

		// // If it's a portal entity, add everything visible from its camera position.
		// if (ent.r.svFlags & SVF_PORTAL) {
		// 	if (ent.s.generic1) {
		// 		var dir = vec3.subtract(ent.s.origin, origin, [0, 0, 0]);

		// 		if (VectorLengthSquared(dir) > (float) ent->s.generic1 * ent->s.generic1) {
		// 			continue;
		// 		}
		// 	}
			
		// 	AddEntitiesVisibleFromPoint( ent->s.origin2, frame, eNums, qtrue );
		// }
	}
}

/**
 * AddEntToSnapshot
 */
function AddEntToSnapshot(svEnt, gEnt, eNums) {
	// If we have already added this entity to this snapshot, don't add again.
	if (svEnt.snapshotCounter === sv.snapshotCounter) {
		return;
	}

	svEnt.snapshotCounter = sv.snapshotCounter;

	eNums.push(gEnt.s.number);
}

/**
 * SendClientSnapshot
 */
function SendClientSnapshot(client) {
	// Build the snapshot.
	if (!BuildClientSnapshot(client)) {
		return;
	}

	var msg = new ByteBuffer(svs.msgBuffer, ByteBuffer.LITTLE_ENDIAN);

	msg.writeInt(client.lastClientCommand);

	// Send any reliable server commands.
	UpdateServerCommandsToClient(client, msg);

	// Send over all the relevant player and entity states.
	WriteSnapshotToClient(client, msg);

	com.NetchanSend(client.netchan, msg.buffer, msg.index);
}

/**
 * UpdateServerCommandsToClient
 *
 * (re)send all server commands the client hasn't acknowledged yet.
 */
function UpdateServerCommandsToClient(client, msg) {
	// Write any unacknowledged serverCommands.
	for (var i = client.reliableAcknowledge + 1; i <= client.reliableSequence; i++) {
		var cmd = client.reliableCommands[i % MAX_RELIABLE_COMMANDS];
		
		msg.writeByte(SVM.serverCommand);
		msg.writeInt(i);
		msg.writeCString(cmd.type);
		msg.writeCString(JSON.stringify(cmd.value));
	}
}

/**
 * WriteSnapshotToClient
 */
function WriteSnapshotToClient(client, msg) {
	// This is the snapshot we are creating.
	var frame = client.frames[client.netchan.outgoingSequence % PACKET_BACKUP];
	var oldframe = null;
	var lastframe = 0;

	// Try to use a previous frame as the source for delta compressing the snapshot.
	if (client.deltaMessage <= 0 || client.state !== CS.ACTIVE) {
		// Client is asking for a retransmit.
		oldframe = null;
		lastframe = 0;
	} else if (client.netchan.outgoingSequence - client.deltaMessage >= (PACKET_BACKUP - 3)) {
		// Client hasn't gotten a good message through in a long time.
		log(client.name, ': Delta request from out of date packet.');
		oldframe = null;
		lastframe = 0;
	} else {
		// We have a valid snapshot to delta from
		oldframe = client.frames[client.deltaMessage % PACKET_BACKUP];
		lastframe = client.netchan.outgoingSequence - client.deltaMessage;

		// The snapshot's entities may still have rolled off the buffer, though.
		if (oldframe.firstEntity <= svs.nextSnapshotEntities - svs.numSnapshotEntities) {
			log(client.name, ': Delta request from out of date entities.');
			oldframe = null;
			lastframe = 0;
		}
	}
	
	msg.writeUnsignedByte(SVM.snapshot);

	// Send over the current server time so the client can drift
	// its view of time to try to match.
	var serverTime = sv.time;
	if (client.oldServerTime) {
		// The server has not yet got an acknowledgement of the
		// new gamestate from this client, so continue to send it
		// a time as if the server has not restarted. Note from
		// the client's perspective this time is strictly speaking
		// incorrect, but since it'll be busy loading a map at
		// the time it doesn't really matter.
		serverTime = sv.time + client.oldServerTime;
	}
	msg.writeInt(serverTime);

	// What we're delta'ing from.
	msg.writeByte(lastframe);

	var snapFlags = svs.snapFlagServerBit;
	if (client.state !== CS.ACTIVE) {
		snapFlags |= SNAPFLAG_NOT_ACTIVE;
	}
	msg.writeInt(snapFlags);

	// Delta encode the playerstate.
	sh.WriteDeltaPlayerState(msg, oldframe ? oldframe.ps : null, frame.ps);

	// Delta encode the entities.
	WriteSnapshotEntities(msg, oldframe, frame);
}

/**
 * WriteSnapshotEntities
 */
function WriteSnapshotEntities(msg, from, to) {
	var oldent, newent;
	var oldindex, newindex;
	var oldnum, newnum;
	var fromNumEntities

	// Generate the delta update.
	fromNumEntities = !from ? 0 : from.numEntities;

	oldent = null;
	newent = null;
	oldindex = 0;
	newindex = 0;

	while (newindex < to.numEntities || oldindex < fromNumEntities) {
		if (newindex >= to.numEntities) {
			newnum = 9999;
		} else {
			newent = svs.snapshotEntities[(to.firstEntity + newindex) % MAX_SNAPSHOT_ENTITIES];
			newnum = newent.number;
		}

		if (oldindex >= fromNumEntities) {
			oldnum = 9999;
		} else {
			oldent = svs.snapshotEntities[(from.firstEntity + oldindex) % MAX_SNAPSHOT_ENTITIES];
			oldnum = oldent.number;
		}

		if (newnum === oldnum) {
			// Delta update from old position.
			// Because the force parm is false, this will not result
			// in any bytes being emited if the entity has not changed at all.
			sh.WriteDeltaEntityState(msg, oldent, newent, false);
			oldindex++;
			newindex++;
			continue;
		}
		
		if (newnum < oldnum) {
			// This is a new entity, send it from the baseline.
			sh.WriteDeltaEntityState(msg, sv.svEntities[newnum].baseline, newent, true);
			newindex++;
			continue;
		}

		if (newnum > oldnum) {
			// The old entity isn't present in the new message.
			sh.WriteDeltaEntityState(msg, oldent, null, true);
			oldindex++;
			continue;
		}
	}

	msg.writeShort(MAX_GENTITIES-1);
}

/**
 * SendClientMessages
 */
function SendClientMessages() {
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (!client) {
			continue;
		}
		
		if (!client.state) {
			continue; // not connected
		}

		if (svs.time - client.lastSnapshotTime < client.snapshotMsec) {
			continue; // it's not time yet
		}

		SendClientSnapshot(client);
		client.lastSnapshotTime = svs.time;
	}
}
	/**
 * ENTITY CHECKING
 *
 * To avoid linearly searching through lists of entities during environment testing,
 * the world is carved up with an evenly spaced, axially aligned bsp tree.  Entities
 * are kept in chains either at the final leafs, or at the first node that splits
 * them, which prevents having to deal with multiple fragments of a single entity.
 */

var AREA_DEPTH = 4;
var worldSectors;

var WorldSector = function () {
	this.axis = 0; // -1 = leaf node
	this.dist = 0;
	this.children = [null, null];
	this.entities = {};
};

/**
 * CmdSectorList
 */
function CmdSectorList() {
	for (var i = 0; i < worldSectors.length; i++) {
		var node = worldSectors[i];
		log('sector ' + i + ': ' + _.keys(node.entities).length + ' entities');
	}
}

/**
 * ClearWorld
 */
function ClearWorld() {
	worldSectors = [];

	// get world map bounds
	var worldModel = cm.InlineModel(0);
	var mins = [0, 0, 0];
	var maxs = [0, 0, 0];
	cm.ModelBounds(worldModel, mins, maxs);

	CreateWorldSector(0, mins, maxs);
}

/**
 * CreateWorldSector
 *
 * Builds a uniformly subdivided tree for the given world size
 */
function CreateWorldSector(depth, mins, maxs) {
	var node = worldSectors[worldSectors.length] = new WorldSector();

	if (depth === AREA_DEPTH) {
		node.axis = -1;
		node.children[0] = node.children[1] = null;
		return node;
	}
	
	var size = vec3.subtract(maxs, mins, [0, 0, 0]);
	if (size[0] > size[1]) {
		node.axis = 0;
	} else {
		node.axis = 1;
	}

	var mins1 = vec3.set(mins, [0, 0, 0]);
	var mins2 = vec3.set(mins, [0, 0, 0]);
	var maxs1 = vec3.set(maxs, [0, 0, 0]);
	var maxs2 = vec3.set(maxs, [0, 0, 0]);

	node.dist = 0.5 * (maxs[node.axis] + mins[node.axis]);
	maxs1[node.axis] = mins2[node.axis] = node.dist;
	
	node.children[0] = CreateWorldSector(depth+1, mins2, maxs2);
	node.children[1] = CreateWorldSector(depth+1, mins1, maxs1);

	return node;
}

/**
 * LinkEntity
 */
function LinkEntity(gent) {
	var ent = SvEntityForGentity(gent);

	if (ent.worldSector) {
		UnlinkEntity(gent);  // unlink from old position
	}

	// Encode the size into the entityState for client prediction.
	if (gent.bmodel) {
		gent.s.solid = SOLID_BMODEL; // a solid_box will never create this value
	} else if (gent.contents & (CONTENTS.SOLID | CONTENTS.BODY)) {
		// Assume that x/y are equal and symetric.
		var i = gent.maxs[0];
		if (i < 1) {
			i = 1;
		} else if (i > 255) {
			i = 255;
		}

		// z is not symetric.
		var j = (-gent.mins[2]);
		if (j < 1) {
			j = 1;
		} else if (j > 255) {
			j = 255;
		}

		// And z maxs can be negative...
		var k = (gent.maxs[2] + 32);
		if (k < 1) {
			k = 1;
		} else if (k > 255) {
			k = 255;
		}

		gent.s.solid = (k << 16) | (j << 8) | i;
	} else {
		gent.s.solid = 0;
	}

	// Get the position.
	var origin = gent.currentOrigin;
	var angles = gent.currentAngles;

	// Set the abs box.
	if (gent.bmodel && (angles[0] || angles[1] || angles[2])) {
		var max = qm.RadiusFromBounds(gent.mins, gent.maxs);
		for (var i = 0; i < 3; i++) {
			gent.absmin[i] = origin[i] - max;
			gent.absmax[i] = origin[i] + max;
		}
	} else {
		// Normal
		vec3.add(origin, gent.mins, gent.absmin);
		vec3.add(origin, gent.maxs, gent.absmax);
	}

	// Because movement is clipped an epsilon away from an actual edge,
	// we must fully check even when bounding boxes don't quite touch.
	gent.absmin[0] -= 1;
	gent.absmin[1] -= 1;
	gent.absmin[2] -= 1;
	gent.absmax[0] += 1;
	gent.absmax[1] += 1;
	gent.absmax[2] += 1;

	/*// link to PVS leafs
	ent.numClusters = 0;
	ent.lastCluster = 0;
	ent.areanum = -1;
	ent.areanum2 = -1;

	// get all leafs, including solids
	num_leafs = CM_BoxLeafnums( gent.r.absmin, gent.r.absmax,
		leafs, MAX_TOTAL_ENT_LEAFS, &lastLeaf );

	// if none of the leafs were inside the map, the
	// entity is outside the world and can be considered unlinked
	if (!num_leafs) {
		return;
	}

	// set areas, even from clusters that don't fit in the entity array
	for (var i = 0; i < num_leafs; i++) {
		var area = CM_LeafArea(leafs[i]);

		if (area === -1) {
			continue;
		}

		// doors may legally straggle two areas,
		// but nothing should ever need more than that
		if (ent.areanum !== -1 && ent.areanum != area) {
			ent.areanum2 = area;
		} else {
			ent.areanum = area;
		}
	}

	// store as many explicit clusters as we can
	ent.numClusters = 0;

	for (var i = 0; i < num_leafs; i++) {
		var cluster = CM_LeafCluster(leafs[i]);

		if (cluster === -1) {
			continue;
		}

		ent.clusternums[ent.numClusters++] = cluster;

		if (ent.numClusters == MAX_ENT_CLUSTERS) {
			break;
		}
	}

	// store off a last cluster if we need to
	if (i !== num_leafs) {
		ent.lastCluster = CM_LeafCluster( lastLeaf );
	}*/

	// Find the first world sector node that the ent's box crosses.
	var node = worldSectors[0];

	while (1) {
		if (node.axis == -1) {
			break;
		}

		if (gent.absmin[node.axis] > node.dist) {
			node = node.children[0];
		}
		else if (gent.absmax[node.axis] < node.dist) {
			node = node.children[1];
		}
		else {
			break; // crosses the node
		}
	}
	
	// Link it in.
	gent.linked = true;
	ent.worldSector = node;
	node.entities[gent.s.number] = ent;
}

/**
 * UnlinkEntity
 */
function UnlinkEntity(gent) {
	var ent = SvEntityForGentity(gent);
	var node = ent.worldSector;

	if (!node) {
		return;  // not linked in anywhere
	}

	// Unlink.
	gent.linked = false;
	delete node.entities[gent.s.number];
	ent.worldSector = null;
}

/**********************************************************
 *
 * Area query
 *
 * Fills in a list of all entities who's absmin / absmax
 * intersects the given bounds. This does NOT mean that
 * they actually touch in the case of bmodels.
 *
 **********************************************************/

/**
 * FindEntitiesInBox
 */
function FindEntitiesInBox(mins, maxs) {
	var entityNums = [];

	var FindEntitiesInBox_r = function (node) {
		for (var num in node.entities) {
			if (!node.entities.hasOwnProperty(num)) {
				continue;
			}

			var ent = node.entities[num];
			var gent = GentityForSvEntity(ent);
			
			if (gent.absmin[0] > maxs[0] ||
				gent.absmin[1] > maxs[1] ||
				gent.absmin[2] > maxs[2] ||
				gent.absmax[0] < mins[0] ||
				gent.absmax[1] < mins[1] ||
				gent.absmax[2] < mins[2]) {
				continue;
			}

			entityNums.push(gent.s.number);
		}
		
		if (node.axis == -1) {
			return; // terminal node
		}

		// Recurse down both sides.
		if (maxs[node.axis] > node.dist) {
			FindEntitiesInBox_r(node.children[0]);
		}
		if (mins[node.axis] < node.dist ) {
			FindEntitiesInBox_r(node.children[1]);
		}
	};

	FindEntitiesInBox_r(worldSectors[0]);

	return entityNums;
}

/**********************************************************
 *
 * Trace through the world and entities
 *
 **********************************************************/
var moveclip = function () {
	this.boxmins       = [0, 0, 0];                        // enclose the test object along entire move
	this.boxmaxs       = [0, 0, 0];
	this.mins          = [0, 0, 0];
	this.maxs          = [0, 0, 0];
	this.start         = [0, 0, 0];
	this.end           = [0, 0, 0];
	this.trace         = null;
	this.passEntityNum = 0;
	this.contentmask   = 0;
	this.capsule       = 0;
};
var clip = new moveclip();

/**
 * Trace
 *
 * Moves the given mins/maxs volume through the world from start to end.
 * passEntityNum and entities owned by passEntityNum are explicitly not checked.
 */
function Trace(start, end, mins, maxs, passEntityNum, contentmask, capsule) {
	if (!mins) {
		mins = [0, 0, 0];
	}
	if (!maxs) {
		maxs = [0, 0, 0];
	}

	// Clip to world.
	clip.trace = cm.BoxTrace(start, end, mins, maxs, 0, contentmask, capsule);
	clip.trace.entityNum = clip.trace.fraction !== 1.0 ? ENTITYNUM_WORLD : ENTITYNUM_NONE;
	if (clip.trace.fraction === 0) {
		return clip.trace;  // blocked immediately by the world
	}

	clip.contentmask = contentmask;
	vec3.set(start, clip.start);
	vec3.set(end, clip.end);
	vec3.set(mins, clip.mins);
	vec3.set(maxs, clip.maxs);
	clip.passEntityNum = passEntityNum;
	clip.capsule = capsule;

	// Create the bounding box of the entire move.
	// We can limit it to the part of the move not
	// already clipped off by the world, which can be
	// a significant savings for line of sight and shot traces.
	for (var i = 0; i < 3; i++) {
		if (end[i] > start[i]) {
			clip.boxmins[i] = clip.start[i] + clip.mins[i] - 1;
			clip.boxmaxs[i] = clip.end[i] + clip.maxs[i] + 1;
		} else {
			clip.boxmins[i] = clip.end[i] + clip.mins[i] - 1;
			clip.boxmaxs[i] = clip.start[i] + clip.maxs[i] + 1;
		}
	}

	// Clip to other solid entities.
	ClipMoveToEntities(clip);

	return clip.trace;
}

/**
 * ClipMoveToEntities
 */
function ClipMoveToEntities(clip) {
	var origin = [0, 0, 0];
	var angles = [0, 0, 0];
	var passOwnerNum = -1;

	var touchlist = FindEntitiesInBox(clip.boxmins, clip.boxmaxs);

	if (clip.passEntityNum !== ENTITYNUM_NONE) {
		passOwnerNum = (GentityForNum(clip.passEntityNum)).ownerNum;
		if (passOwnerNum === ENTITYNUM_NONE) {
			passOwnerNum = -1;
		}
	}

	for (var i = 0; i < touchlist.length; i++) {
		if (clip.trace.allSolid) {
			return;
		}

		var touch = GentityForNum(touchlist[i]);

		// See if we should ignore this entity.
		if (clip.passEntityNum !== ENTITYNUM_NONE) {
			if (touchlist[i] === clip.passEntityNum) {
				continue;  // don't clip against the pass entity
			}
			if (touch.ownerNum === clip.passEntityNum) {
				continue;  // don't clip against own missiles
			}
			if (touch.ownerNum === passOwnerNum) {
				continue;  // don't clip against other missiles from our owner
			}
		}

		// If it doesn't have any brushes of a type we
		// are looking for, ignore it.
		if (!(clip.contentmask & touch.contents)) {
			continue;
		}

		// Might intersect, so do an exact clip.
		var clipHandle = ClipHandleForEntity(touch);

		vec3.set(touch.currentOrigin, origin);
		vec3.set(touch.currentAngles, angles);
		if (!touch.bmodel) {
			angles[0] = angles[1] = angles[2] = 0;  // boxes don't rotate
		}

		var trace = cm.TransformedBoxTrace(clip.start, clip.end, clip.mins, clip.maxs,
			clipHandle, clip.contentmask, origin, angles, clip.capsule);

		if (trace.allSolid) {
			clip.trace.allSolid = true;
			trace.entityNum = touch.s.number;
		} else if (trace.startSolid) {
			clip.trace.startSolid = true;
			trace.entityNum = touch.s.number;
		}

		if (trace.fraction < clip.trace.fraction) {
			// Make sure we keep a startSolid from a previous trace.
			var oldStart = clip.trace.startSolid;

			trace.entityNum = touch.s.number;
			clip.trace = trace;
			clip.trace.startSolid |= oldStart;
		}
	}
}

/**
 * ClipHandleForEntity
 *
 * Returns a headnode that can be used for testing or clipping to a
 * given entity. If the entity is a bsp model, the headnode will
 * be returned, otherwise a custom box tree will be constructed.
 */
function ClipHandleForEntity(ent) {
	if (ent.bmodel ) {
		// Explicit hulls in the BSP model.
		return cm.InlineModel(ent.s.modelIndex);
	}
	// if (ent.svFlags & SVF.CAPSULE) {
	// 	// Create a temp capsule from bounding box sizes.
	// 	return cm.TempBoxModel(ent.mins, ent.maxs, true);
	// }

	// Create a temp tree from bounding box sizes.
	return cm.TempBoxModel(ent.mins, ent.maxs, false);
}


	return {
		Init:             Init,
		Frame:            Frame,
		PacketEvent:      PacketEvent,
		SocketClosed:     SocketClosed
	};
});

/*global vec3: true, mat4: true */

define('common/com',
['underscore', 'ByteBuffer', 'common/sh', 'server/sv', 'client/cl'],
function (_, ByteBuffer, sh, sv, cl) {
	var BASE_FOLDER = 'baseq3';
var MAX_QPATH   = 64;
var CMD_BACKUP  = 64;

// If entityState.solid === SOLID_BMODEL, modelIndex is an inline model number
var SOLID_BMODEL = 0xffffff;

/**
 * Cvar flags
 */
var CVF = {
	ARCHIVE:    0x0001,                                    // save to config file
	USERINFO:   0x0002,                                    // sent to server on connect or change
	SERVERINFO: 0x0004,                                    // sent in response to front end requests
	SYSTEMINFO: 0x0008                                     // these cvars will be duplicated on all clients
};

/**
 * Renderer (should be moved)
 */
var MAX_DRAWSURFS  = 0x10000;

/**
 * Snapshot flags
 */
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

/**
 * MAX_* defines used to pre-alloc many structures
 */
var GENTITYNUM_BITS         = 10;
var MAX_CLIENTS             = 32;                          // absolute limit
var MAX_GENTITIES           = (1 << 10);                   // can't be increased without changing drawsurf bit packing
var MAX_MODELS              = 256;                         // these are sent over the net as 8 bits
var MAX_SOUNDS              = 256;                         // so they cannot be blindly increased

/**
 * Faux entity numbers
 */
var ENTITYNUM_NONE          = MAX_GENTITIES-1;
var ENTITYNUM_WORLD         = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL    = MAX_GENTITIES-2;

var MOVE_RUN = 120;                                        // if forwardmove or rightmove are >= MOVE_RUN,
	                                                       // then BUTTON_WALKING should be set

/**
 * Playerstate
 */
var MAX_STATS               = 16;
var MAX_PERSISTANT          = 16;
var MAX_POWERUPS            = 16;
var MAX_WEAPONS             = 16;
var MAX_PS_EVENTS           = 2;
var PMOVEFRAMECOUNTBITS     = 6;

var BUTTON = {
	ATTACK:       1,
	TALK:         2,                                       // displays talk balloon and disables actions
	USE_HOLDABLE: 4,
	GESTURE:      8,
	WALKING:      16,                                      // walking can't just be infered from MOVE_RUN
	                                                       // because a key pressed late in the frame will
	                                                       // only generate a small move value for that frame
	                                                       // walking will use different animations and
	                                                       // won't generate footsteps
	AFFIRMATIVE:  32,
	NEGATIVE:     64,
	GETFLAG:      128,
	GUARDBASE:    256,
	PATROL:       512,
	FOLLOWME:     1024,
	ANY:          2048                                     // any key whatsoever
};

var TR = {
	STATIONARY:  0,
	INTERPOLATE: 1,                              // non-parametric, but interpolate between snapshots
	LINEAR:      2,
	LINEAR_STOP: 3,
	SINE:        4,                              // value = base + sin( time / duration ) * delta
	GRAVITY:     5
};

var SURF = {
	NODAMAGE:    0x1,                            // never give falling damage
	SLICK:       0x2,                            // effects game physics
	SKY:         0x4,                            // lighting from environment map
	LADDER:      0x8,
	NOIMPACT:    0x10,                           // don't make missile explosions
	NOMARKS:     0x20,                           // don't leave missile marks
	FLESH:       0x40,                           // make flesh sounds and effects
	NODRAW:      0x80,                           // don't generate a drawsurface at all
	HINT:        0x100,                          // make a primary bsp splitter
	SKIP:        0x200,                          // completely ignore, allowing non-closed brushes
	NOLIGHTMAP:  0x400,                          // surface doesn't need a lightmap
	POINTLIGHT:  0x800,                          // generate lighting info at vertexes
	METALSTEPS:  0x1000,                         // clanking footsteps
	NOSTEPS:     0x2000,                         // no footstep sounds
	NONSOLID:    0x4000,                         // don't collide against curves with this set
	LIGHTFILTER: 0x8000,                         // act as a light filter during q3map -light
	ALPHASHADOW: 0x10000,                        // do per-pixel light shadow casting in q3map
	NODLIGHT:    0x20000,                        // don't dlight even if solid (solid lava, skies)
	DUST:        0x40000                         // leave a dust trail when walking on this surface
};

var CONTENTS = {
	SOLID:         1,                                      // an eye is never valid in a solid
	LAVA:          8,
	SLIME:         16,
	WATER:         32,
	FOG:           64,

	NOTTEAM1:      0x0080,
	NOTTEAM2:      0x0100,
	NOBOTCLIP:     0x0200,

	AREAPORTAL:    0x8000,

	PLAYERCLIP:    0x10000,
	MONSTERCLIP:   0x20000,
	TELEPORTER:    0x40000,
	JUMPPAD:       0x80000,
	CLUSTERPORTAL: 0x100000,
	DONOTENTER:    0x200000,
	BOTCLIP:       0x400000,
	MOVER:         0x800000,

	ORIGIN:        0x1000000,                              // removed before bsping an entity

	BODY:          0x2000000,                              // should never be on a brush, only in game
	CORPSE:        0x4000000,
	DETAIL:        0x8000000,                              // brushes not used for the bsp
	STRUCTURAL:    0x10000000,                             // brushes used for the bsp
	TRANSLUCENT:   0x20000000,                             // don't consume surface fragments inside
	TRIGGER:       0x40000000,
	NODROP:        0x80000000                              // don't leave bodies or items (death fog, lava)
};
	var MAX_MAP_AREA_BYTES = 32;                     // bit vector of area visibility

/**
 * System events
 */
var SE = {
	CLMSG:       0,
	SVMSG:       1,
	SVSOCKCLOSE: 2,
	KEY:         3,
	MOUSE:       4
};

/**
 * Networking
 */
var PACKET_BACKUP         = 32;                  // number of old messages that must be kept on client and
                                                 // server for delta comrpession and ping estimation
var MAX_PACKET_USERCMDS   = 32;                  // max number of usercmd_t in a packet
var MAX_RELIABLE_COMMANDS = 64;                  // max string commands buffered for restransmit
var MAX_MSGLEN            = 16384;

var CLM = {
	bad:           0,
	move:          1,                            // [[UserCmd]
	moveNoDelta:   2,                            // [[UserCmd]
	clientCommand: 3,                            // [string] message
	EOF:           4
};

var SVM = {
	bad:            0,
	gamestate:      1,
	configstring:   2,                           // [short] [string] only in gamestate messages
	baseline:       3,                           // only in gamestate messages
	serverCommand:  4,                           // [string] to be executed by client game module
	snapshot:       5,
	EOF:            6
};
	/**********************************************************
 * Definitions common between client and server, but not
 * game or render modules.
 **********************************************************/

/**
 * Networking
 */
var NetChan = function () {
	this.src              = 0;
	this.remoteAddress    = null;
	this.socket           = null;
	this.incomingSequence = 0;
	this.outgoingSequence = 0;
};
	var commands = {};

/**
 * InitCmd
 */
function InitCmd() {
	AddCmd('exec', CmdExec);
	AddCmd('+debugtest', function () { window.debugtest = true; });
	AddCmd('-debugtest', function () { window.debugtest = false; });
}

/**
 * AddCmd
 */
function AddCmd(cmd, callback) {
	commands[cmd] = callback;
}

/**
 * GetCmd
 */
function GetCmd(cmd) {
	return commands[cmd];
}

/**
 * CmdExec
 */
function CmdExec(filename) {
	if (!filename) {
		console.log('Enter a filename to execeute.')
		return;
	}

	sys.ReadFile(filename, 'utf8', function (err, data) {
		if (err) {
			console.warn('Failed to execute \'' + filename + '\'');
			return;
		}

		// Trim data.
		data = data.replace(/^\s+|\s+$/g, '');

		// Split by newline.
		var lines = data.split(/\r\n|\r|\n/);

		for (var i = 0; i < lines.length; i++) {
			ExecuteCmdText(lines[i]);
		}
	});
}
	var cvars = {};
var cvar_modifiedFlags = 0;

/**
 * Cvar
 */
var Cvar = function (defaultValue, flags) {
	var currentValue = defaultValue;
	var cvar = function (newValue) {
		if (arguments.length) {
			var oldValue = currentValue;

			// If newValue looks like a number, convert it.
			// This is quite the hack, see:
			// http://stackoverflow.com/questions/175739/is-there-a-built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
			if (!isNaN(newValue)) {
				// At this point, newValue could be '12.345' or 12.345.
				// Using +newValue will automatically convert either into
				// their proper numerical type.
				currentValue = +newValue;
			} else {
				currentValue = newValue;
			}

			cvar_modifiedFlags |= cvar.flags;

			cvar.modified = true;
		} else {
			return currentValue;
		}
	};

	cvar.defaultValue = defaultValue;
	cvar.flags = flags;
	cvar.modified = false;

	return cvar;
};

/**
 * InitCvar
 */
function InitCvar() {
	AddCmd('set', CmdSet);
	AddCmd('unset', CmdUnset);
}

/**
 * CmdSet
 */
function CmdSet(name, value) {
	var cvar = AddCvar(name);
	cvar(value);
}

/**
 * CmdUnset
 */
function CmdUnset(name, value) {
	var cvar = AddCvar(name);
	cvar(cvar.defaultValue);
}

/**
 * CmdCvar
 *
 * Not a registered command, but called by ExecuteCmdText.
 */
function CmdCvar(name, value) {
	var cvar = FindCvar(name);

	if (!cvar) {
		return;
	}

	// If a value wasn't specified, print out info.
	if (typeof(value) === 'undefined') {
		PrintCvar(name);
		return;
	}

	// Otherwise, set the value.
	CmdSet(name, value);
}

/**
 * AddCvar
 */
function AddCvar(name, defaultValue, flags) {
	var cvar = cvars[name];

	if (cvar) {
		// If the user already created a cvar, update its default value and OR
		// the new flags.
		if (typeof(defaultValue) !== 'undefined') {
			cvar.defaultValue = defaultValue;
		}

		if (typeof(flags) !== 'undefined') {
			cvar.flags |= flags;
		}

		return cvar;
	}

	// Register the new cvar.
	cvar = cvars[name] = new Cvar(defaultValue || 0, flags || 0);

	return cvar;
}

/**
 * FindCvar
 */
function FindCvar(name) {
	return cvars[name];
}

/**
 * GetCvarVal
 */
function GetCvarVal(name) {
	var cvar = cvars[name];

	if (!cvar) {
		console.warn('COM: No cvar found for \'' + name + '\'');
		return null;
	}

	return cvar();
}

/**
 * SetCvarVal
 */
function SetCvarVal(name, value) {
	var cvar = cvars[name];

	if (!cvar) {
		console.warn('COM: No cvar found for \'' + name + '\'');
		return;
	}

	cvar(value);
}

/**
 * PrintCvar
 *
 * Prints the value, default, and latched string of the given variable.
 */
function PrintCvar(name) {
	var cvar = FindCvar(name);
	log(name, 'is:', cvar(), ', default:', cvar.defaultValue);
}

/**
 * GetCvarValues
 */
function GetCvarValues(flag) {
	var data = {};
	
	for (var name in cvars) {
		if (!cvars.hasOwnProperty(name)) {
			continue;
		}

		var cvar = cvars[name];

		if (!(cvar.flags & flag)) {
			continue;
		}

		data[name] = cvar();
	}

	return data;
}

/**
 * WriteCvars
 */
function WriteCvars(str) {
	for (var name in cvars) {
		if (!cvars.hasOwnProperty(name)) {
			continue;
		}

		var cvar = cvars[name];

		if (!(cvar.flags & CVF.ARCHIVE)) {
			continue;
		}

		str += 'set ' + name + ' ' + cvar() + '\n';
	}

	return str;
}
	var sys;

var dedicated = false;
var events;
var frameTime;
var lastFrameTime;
var initialized = false;

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'COM:');
	Function.apply.call(console.log, console, args);
}

/**
 * error
 */
function error(level, str) {
	// if (level === sh.Err.DROP) {
	// 	console.error('Server crashed: ' + str);
	// 	sv.Shutdown();
	// 	cl.Disconnect();
	// } else {
		throw new Error(str);
	// }
}

/**
 * Init
 */
function Init(sysinterface, isdedicated) {
	sys = sysinterface;
	dedicated = isdedicated;
	events = [];
	frameTime = lastFrameTime = sys.GetMilliseconds();

	InitCvar();
	InitCmd();
	
	sv.Init(sys, GetExports(), dedicated);

	if (!dedicated) {
		cl.Init(sys, GetExports());
	}

	LoadConfig();

	// If any archived cvars are modified after this, we will trigger a
	// writing of the config file.
	cvar_modifiedFlags &= ~CVF.ARCHIVE;

	initialized = true;
}

/**
 * GetExports
 */
function GetExports() {
	return {
		error:            error,
		frameTime:        function() { return frameTime; },
		ExecuteCmdText:   ExecuteCmdText,
		LoadConfig:       LoadConfig,
		SaveConfig:       SaveConfig,
		AddCvar:          AddCvar,
		GetCvarVal:       GetCvarVal,
		SetCvarVal:       SetCvarVal,
		GetCvarValues: GetCvarValues,
		AddCmd:           AddCmd,
		GetCmd:           GetCmd,
		NetchanSetup:     NetchanSetup,
		NetchanDestroy:   NetchanDestroy,
		NetchanSend:      NetchanSend,
		NetchanPrint:     NetchanPrint,
		NetchanProcess:   NetchanProcess
	};
}

/**
 * Frame
 */
function Frame() {
	lastFrameTime = frameTime;
	frameTime = sys.GetMilliseconds();

	var msec = frameTime - lastFrameTime;

	CheckSaveConfig();
	EventLoop();

	sv.Frame(msec);
	if (!dedicated) {
		cl.Frame(msec);
	}
}

// function Error(code, msg) {
// 	va_list		argptr;
// 	static int	lastErrorTime;
// 	static int	errorCount;
// 	int			currentTime;

// 	if(com_errorEntered)
// 		Sys_Error("recursive error after: %s", com_errorMessage);

// 	com_errorEntered = qtrue;

// 	Cvar_Set("com_errorCode", va("%i", code));

// 	// if we are getting a solid stream of ERR_DROP, do an ERR_FATAL
// 	currentTime = Sys_Milliseconds();
// 	if ( currentTime - lastErrorTime < 100 ) {
// 		if ( ++errorCount > 3 ) {
// 			code = ERR_FATAL;
// 		}
// 	} else {
// 		errorCount = 0;
// 	}
// 	lastErrorTime = currentTime;

// 	va_start (argptr,fmt);
// 	Q_vsnprintf (com_errorMessage, sizeof(com_errorMessage),fmt,argptr);
// 	va_end (argptr);

// 	if (code != ERR_DISCONNECT && code != ERR_NEED_CD)
// 		Cvar_Set("com_errorMessage", com_errorMessage);

// 	if (code == ERR_DISCONNECT || code == ERR_SERVERDISCONNECT) {
// 		VM_Forced_Unload_Start();
// 		SV_Shutdown( "Server disconnected" );
// 		CL_Disconnect( qtrue );
// 		CL_FlushMemory( );
// 		VM_Forced_Unload_Done();
// 		// make sure we can get at our local stuff
// 		FS_PureServerSetLoadedPaks("", "");
// 		com_errorEntered = qfalse;
// 		longjmp (abortframe, -1);
// 	} else if (code == ERR_DROP) {
// 		Com_Printf ("********************\nERROR: %s\n********************\n", com_errorMessage);
// 		VM_Forced_Unload_Start();
// 		SV_Shutdown (va("Server crashed: %s",  com_errorMessage));
// 		CL_Disconnect( qtrue );
// 		CL_FlushMemory( );
// 		VM_Forced_Unload_Done();
// 		FS_PureServerSetLoadedPaks("", "");
// 		com_errorEntered = qfalse;
// 		longjmp (abortframe, -1);
// 	} else if ( code == ERR_NEED_CD ) {
// 		VM_Forced_Unload_Start();
// 		SV_Shutdown( "Server didn't have CD" );
// 		if ( com_cl_running && com_cl_running->integer ) {
// 			CL_Disconnect( qtrue );
// 			CL_FlushMemory( );
// 			VM_Forced_Unload_Done();
// 			CL_CDDialog();
// 		} else {
// 			Com_Printf("Server didn't have CD\n" );
// 			VM_Forced_Unload_Done();
// 		}

// 		FS_PureServerSetLoadedPaks("", "");

// 		com_errorEntered = qfalse;
// 		longjmp (abortframe, -1);
// 	} else {
// 		VM_Forced_Unload_Start();
// 		CL_Shutdown(va("Client fatal crashed: %s", com_errorMessage), qtrue, qtrue);
// 		SV_Shutdown(va("Server fatal crashed: %s", com_errorMessage));
// 		VM_Forced_Unload_Done();
// 	}

// 	Com_Shutdown ();

// 	Sys_Error ("%s", com_errorMessage);
// }

/**
 * EventLoop
 */
function EventLoop() {
	var ev = events.shift();

	while (ev) {
		switch (ev.type) {
			case SE.CLMSG:
				cl.PacketEvent(ev.buffer);
				break;
			case SE.SVMSG:
				sv.PacketEvent(ev.socket, ev.buffer);
				break;
			case SE.NETSVSOCKCLOSE:
				sv.SocketClosed(ev.socket);
				break;
			case SE.KEY:
				if (ev.pressed) {
					cl.KeyDownEvent(ev.time, ev.keyName);
				} else {
					cl.KeyUpEvent(ev.time, ev.keyName);
				}
				break;
			case SE.MOUSE:
				cl.MouseMoveEvent(ev.time, ev.deltaX, ev.deltaY);
				break;
		}

		ev = events.shift();
	}
}

/**
 * QueueEvent
 */
function QueueEvent(ev) {
	ev.time = sys.GetMilliseconds();
	events.push(ev);
}

/**
 * ExecuteCmdText
 */
function ExecuteCmdText(text) {
	var split = text.split(' ');
	var arg0 = split[0];
	var args = split.slice(1);
	var cmdcb;
	var cvar;

	if ((cmdcb = GetCmd(arg0))) {
		cmdcb.apply(this, args);
	} else if ((cvar = FindCvar(arg0))) {
		CmdCvar.apply(this, split);
	}
}

/**
 * CheckSaveConfig
 */
function CheckSaveConfig() {
	// Don't save anything until we're fully initialized.
	if (!initialized) {
		return;
	}

	// Only save if we've modified an archive cvar.
	if (!(cvar_modifiedFlags & CVF.ARCHIVE)) {
		return;
	}

	cvar_modifiedFlags &= ~CVF.ARCHIVE;

	SaveConfig();
} 

/**
 * LoadConfig
 */
function LoadConfig() {
	ExecuteCmdText('exec default.cfg');
}

/**
 * SaveConfig
 */
function SaveConfig(callback) {
	var filename = 'default.cfg';

	var cfg = 'unbindall\n';
	cfg = cl.WriteBindings(cfg);
	cfg = WriteCvars(cfg);

	console.log('Saving config to', filename);

	sys.WriteFile(filename, cfg, 'utf8', callback);
}
	var MAX_PACKETLEN = 1400;
var MAX_LOOPBACK  = 16;
var loopbacks = [
	{ msgs: new Array(MAX_LOOPBACK), send: 0 },
	{ msgs: new Array(MAX_LOOPBACK), send: 0 }
];
var msgBuffer = new ArrayBuffer(MAX_MSGLEN);

/**
 * NetchanSetup
 */
function NetchanSetup(src, addrOrSocket) {
	var netchan = new NetChan();

	var addr;
	var socket;

	// TODO Stop including defines files, they break instanceof comparisons.
	//if (addrOrSocket instanceof sh.NetAdr) {
	if (addrOrSocket.type !== undefined) {
		addr = addrOrSocket;

		if (addr.type === sh.NetAdrType.LOOPBACK) {
			socket = { remoteAddress: addr };
		} else {
			socket = sys.NetConnectToServer(addr);
		}
	} else {
		socket = addrOrSocket;
		// TODO Parse this into a sh.NetAdr.
		addr = socket.remoteAddress;
	}

	netchan.src = src;
	netchan.addr = addr;
	netchan.socket = socket;

	return netchan;
}

/**
 * NetchanDestroy
 */
function NetchanDestroy(netchan) {
	if (netchan.addr.type === sh.NetAdrType.LOOPBACK) {
		// Trigger a fake disconnect event for loopback sockets.
		QueueEvent({ type: SE.SVSOCKCLOSE, socket: netchan.socket });
	} else {
		sys.NetClose(netchan.socket);
	}
}

/**
 * NetchanSendLoopPacket
 */
function NetchanSendLoopPacket(netchan, buffer, length) {
	var q = loopbacks[netchan.src];

	// Make a truncated copy of the incoming buffer.
	buffer = buffer.slice(0, length);

	q.msgs[q.send++ % MAX_LOOPBACK] = buffer;

	QueueEvent({
		type: netchan.src === sh.NetSrc.CLIENT ? SE.SVMSG : SE.CLMSG,
		socket: netchan.socket,
		addr: netchan.addr,
		buffer: buffer,
		length: length
	});
}

/**
 * NetchanSend
 */
function NetchanSend(netchan, buffer, length) {
	var msg = new ByteBuffer(msgBuffer, ByteBuffer.LITTLE_ENDIAN);

	// Prefix packet with outgoing sequence.
	// TODO this is pretty ugly.
	var view = new Uint8Array(buffer);
	msg.writeInt(netchan.outgoingSequence++);
	for (var i = 0; i < length; i++) {
		msg.writeUnsignedByte(view[i]);
	}

	if (netchan.addr.type === sh.NetAdrType.LOOPBACK) {
		NetchanSendLoopPacket(netchan, msg.buffer, msg.index);
		return;
	}

	sys.NetSend(netchan.socket, msg.buffer, msg.index);
}

/**
 * NetchanPrint
 */
function NetchanPrint(netchan, str) {
	var msg = new ByteBuffer(msgBuffer, ByteBuffer.LITTLE_ENDIAN);
	msg.writeInt(-1);
	msg.writeCString(str);

	if (netchan.addr.type === sh.NetAdrType.LOOPBACK) {
		NetchanSendLoopPacket(netchan, msg.buffer, msg.index);
		return;
	}

	sys.NetSend(netchan.socket, msg.buffer, msg.index);
}

/**
 * NetchanProcess
 */
function NetchanProcess(netchan, msg) {
	var sequence = msg.readInt();
	netchan.incomingSequence = sequence;
	return true;
}

	return {
		Init:           Init,
		Frame:          Frame,
		ExecuteCmdText: ExecuteCmdText,
		QueueEvent:     QueueEvent,
		NetchanSetup:   NetchanSetup
	};
});

define('system/dedicated/sys',
['common/sh', 'common/com'],
function (sh, com) {
	var BASE_FOLDER = 'baseq3';
var MAX_QPATH   = 64;
var CMD_BACKUP  = 64;

// If entityState.solid === SOLID_BMODEL, modelIndex is an inline model number
var SOLID_BMODEL = 0xffffff;

/**
 * Cvar flags
 */
var CVF = {
	ARCHIVE:    0x0001,                                    // save to config file
	USERINFO:   0x0002,                                    // sent to server on connect or change
	SERVERINFO: 0x0004,                                    // sent in response to front end requests
	SYSTEMINFO: 0x0008                                     // these cvars will be duplicated on all clients
};

/**
 * Renderer (should be moved)
 */
var MAX_DRAWSURFS  = 0x10000;

/**
 * Snapshot flags
 */
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

/**
 * MAX_* defines used to pre-alloc many structures
 */
var GENTITYNUM_BITS         = 10;
var MAX_CLIENTS             = 32;                          // absolute limit
var MAX_GENTITIES           = (1 << 10);                   // can't be increased without changing drawsurf bit packing
var MAX_MODELS              = 256;                         // these are sent over the net as 8 bits
var MAX_SOUNDS              = 256;                         // so they cannot be blindly increased

/**
 * Faux entity numbers
 */
var ENTITYNUM_NONE          = MAX_GENTITIES-1;
var ENTITYNUM_WORLD         = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL    = MAX_GENTITIES-2;

var MOVE_RUN = 120;                                        // if forwardmove or rightmove are >= MOVE_RUN,
	                                                       // then BUTTON_WALKING should be set

/**
 * Playerstate
 */
var MAX_STATS               = 16;
var MAX_PERSISTANT          = 16;
var MAX_POWERUPS            = 16;
var MAX_WEAPONS             = 16;
var MAX_PS_EVENTS           = 2;
var PMOVEFRAMECOUNTBITS     = 6;

var BUTTON = {
	ATTACK:       1,
	TALK:         2,                                       // displays talk balloon and disables actions
	USE_HOLDABLE: 4,
	GESTURE:      8,
	WALKING:      16,                                      // walking can't just be infered from MOVE_RUN
	                                                       // because a key pressed late in the frame will
	                                                       // only generate a small move value for that frame
	                                                       // walking will use different animations and
	                                                       // won't generate footsteps
	AFFIRMATIVE:  32,
	NEGATIVE:     64,
	GETFLAG:      128,
	GUARDBASE:    256,
	PATROL:       512,
	FOLLOWME:     1024,
	ANY:          2048                                     // any key whatsoever
};

var TR = {
	STATIONARY:  0,
	INTERPOLATE: 1,                              // non-parametric, but interpolate between snapshots
	LINEAR:      2,
	LINEAR_STOP: 3,
	SINE:        4,                              // value = base + sin( time / duration ) * delta
	GRAVITY:     5
};

var SURF = {
	NODAMAGE:    0x1,                            // never give falling damage
	SLICK:       0x2,                            // effects game physics
	SKY:         0x4,                            // lighting from environment map
	LADDER:      0x8,
	NOIMPACT:    0x10,                           // don't make missile explosions
	NOMARKS:     0x20,                           // don't leave missile marks
	FLESH:       0x40,                           // make flesh sounds and effects
	NODRAW:      0x80,                           // don't generate a drawsurface at all
	HINT:        0x100,                          // make a primary bsp splitter
	SKIP:        0x200,                          // completely ignore, allowing non-closed brushes
	NOLIGHTMAP:  0x400,                          // surface doesn't need a lightmap
	POINTLIGHT:  0x800,                          // generate lighting info at vertexes
	METALSTEPS:  0x1000,                         // clanking footsteps
	NOSTEPS:     0x2000,                         // no footstep sounds
	NONSOLID:    0x4000,                         // don't collide against curves with this set
	LIGHTFILTER: 0x8000,                         // act as a light filter during q3map -light
	ALPHASHADOW: 0x10000,                        // do per-pixel light shadow casting in q3map
	NODLIGHT:    0x20000,                        // don't dlight even if solid (solid lava, skies)
	DUST:        0x40000                         // leave a dust trail when walking on this surface
};

var CONTENTS = {
	SOLID:         1,                                      // an eye is never valid in a solid
	LAVA:          8,
	SLIME:         16,
	WATER:         32,
	FOG:           64,

	NOTTEAM1:      0x0080,
	NOTTEAM2:      0x0100,
	NOBOTCLIP:     0x0200,

	AREAPORTAL:    0x8000,

	PLAYERCLIP:    0x10000,
	MONSTERCLIP:   0x20000,
	TELEPORTER:    0x40000,
	JUMPPAD:       0x80000,
	CLUSTERPORTAL: 0x100000,
	DONOTENTER:    0x200000,
	BOTCLIP:       0x400000,
	MOVER:         0x800000,

	ORIGIN:        0x1000000,                              // removed before bsping an entity

	BODY:          0x2000000,                              // should never be on a brush, only in game
	CORPSE:        0x4000000,
	DETAIL:        0x8000000,                              // brushes not used for the bsp
	STRUCTURAL:    0x10000000,                             // brushes used for the bsp
	TRANSLUCENT:   0x20000000,                             // don't consume surface fragments inside
	TRIGGER:       0x40000000,
	NODROP:        0x80000000                              // don't leave bodies or items (death fog, lava)
};
	var MAX_MAP_AREA_BYTES = 32;                     // bit vector of area visibility

/**
 * System events
 */
var SE = {
	CLMSG:       0,
	SVMSG:       1,
	SVSOCKCLOSE: 2,
	KEY:         3,
	MOUSE:       4
};

/**
 * Networking
 */
var PACKET_BACKUP         = 32;                  // number of old messages that must be kept on client and
                                                 // server for delta comrpession and ping estimation
var MAX_PACKET_USERCMDS   = 32;                  // max number of usercmd_t in a packet
var MAX_RELIABLE_COMMANDS = 64;                  // max string commands buffered for restransmit
var MAX_MSGLEN            = 16384;

var CLM = {
	bad:           0,
	move:          1,                            // [[UserCmd]
	moveNoDelta:   2,                            // [[UserCmd]
	clientCommand: 3,                            // [string] message
	EOF:           4
};

var SVM = {
	bad:            0,
	gamestate:      1,
	configstring:   2,                           // [short] [string] only in gamestate messages
	baseline:       3,                           // only in gamestate messages
	serverCommand:  4,                           // [string] to be executed by client game module
	snapshot:       5,
	EOF:            6
};
	var KbLocals = {
	'us': {
		'default': {
			8: 'backspace',
			9: 'tab',
			13: 'enter',
			16: 'shift',
			17: 'ctrl',
			18: 'alt',
			19: 'pause',
			19: 'break',
			20: 'capslock',
			27: 'escape',
			27: 'esc',
			32: 'space',
			33: 'pageup',
			34: 'pagedown',
			35: 'end',
			36: 'home',
			37: 'left',
			38: 'up',
			39: 'right',
			40: 'down',
			45: 'insert',
			46: 'delete',
			48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9',
			65: 'a', 66: 'b', 67: 'c', 68: 'd', 69: 'e', 70: 'f', 71: 'g', 72: 'h', 73: 'i', 74: 'j', 75: 'k', 76: 'l', 77: 'm', 78: 'n', 79: 'o', 80: 'p', 81: 'q', 82: 'r', 83: 's', 84: 't', 85: 'u', 86: 'v', 87: 'w', 88: 'x', 89: 'y', 90: 'z',
			91: 'command',
			92: '_91',
			93: 'select',
			96: 'num0', 97: 'num1', 98: 'num2', 99: 'num3', 100: 'num4', 101: 'num5', 102: 'num6', 103: 'num7', 104: 'num8', 105: 'num9',
			// TODO test on full keyboard
			// 106: '*',
			// 107: '+',
			// 109: '-',
			// 110: '.',
			// 111: '%',
			112: 'f1', 113: 'f2', 114: 'f3', 115: 'f4', 116: 'f5', 117: 'f6', 118: 'f7', 119: 'f8', 120: 'f9', 121: 'f10', 122: 'f11', 123: 'f12',
			144: 'numlock',
			145: 'scrolllock',
			186: ';',
			187: '=',
			188: ',',
			189: '-',
			190: '.',
			191: '/',
			192: '`',
			219: '[',
			220: '\\',
			221: ']',
			222: '\''
		},
		'shifted': {
			48: ')', 49: '!', 50: '@', 51: '#', 52: '$', 53: '%', 54: '^', 55: '&', 56: '*', 57: '(',
			65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E', 70: 'F', 71: 'G', 72: 'H', 73: 'I', 74: 'J', 75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O', 80: 'P', 81: 'Q', 82: 'R', 83: 'S', 84: 'T', 85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y', 90: 'Z',
			107: '+',
			109: '_',
			186: ':',
			187: '+',
			188: '<',
			189: '_',
			190: '>',
			191: '?',
			192: '~',
			219: '{',
			220: '|',
			221: '}',
			222: '"'
		}
	}
};
	/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'SYS:');
	Function.apply.call(console.log, console, args);
}

/**
 * error
 */
function error(str) {
	throw new Error(str);
}

/**
 * Init
 */
function Init(cominterface) {	
	NetCreateServer();
	com.Init(sysinterface, true);

	setInterval(function () {
		com.Frame();
	}, 10);
}

/**
 * FullscreenChanged
 */
function FullscreenChanged() {
	error('Should not happen');
}

/**
 * GetGLContext
 */
function GetGLContext() {
	error('Should not happen');
}

/**
 * GetUIContext
 */
function GetUIContext() {
	error('Should not happen');
}

/**
 * GetMilliseconds
 */
var timeBase;
function GetMilliseconds() {
	var time = process.hrtime();

	if (!timeBase) {
		timeBase = time[0] * 1000 + parseInt(time[1] / 1000000, 10);
	}

	return (time[0] * 1000 + parseInt(time[1] / 1000000, 10)) - timeBase;
}
	var fs = require('fs');

/**
 * ReadFile
 */
function ReadFile(path, encoding, callback) {
	var binary = encoding === 'binary';

	if (binary) {
		fs.readFile('public/' + BASE_FOLDER + '/' + path, function (err, data) {
			if (err) return callback(err);

			// Marshal the NodeBuffer into a new ArrayBuffer.
			var buffer = new ArrayBuffer(data.length);
			var view = new Uint8Array(buffer);
			for (var i = 0; i < data.length; ++i) {
				view[i] = data[i];
			}

			callback(null, buffer);
		});

		return;
	}

	fs.readFile('public/' + BASE_FOLDER + '/' + path, 'utf8', function (err, data) {
		if (err) throw err;
		callback(null, data);
	});
}
	var http = require('http');
var WebSocketServer = require('websocket').server;

/**
 * NetCreateServer
 */
function NetCreateServer() {
	var server = http.createServer();
	var wsServer = new WebSocketServer({
		httpServer: server,
		autoAcceptConnections: false
	});

	server.listen(9001, function() {
		log((new Date()) + ' Server is listening on port 8080');
	});

	wsServer.on('request', function(request) {
		var connection = request.accept('q3js', request.origin);
		log((new Date()) + ' Connection accepted.');

		com.QueueEvent({ type: SE.NETSVCONNECT, socket: connection });

		connection.on('message', function (message) {
			// TODO Clean this up. It'd be nice if we found a Node WebSocket library
			// that uses ArrayBuffers, but for now lets go ahead and convert this Buffer
			// to one so it works correctly all across the board.
			var data = message.binaryData;
			var ab = new ArrayBuffer(data.length);
			var view = new Uint8Array(ab);
			for (var i = 0; i < data.length; ++i) {
				view[i] = data[i];
			}

			com.QueueEvent({
				type: SE.SVMSG,
				socket: connection,
				buffer: ab
			});
		});

		connection.on('close', function(reasonCode, description) {
			com.QueueEvent({ type: SE.NETSVSOCKCLOSE, socket: connection });
		});
	});
}

function NetConnectToServer(addr) {
	error('Should not happen');
}

function NetSend(socket, ab, length) {
	// TODO optimize this, converting the buffer is lame.
	var buffer = new Buffer(length);
	var view = new Uint8Array(ab);
	for (var i = 0; i < length; ++i) {
		buffer[i] = view[i];
	}
	socket.sendBytes(buffer);
}

function NetClose(socket) {
	socket.close();
}

	var sysinterface = {
		GetMilliseconds:      GetMilliseconds,
		ReadFile:             ReadFile,
		GetGLContext: GetGLContext,
		GetUIContext:   GetUIContext,
		NetCreateServer:      NetCreateServer,
		NetConnectToServer:   NetConnectToServer,
		NetSend:              NetSend,
		NetClose:             NetClose
	};
	
	return {
		Init: Init
	};
});

