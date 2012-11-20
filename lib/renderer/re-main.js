var re;
var backend;
var gl;

var r_cull,
	r_subdivisions,
	r_znear,
	r_zproj,
	r_overBrightBits,
	r_mapOverBrightBits,
	r_ambientScale,
	r_directedScale,
	r_showtris,
	r_shownormals,
	r_showcollision;

var flipMatrix = mat4.create([
	0, 0, -1, 0,
	-1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 0, 1
]);

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'RE:');
	Function.apply.call(console.log, console, args);
}

/**
 * Init
 */
function Init() {
	log('Initializing');
	
	re      = new RenderLocals();
	backend = new BackendLocals();
	gl      = imp.sys_GetGLContext();

	r_cull              = imp.com_AddCvar('r_cull',              1);
	r_subdivisions      = imp.com_AddCvar('r_subdivisions',      4);
	r_znear             = imp.com_AddCvar('r_znear',             4);
	r_zproj             = imp.com_AddCvar('r_zproj',             64);
	r_overBrightBits    = imp.com_AddCvar('r_overBrightBits',    0, CVF.ARCHIVE);
	r_mapOverBrightBits = imp.com_AddCvar('r_mapOverBrightBits', 2, CVF.ARCHIVE);
	r_ambientScale      = imp.com_AddCvar('r_ambientScale',      0.6);
	r_directedScale     = imp.com_AddCvar('r_directedScale',     1);
	r_showtris          = imp.com_AddCvar('r_showtris',          0);
	r_shownormals       = imp.com_AddCvar('r_shownormals',       0);
	r_showcollision     = imp.com_AddCvar('r_showcollision',     0);

	imp.com_AddCmd('showcluster', CmdShowCluster);

	InitImages();
	InitShaders();
	InitSkins();
	InitModels();
	InitBackend();
}

/**
 * Shutdown
 */
function Shutdown() {
	log('Shutting down');
	DeleteTextures();
}

/**
 * GetGLExtension
 */
var vendorPrefixes = ['', 'WEBKIT_', 'MOZ_'];
function GetGLExtension(name) {
	for (var i in vendorPrefixes) {
		var ext = gl.getExtension(vendorPrefixes[i] + name);
		if (ext) {
			return ext;
		}
	}
	return null;
}

/**
 * CullLocalBox
 *
 * Returns CULL_IN, CULL_CLIP, or CULL_OUT
 */
function CullLocalBox(bounds) {
	// if ( r_nocull->integer ) {
	// 	return CULL_CLIP;
	// }
	var or = re.or;

	// Transform into world space.
	var v = [0, 0, 0];
	var transformed = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];

	for (var i = 0; i < 8; i++) {
		v[0] = bounds[i&1][0];
		v[1] = bounds[(i>>1)&1][1];
		v[2] = bounds[(i>>2)&1][2];

		vec3.set(or.origin, transformed[i]);
		vec3.add(transformed[i], vec3.scale(or.axis[0], v[0], [0, 0, 0]));
		vec3.add(transformed[i], vec3.scale(or.axis[1], v[1], [0, 0, 0]));
		vec3.add(transformed[i], vec3.scale(or.axis[2], v[2], [0, 0, 0]));
	}

	// Check against frustum planes.
	var anyBack = 0;
	var dists = [0, 0, 0, 0, 0, 0, 0, 0];
	var parms = re.viewParms;

	for (var i = 0; i < 4; i++) {
		var frust = parms.frustum[i];
		var front = 0, back = 0;

		for (var j = 0; j < 8; j++) {
			dists[j] = vec3.dot(transformed[j], frust.normal);

			if (dists[j] > frust.dist) {
				front = 1;

				if (back) {
					break;  // a point is in front
				}
			} else {
				back = 1;
			}
		}

		if (!front) {			
			return Cull.OUT;  // all points were behind one of the planes
		}
		anyBack |= back;
	}

	if (!anyBack) {
		return Cull.IN;  // completely inside frustum
	}

	return Cull.CLIP;  // partially clipped
}

/**
 * CullLocalPointAndRadius
 */
function CullLocalPointAndRadius(pt, radius) {
	var or = re.or,
		x = pt[0],
		y = pt[1],
		z = pt[2],
		world = [0, 0, 0];

	world[0] = x * or.axis[0][0] + y * or.axis[1][0] + z * or.axis[2][0] + or.origin[0];
	world[1] = x * or.axis[0][1] + y * or.axis[1][1] + z * or.axis[2][1] + or.origin[1];
	world[2] = x * or.axis[0][2] + y * or.axis[1][2] + z * or.axis[2][2] + or.origin[2];

	return CullPointAndRadius(world, radius);
}

/**
 * CullPointAndRadius
 */
function CullPointAndRadius(pt, radius) {
	// if ( r_nocull->integer ) {
	// 	return CULL_CLIP;
	// }

	var parms = re.viewParms;
	var mightBeClipped = false;

	// Check against frustum planes.
	for (var i = 0; i < 4; i++) {
		var frust = parms.frustum[i];
		var dist = vec3.dot(pt, frust.normal) - frust.dist;

		if ( dist < -radius ) {
			return Cull.OUT;
		} else if ( dist <= radius ) {
			mightBeClipped = true;
		}
	}

	if (mightBeClipped) {
		return Cull.CLIP;
	}

	return Cull.IN; // completely inside frustum
}

/**
 * RotateForViewer
 */
function RotateForViewer(or) {
	// Create model view matrix.
	var modelMatrix = mat4.create();

	modelMatrix[0] = or.axis[0][0];
	modelMatrix[4] = or.axis[0][1];
	modelMatrix[8] = or.axis[0][2];
	modelMatrix[12] = -or.origin[0] * modelMatrix[0] + -or.origin[1] * modelMatrix[4] + -or.origin[2] * modelMatrix[8];

	modelMatrix[1] = or.axis[1][0];
	modelMatrix[5] = or.axis[1][1];
	modelMatrix[9] = or.axis[1][2];
	modelMatrix[13] = -or.origin[0] * modelMatrix[1] + -or.origin[1] * modelMatrix[5] + -or.origin[2] * modelMatrix[9];

	modelMatrix[2] = or.axis[2][0];
	modelMatrix[6] = or.axis[2][1];
	modelMatrix[10] = or.axis[2][2];
	modelMatrix[14] = -or.origin[0] * modelMatrix[2] + -or.origin[1] * modelMatrix[6] + -or.origin[2] * modelMatrix[10];

	modelMatrix[3] = 0;
	modelMatrix[7] = 0;
	modelMatrix[11] = 0;
	modelMatrix[15] = 1;

	// Convert from our coordinate system (looking down X)
	// to OpenGL's coordinate system (looking down -Z).
	mat4.multiply(flipMatrix, modelMatrix, or.modelMatrix);

	// View origin is the same as origin for the viewer.
	vec3.set(or.origin, or.viewOrigin);

	// Update global world orientiation info.
	// or.clone(re.viewParms.world);
}

/**
 * RotateForEntity
 */
function RotateForEntity(refent, or) {
	var viewParms = re.viewParms;

	if (refent.reType !== RT.MODEL) {
		viewParms.or.clone(or);
		return;
	}

	vec3.set(refent.origin, or.origin);
	vec3.set(refent.axis[0], or.axis[0]);
	vec3.set(refent.axis[1], or.axis[1]);
	vec3.set(refent.axis[2], or.axis[2]);
	
	var modelMatrix = or.modelMatrix;
	modelMatrix[0] = or.axis[0][0];
	modelMatrix[4] = or.axis[1][0];
	modelMatrix[8] = or.axis[2][0];
	modelMatrix[12] = or.origin[0];

	modelMatrix[1] = or.axis[0][1];
	modelMatrix[5] = or.axis[1][1];
	modelMatrix[9] = or.axis[2][1];
	modelMatrix[13] = or.origin[1];

	modelMatrix[2] = or.axis[0][2];
	modelMatrix[6] = or.axis[1][2];
	modelMatrix[10] = or.axis[2][2];
	modelMatrix[14] = or.origin[2];

	modelMatrix[3] = 0;
	modelMatrix[7] = 0;
	modelMatrix[11] = 0;
	modelMatrix[15] = 1;

	mat4.multiply(viewParms.or.modelMatrix, or.modelMatrix, or.modelMatrix);

	// Calculate the viewer origin in the model's space
	// needed for fog, specular, and environment mapping.
	var delta = vec3.subtract(viewParms.or.origin, or.origin, [0, 0, 0]);

	// Compensate for scale in the axes if necessary.
	// if ( ent->e.nonNormalizedAxes ) {
	// 	axisLength = VectorLength( ent->e.axis[0] );
	// 	if ( !axisLength ) {
	// 		axisLength = 0;
	// 	} else {
	// 		axisLength = 1.0f / axisLength;
	// 	}
	// } else {
	// 	axisLength = 1.0f;
	// }

	vec3.set(delta, or.viewOrigin);
	qm.RotatePoint(delta, or.axis); // scale axis by axisLength
}

/**
 * SetupProjectionMatrix
 */
function SetupProjectionMatrix(zProj) {
	var parms = re.viewParms;

	var ymax = zProj * Math.tan(parms.fovY * Math.PI / 360);
	var ymin = -ymax;

	var xmax = zProj * Math.tan(parms.fovX * Math.PI / 360);
	var xmin = -xmax;

	var width = xmax - xmin;
	var height = ymax - ymin;

	parms.projectionMatrix[0] = 2 * zProj / width;
	parms.projectionMatrix[4] = 0;
	parms.projectionMatrix[8] = (xmax + xmin) / width;
	parms.projectionMatrix[12] = 0;

	parms.projectionMatrix[1] = 0;
	parms.projectionMatrix[5] = 2 * zProj / height;
	parms.projectionMatrix[9] = (ymax + ymin) / height; // normally 0
	parms.projectionMatrix[13] = 0;

	parms.projectionMatrix[3] = 0;
	parms.projectionMatrix[7] = 0;
	parms.projectionMatrix[11] = -1;
	parms.projectionMatrix[15] = 0;

	// Now that we have all the data for the projection matrix we can also setup the view frustum.
	SetupFrustum(parms, xmin, xmax, ymax, zProj);
}

/**
 * SetupFrustum
 * 
 * Set up the culling frustum planes for the current view using the results we got from computing the first two rows of 
 * the projection matrix.
 */
function SetupFrustum(parms, xmin, xmax, ymax, zProj) {
	var ofsorigin = vec3.set(parms.or.origin, [0, 0, 0]);

	var length = Math.sqrt(xmax * xmax + zProj * zProj);
	var oppleg = xmax / length;
	var adjleg = zProj / length;

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[0].normal);
	vec3.add(parms.frustum[0].normal, vec3.scale(parms.or.axis[1], adjleg, [0, 0, 0]));

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[1].normal);
	vec3.add(parms.frustum[1].normal, vec3.scale(parms.or.axis[1], -adjleg, [0, 0, 0]));

	length = Math.sqrt(ymax * ymax + zProj * zProj);
	oppleg = ymax / length;
	adjleg = zProj / length;

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[2].normal);
	vec3.add(parms.frustum[2].normal, vec3.scale(parms.or.axis[2], adjleg, [0, 0, 0]));

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[3].normal);
	vec3.add(parms.frustum[3].normal, vec3.scale(parms.or.axis[2], -adjleg, [0, 0, 0]));

	for (var i = 0; i < 4; i++) {
		parms.frustum[i].type = qm.PLANE_NON_AXIAL;
		parms.frustum[i].dist = vec3.dot(ofsorigin, parms.frustum[i].normal);
		parms.frustum[i].signbits = qm.GetPlaneSignbits(parms.frustum[i].normal);
	}
}

/**
 * SetFarClip
 */
function SetFarClip() {
	var parms = re.viewParms;

	// if not rendering the world (icons, menus, etc)
	// set a 2k far clip plane
	/*if (tr.refdef.rdflags & RDF_NOWORLDMODEL) {
		tr.viewParms.zFar = 2048;
		return;
	}*/

	// set far clipping planes dynamically
	var farthestCornerDistance = 0;
	for (var i = 0; i < 8; i++) {
		var v = [0, 0, 0];

		if ( i & 1 ) {
			v[0] = parms.visBounds[0][0];
		} else {
			v[0] = parms.visBounds[1][0];
		}

		if (i & 2) {
			v[1] = parms.visBounds[0][1];
		} else {
			v[1] = parms.visBounds[1][1];
		}

		if (i & 4) {
			v[2] = parms.visBounds[0][2];
		} else {
			v[2] = parms.visBounds[1][2];
		}

		var vecTo = vec3.subtract(v, re.viewParms.or.origin, [0, 0, 0]);
		var distance = vecTo[0] * vecTo[0] + vecTo[1] * vecTo[1] + vecTo[2] * vecTo[2];

		if (distance > farthestCornerDistance) {
			farthestCornerDistance = distance;
		}
	}

	re.viewParms.zFar = Math.sqrt(farthestCornerDistance);
}

/**
 * SetupProjectionZ
 *
 * Sets the z-component transformation part in the projection matrix.
 */
function SetupProjectionMatrixZ() {
	var parms = re.viewParms;

	var zNear = r_znear();
	var zFar = parms.zFar;
	var depth = zFar - zNear;

	parms.projectionMatrix[2] = 0;
	parms.projectionMatrix[6] = 0;
	parms.projectionMatrix[10] = -(zFar + zNear) / depth;
	parms.projectionMatrix[14] = -2 * zFar * zNear / depth;
}

/**
 * RenderView
 */
function RenderView(parms) {
	re.viewCount++;
	re.viewParms = parms;
	re.viewParms.frameSceneNum = re.frameSceneNum;
	re.viewParms.frameCount = re.frameCount;
	re.viewCount++;

	RotateForViewer(re.viewParms.or);
	SetupProjectionMatrix(r_zproj());

	GenerateDrawSurfs();
	SortDrawSurfaces();

	RenderDrawSurfaces();
	if (r_showcollision()) {
		RenderCollisionSurfaces();
	}
}

/**
 * GenerateDrawSurfs
 */
function GenerateDrawSurfs() {
	AddWorldSurfaces();
	AddEntitySurfaces();

	// AddWorldSurfaces will setup the min/max visibility bounds.
	SetFarClip();
	SetupProjectionMatrixZ();
}

/**
 * AddDrawSurf
 */
function AddDrawSurf(face, shader, entityNum/*, fogIndex, dlightMap*/) {
	var refdef = re.refdef;

	// Instead of checking for overflow, we just mask the index so it wraps around.
	var index = refdef.numDrawSurfs % MAX_DRAWSURFS;
	// The sort data is packed into a single 32 bit value so it can be
	// compared quickly during the qsorting process.
	refdef.drawSurfs[index].sort = (shader.sortedIndex << QSORT_SHADERNUM_SHIFT) | (entityNum << QSORT_ENTITYNUM_SHIFT);
	// | ( fogIndex << QSORT_FOGNUM_SHIFT ) | (int)dlightMap;
	refdef.drawSurfs[index].surface = face;
	refdef.numDrawSurfs++;
}

/**
 * SortDrawSurfaces
 */
function SortDrawSurfaces() {
	qm.RadixSort(re.refdef.drawSurfs, 'sort', re.refdef.numDrawSurfs);
}