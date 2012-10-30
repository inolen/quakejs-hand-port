var sys;
var com;

var re;
var backend;
var gl;
var viewportUi;
var r_cull;
var r_subdivisions;
var r_znear;
var r_zproj;
var shardmd3;

var flipMatrix = mat4.create([
	0, 0, -1, 0,
	-1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 0, 1
]);

/**
 * Init
 */
function Init(sysinterface, cominterface) {
	console.log('--------- RE Init ---------');

	sys = sysinterface;
	com = cominterface;
	
	re = new RenderLocals();
	backend = new BackendLocals();

	r_cull = com.AddCvar('r_cull', 1);
	r_subdivisions = com.AddCvar('r_subdivisions', 4);
	r_znear = com.AddCvar('r_znear', 4);
	r_zproj = com.AddCvar('r_zproj', 64);

	com.AddCmd('showcluster', CmdShowCluster);

	var gameContext = sys.GetGameRenderContext();
	gl = gameContext.gl;

	InitImages();
	InitShaders();
	InitSkins();
	InitModels();
}

/**
 * Shutdown
 */
function Shutdown() {
	console.log('--------- RE Shutdown ---------');
	DeleteTextures();
}

/**
 * RotateModelMatrixForViewer
 */
function RotateModelMatrixForViewer() {
	var or = re.viewParms.or;

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

	// convert from our coordinate system (looking down X)
	// to OpenGL's coordinate system (looking down -Z)
	mat4.multiply(flipMatrix, modelMatrix, or.modelMatrix);
}

/**
 * RotateModelMatrixForEntity
 */
function RotateModelMatrixForEntity(refent, or) {
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

	mat4.multiply(re.viewParms.or.modelMatrix, or.modelMatrix, or.modelMatrix);

	/*// calculate the viewer origin in the model's space
	// needed for fog, specular, and environment mapping
	VectorSubtract( viewParms->or.origin, or->origin, delta );

	// compensate for scale in the axes if necessary
	if ( ent->e.nonNormalizedAxes ) {
		axisLength = VectorLength( ent->e.axis[0] );
		if ( !axisLength ) {
			axisLength = 0;
		} else {
			axisLength = 1.0f / axisLength;
		}
	} else {
		axisLength = 1.0f;
	}

	or->viewOrigin[0] = DotProduct( delta, or->axis[0] ) * axisLength;
	or->viewOrigin[1] = DotProduct( delta, or->axis[1] ) * axisLength;
	or->viewOrigin[2] = DotProduct( delta, or->axis[2] ) * axisLength;*/
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
	var ofsorigin = vec3.create(parms.or.origin);

	var length = Math.sqrt(xmax * xmax + zProj * zProj);
	var oppleg = xmax / length;
	var adjleg = zProj / length;

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[0].normal);
	vec3.add(parms.frustum[0].normal, vec3.scale(parms.or.axis[1], adjleg, [0,0,0]));

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[1].normal);
	vec3.add(parms.frustum[1].normal, vec3.scale(parms.or.axis[1], -adjleg, [0,0,0]));

	length = Math.sqrt(ymax * ymax + zProj * zProj);
	oppleg = ymax / length;
	adjleg = zProj / length;

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[2].normal);
	vec3.add(parms.frustum[2].normal, vec3.scale(parms.or.axis[2], adjleg, [0,0,0]));

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[3].normal);
	vec3.add(parms.frustum[3].normal, vec3.scale(parms.or.axis[2], -adjleg, [0,0,0]));

	for (var i = 0; i < 4; i++) {
		parms.frustum[i].type = PLANE_NON_AXIAL;
		parms.frustum[i].dist = vec3.dot(ofsorigin, parms.frustum[i].normal);
		parms.frustum[i].signbits = GetPlaneSignbits(parms.frustum[i]);
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
	// TODO not needed until we support portals
	//var firstDrawSurf = re.refdef.numDrawSurfs;
	re.viewCount++;

	// SETUP tr.or
	//vec3.set(re.viewParms.or.origin, re.or.viewOrigin);

	RotateModelMatrixForViewer();
	SetupProjectionMatrix(r_zproj());

	GenerateDrawSurfs();
	SortDrawSurfaces();

	RenderDrawSurfaces();
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
	RadixSort(re.refdef.drawSurfs, 'sort', re.refdef.numDrawSurfs);
}