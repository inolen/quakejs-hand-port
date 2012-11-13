/*global vec3: true, mat4: true */
define('shared/QMath', [], function () {

var PITCH = 0; // up / down
var YAW   = 1; // left / right
var ROLL  = 2; // fall over

var PLANE_X         = 0;
var PLANE_Y         = 1;
var PLANE_Z         = 2;
var PLANE_NON_AXIAL = 3;

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
	var tvec = vec3.create(point);
	point[0] = vec3.dot(axis[0], tvec);
	point[1] = vec3.dot(axis[1], tvec);
	point[2] = vec3.dot(axis[2], tvec);
}

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

return {
	PITCH:                 PITCH,
	YAW:                   YAW,
	ROLL:                  ROLL,

	PLANE_X:               PLANE_X,
	PLANE_Y:               PLANE_Y,
	PLANE_Z:               PLANE_Z,
	PLANE_NON_AXIAL:       PLANE_NON_AXIAL,

	Plane:                 Plane,

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

	PlaneTypeForNormal:    PlaneTypeForNormal,
	GetPlaneSignbits:      GetPlaneSignbits,
	BoxOnPlaneSide:        BoxOnPlaneSide,

	RadiusFromBounds:      RadiusFromBounds,
	ClearBounds:           ClearBounds,
	AddPointToBounds:      AddPointToBounds,
	BoundsIntersect:       BoundsIntersect,
	BoundsIntersectSphere: BoundsIntersectSphere,
	BoundsIntersectPoint:  BoundsIntersectPoint,

	RadixSort:             RadixSort,
	ClampChar:             ClampChar,
	crandom:               crandom
};

});