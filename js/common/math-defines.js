var PLANE_X			= 0;
var PLANE_Y			= 1;
var PLANE_Z			= 2;
var PLANE_NON_AXIAL	= 3;

function PlaneTypeForNormal(x) {
	return x[0] == 1.0 ? PLANE_X : (x[1] == 1.0 ? PLANE_Y : (x[2] == 1.0 ? PLANE_Z : PLANE_NON_AXIAL))
}
