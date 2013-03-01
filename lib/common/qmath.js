/*global vec3: true, mat4: true */

define('common/qmath', ['glmatrix'], function (glmatrix) {

var vec3origin  = vec3.create();
var axisDefault = [
	vec3.createFrom(1, 0, 0),
	vec3.createFrom(0, 1, 0 ),
	vec3.createFrom(0, 0, 1)
];

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

/**
 * DirToByte
 */
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

/**
 * ByteToDir
 */
function ByteToDir(b, dir) {
	if (b < 0 || b >= bytedirs.length) {
		vec3.create(dir);
		return;
	}
	vec3.set(bytedirs[b], dir);
}

/**
 * rrandom
 */
function rrandom(min, max) {
	return Math.random() * (max - min) + min;
}

/**
 * irrandom
 */
function irrandom(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * crandom
 */
function crandom() {
	return 2.0 * (Math.random() - 0.5);
}

/**
 * SnapVector
 */
function SnapVector(normal) {
	normal[0] = Math.round(normal[0]);
	normal[1] = Math.round(normal[1]);
	normal[2] = Math.round(normal[2]);
}

/**
 * PerpendicularVector
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
	var tempvec = vec3.create();
	tempvec[pos] = 1;

	// Project the point onto the plane defined by src.
	ProjectPointOnPlane(tempvec, src, dst);

	// Normalize the result.
	vec3.normalize(dst);
}

/**
 * Angle consts
 */
var PITCH = 0; // up / down
var YAW   = 1; // left / right
var ROLL  = 2; // fall over

/**
 * DEG2RAD
 */
function DEG2RAD(a) {
	return (a * Math.PI) / 180.0;
}

/**
 * RAD2DEG
 */
function RAD2DEG(a) {
	return (a * 180.0) / Math.PI;
}

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
 * AnglesSubtract
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
 * AngleNormalize360
 *
 * Returns angle normalized to the range [0 <= angle < 360].
 */
function AngleNormalize360(a) {
	a = (360.0/65536) * (parseInt((a*(65536/360.0)), 10) & 65535);
	return a;
}

/**
 * AngleNormalize180
 *
 * Returns angle normalized to the range [-180 < angle <= 180].
 */
function AngleNormalize180(a) {
	a = AngleNormalize360(a);
	if (a > 180.0) {
		a -= 360.0;
	}
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
 * VectorToAngles
 */
function VectorToAngles(value1, angles) {
	var forward, yaw, pitch;

	if (value1[1] === 0 && value1[0] === 0) {
		yaw = 0;
		pitch = value1[2] > 0 ? 90 : 270;
	} else {
		if (value1[0]) {
			yaw = (Math.atan2(value1[1], value1[0]) * 180 / Math.PI);
		} else if (value1[1] > 0) {
			yaw = 90;
		} else {
			yaw = 270;
		}

		if (yaw < 0) {
			yaw += 360;
		}

		forward = Math.sqrt(value1[0]*value1[0] + value1[1]*value1[1]);
		pitch = (Math.atan2(value1[2], forward) * 180 / Math.PI);
		if (pitch < 0) {
			pitch += 360;
		}
	}

	angles[PITCH] = -pitch;
	angles[YAW] = yaw;
	angles[ROLL] = 0;
}

/**
 * AngleToShort
 */
function AngleToShort(x) {
	return (((x)*65536/360) & 65535);
}

/**
 * ShortToAngle
 */
function ShortToAngle(x) {
	return ((x)*(360.0/65536));
}

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
 * AxisCopy
 */
function AxisCopy(src, dest) {
	vec3.set(src[0], dest[0]);
	vec3.set(src[1], dest[1]);
	vec3.set(src[2], dest[2]);
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
 * TransposeMatrix
 */
function TransposeMatrix(matrix, transpose) {
	for (var i = 0; i < 3; i++) {
		for (var j = 0; j < 3; j++) {
			transpose[i][j] = matrix[j][i];
		}
	}
}

/**
 * RotatePoint
 */
function RotatePoint(point, axis) {
	var tvec = vec3.create(point);
	point[0] = vec3.dot(axis[0], tvec);
	point[1] = vec3.dot(axis[1], tvec);
	point[2] = vec3.dot(axis[2], tvec);
}

/**
 * RotatePointAroundVector
 */
function RotatePointAroundVector(point, dir, degrees, dst) {
	var m = mat4.identity();
	mat4.rotate(m, DEG2RAD(degrees), dir);
	mat4.multiplyVec3(m, point, dst);
}

/**
 * RotateAroundDirection
 */
function RotateAroundDirection(axis, yaw) {
	// Create an arbitrary axis[1].
	PerpendicularVector(axis[0], axis[1]);

	// Rotate it around axis[0] by yaw.
	if (yaw) {
		var temp = vec3.create(axis[1]);
		RotatePointAroundVector(temp, axis[0], yaw, axis[1]);
	}

	// Cross to get axis[2].
	vec3.cross(axis[0], axis[1], axis[2]);
}

/**
 * Plane
 */

var PLANE_X           = 0;
var PLANE_Y           = 1;
var PLANE_Z           = 2;
var PLANE_NON_AXIAL   = 3;

var SIDE_FRONT        = 1;
var SIDE_BACK         = 2;
var SIDE_ON           = 3;
var PLANE_TRI_EPSILON = 0.1;

var Plane = function () {
	this.normal   = vec3.create();
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
 * PointOnPlaneSide
 */
function PointOnPlaneSide(pt, p) {
	var d = vec3.dot(pt, p.normal) - p.dist;

	if (d > PLANE_TRI_EPSILON) {
		return SIDE_FRONT;
	}

	if (d < -PLANE_TRI_EPSILON) {
		return SIDE_BACK;
	}

	return SIDE_ON;
}

/**
 * BoxOnPlaneSide
 *
 * Returns 1, 2, or 1 + 2.
 */
function BoxOnPlaneSide(mins, maxs, p) {
	// Fast axial cases.
	if (p.type < PLANE_NON_AXIAL) {
		if (p.dist <= mins[p.type]) {
			return SIDE_FRONT;
		} else if (p.dist >= maxs[p.type]) {
			return SIDE_BACK;
		}
		return SIDE_ON;
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
		sides = SIDE_FRONT;
	}
	if (dist[1] < p.dist) {
		sides |= SIDE_BACK;
	}

	return sides;
}

/**
 * ProjectPointOnPlane
 */
function ProjectPointOnPlane(p, normal, dest) {
	var n = vec3.scale(normal, vec3.dot(normal, p), vec3.create());
	vec3.subtract(p, n, dest);
}

/**
 * PlaneFromPoints
 *
 * Returns null if the triangle is degenrate.
 * The normal will point out of the clock for clockwise ordered points.
 */
function PlaneFromPoints(a, b, c) {
	var plane = new Plane();
	var d1 = vec3.subtract(b, a, vec3.create());
	var d2 = vec3.subtract(c, a, vec3.create());

	vec3.cross(d2, d1, plane.normal);
	vec3.normalize(plane.normal);

	if (vec3.length(plane.normal) === 0) {
		return null;
	}

	plane.dist = vec3.dot(a, plane.normal);
	plane.signbits = GetPlaneSignbits(plane.normal);

	return plane;
}

/**
 * PlaneEqual
 */
var NORMAL_EPSILON = 0.0001;
var DIST_EPSILON   = 0.02;

function PlaneEqual(p1, p2) {
	if (Math.abs(p1.normal[0] - p2.normal[0]) < NORMAL_EPSILON &&
		Math.abs(p1.normal[1] - p2.normal[1]) < NORMAL_EPSILON &&
		Math.abs(p1.normal[2] - p2.normal[2]) < NORMAL_EPSILON &&
		Math.abs(p1.dist - p2.dist) < DIST_EPSILON) {
		return true;
	}

	return false;
}

/**
 * Ordered list of colplanar vectors.
 */
var MAX_MAP_BOUNDS        = 65535;
var MAX_POINTS_ON_WINDING = 64;

var Winding = function () {
	this.p = [];
};

Winding.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new Winding();
	}

	to.p = new Array(this.p.length);
	for (var i = 0; i < this.p.length; i++) {
		to.p[i] = vec3.create(this.p[i]);
	}

	return to;
};

/**
 * BaseWindingForPlane
 *
 * Take a plane and generate a giant quad using the
 * MAP_MAP_BOUNDS constant of coplanar points.
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
		throw new Exception('BaseWindingForPlane: no axis found');
	}

	var vup = vec3.create();
	var org = vec3.create();
	var vright = vec3.create();
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
	vec3.add(vup, vec3.scale(normal, -v, vec3.create()));
	vec3.normalize(vup);

	vec3.scale(normal, dist, org);

	vec3.cross(vup, normal, vright);

	vec3.scale(vup, MAX_MAP_BOUNDS);
	vec3.scale(vright, MAX_MAP_BOUNDS);

	// Project a really big	axis aligned box onto the plane.
	var w = new Winding();

	w.p[0] = vec3.subtract(org, vright, vec3.create());
	vec3.add(w.p[0], vup, w.p[0]);

	w.p[1] = vec3.add(org, vright, vec3.create());
	vec3.add(w.p[1], vup, w.p[1]);

	w.p[2] = vec3.add(org, vright, vec3.create());
	vec3.subtract(w.p[2], vup, w.p[2]);

	w.p[3] = vec3.subtract(org, vright, vec3.create());
	vec3.subtract(w.p[3], vup, w.p[3]);

	return w;
}

/**
 * WindingBounds
 *
 * Get the bounds of a giving winding, helpful
 * for sanity testing a chop.
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
 *
 * Chop a winding by a single plane.
 */
function ChopWindingInPlace(inout, normal, dist, epsilon) {
	var i, j;
	var dot;
	var p1, p2;
	var dists = new Array(MAX_POINTS_ON_WINDING+4);
	var sides = new Array(MAX_POINTS_ON_WINDING+4);
	var counts = vec3.create();
	var mid = vec3.create();
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
	var f = new Winding();
	var maxpts = orig.p.length + 4;  // cant use counts[0]+2 because
	                                 // of fp grouping errors

	for (i = 0; i < orig.p.length; i++) {
		p1 = orig.p[i];

		if (sides[i] === SIDE_ON) {
			f.p.push(vec3.set(p1, vec3.create()));
			continue;
		}

		if (sides[i] === SIDE_FRONT) {
			f.p.push(vec3.set(p1, vec3.create()));
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

		f.p.push(vec3.set(mid, vec3.create()));
	}

	if (f.p.length > maxpts) {
		throw new Exception('ClipWinding: points exceeded estimate');
	}

	if (f.p.length > MAX_POINTS_ON_WINDING) {
		throw new Exception('ClipWinding: MAX_POINTS_ON_WINDING');
	}

	f.clone(inout);

	return true;
}

/**
 * RadiusFromBounds
 */
function RadiusFromBounds(mins, maxs) {
	var a, b;
	var corner = vec3.create();

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

function RadixSort(arr, prop, start, end) {
	var len = end - start;
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
	for (x = start; x < end; x++) {
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
	for (x = start; x < end; x++) {
		k4 = arr[x][prop] & 0xFF;
		cpy[c4[k4]] = arr[x];
		c4[k4]++;
	}
	for (x = 0; x < len; x++) {
		k3 = (cpy[x][prop] >> 8) & 0xFF;
		arr[start+c3[k3]] = cpy[x];
		c3[k3]++;
	}
	for (x = start; x < end; x++) {
		k2 = (arr[x][prop] >> 16) & 0xFF;
		cpy[c2[k2]] = arr[x];
		c2[k2]++;
	}
	for (x = 0; x < len; x++) {
		k1 = (cpy[x][prop] >> 24) & 0xFF ^ 0x80;
		arr[start+c1[k1]] = cpy[x];
		c1[k1]++;
	}

	return arr;
}

return {
	vec3origin:              vec3origin,
	axisDefault:             axisDefault,

	DirToByte:               DirToByte,
	ByteToDir:               ByteToDir,
	rrandom:                 rrandom,
	irrandom:                irrandom,
	crandom:                 crandom,

	SnapVector:              SnapVector,
	PerpendicularVector:     PerpendicularVector,

	PITCH:                   PITCH,
	YAW:                     YAW,
	ROLL:                    ROLL,
	DEG2RAD:                 DEG2RAD,
	RAD2DEG:                 RAD2DEG,
	AngleSubtract:           AngleSubtract,
	AnglesSubtract:          AnglesSubtract,
	LerpAngle:               LerpAngle,
	AngleNormalize360:       AngleNormalize360,
	AngleNormalize180:       AngleNormalize180,
	AnglesToVectors:         AnglesToVectors,
	VectorToAngles:          VectorToAngles,
	AngleToShort:            AngleToShort,
	ShortToAngle:            ShortToAngle,

	AxisClear:               AxisClear,
	AxisCopy:                AxisCopy,
	AnglesToAxis:            AnglesToAxis,
	AxisMultiply:            AxisMultiply,
	TransposeMatrix:         TransposeMatrix,
	RotatePoint:             RotatePoint,
	RotatePointAroundVector: RotatePointAroundVector,
	RotateAroundDirection:   RotateAroundDirection,

	PLANE_X:                 PLANE_X,
	PLANE_Y:                 PLANE_Y,
	PLANE_Z:                 PLANE_Z,
	PLANE_NON_AXIAL:         PLANE_NON_AXIAL,
	SIDE_FRONT:              SIDE_FRONT,
	SIDE_BACK:               SIDE_BACK,
	SIDE_ON:                 SIDE_ON,
	Plane:                   Plane,
	PlaneTypeForNormal:      PlaneTypeForNormal,
	GetPlaneSignbits:        GetPlaneSignbits,
	PointOnPlaneSide:        PointOnPlaneSide,
	BoxOnPlaneSide:          BoxOnPlaneSide,
	ProjectPointOnPlane:     ProjectPointOnPlane,
	PlaneFromPoints:         PlaneFromPoints,
	PlaneEqual:              PlaneEqual,

	MAX_MAP_BOUNDS:          MAX_MAP_BOUNDS,
	BaseWindingForPlane:     BaseWindingForPlane,
	WindingBounds:           WindingBounds,
	ChopWindingInPlace:      ChopWindingInPlace,

	RadiusFromBounds:        RadiusFromBounds,
	ClearBounds:             ClearBounds,
	AddPointToBounds:        AddPointToBounds,
	BoundsIntersect:         BoundsIntersect,
	BoundsIntersectPoint:    BoundsIntersectPoint,

	RadixSort:               RadixSort
};

});