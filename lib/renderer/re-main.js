var gl,
	re,
	backend;

var r_nocull,
	r_znear,
	r_subdivisions,
	r_overBrightBits,
	r_mapOverBrightBits,
	r_ambientScale,
	r_directedScale,
	r_dlights,
	r_railCoreWidth,
	r_showTris,
	r_showNormals,
	r_showFrustum,
	r_showCollision,
	r_portalOnly;

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
	CL.Log.apply(this, arguments);
}

/**
 * error
 */
function error(str) {
	CL.Error(str);
}

/**
 * Init
 */
function Init(callback) {
	log('Initializing RE');

	re      = new RenderLocals();
	backend = new BackendState();
	gl      = SYS.GetGLContext();

	RegisterCvars();
	RegisterCommands();

	InitTextures();
	InitShaders();
	InitSkins();
	InitModels();
	InitBackend();

	re.entityGeo = new EntityGeometry();
	re.entityGeo.dynamic = true;
	re.entityGeo.attributes.index    = CreateBuffer('index',    0xFFF, 'uint');
	re.entityGeo.attributes.position = CreateBuffer('position', 0xFFF, 'vec3');
	re.entityGeo.attributes.normal   = CreateBuffer('normal',   0xFFF, 'vec3');
	re.entityGeo.attributes.texCoord = CreateBuffer('texCoord', 0xFFF, 'vec2');
	re.entityGeo.attributes.color    = CreateBuffer('color',    0xFFF, 'vec4');

	// Async load all of the shaders.
	InitShaderScripts(function (err) {
		if (err) {
			error('Failed to load shader scripts.');
			return;
		}

		callback(null);
	});
}

/**
 * RegisterCvars
 */
function RegisterCvars() {
	r_nocull            = Cvar.AddCvar('r_nocull',            0);
	r_znear             = Cvar.AddCvar('r_znear',             4);
	r_subdivisions      = Cvar.AddCvar('r_subdivisions',      4,   0,                  true);
	r_overBrightBits    = Cvar.AddCvar('r_overBrightBits',    0,   Cvar.FLAGS.ARCHIVE, true);
	r_mapOverBrightBits = Cvar.AddCvar('r_mapOverBrightBits', 2,   Cvar.FLAGS.ARCHIVE, true);
	r_ambientScale      = Cvar.AddCvar('r_ambientScale',      0.6, Cvar.FLAGS.ARCHIVE);
	r_directedScale     = Cvar.AddCvar('r_directedScale',     1,   Cvar.FLAGS.ARCHIVE);
	r_dlights           = Cvar.AddCvar('r_dlights',           1,   Cvar.FLAGS.ARCHIVE, true);
	r_railCoreWidth     = Cvar.AddCvar('r_railCoreWidth',     6,   Cvar.FLAGS.ARCHIVE);
	r_showTris          = Cvar.AddCvar('r_showTris',          0,   Cvar.FLAGS.CHEAT);
	r_showNormals       = Cvar.AddCvar('r_showNormals',       0,   Cvar.FLAGS.CHEAT);
	r_showFrustum       = Cvar.AddCvar('r_showFrustum',       0,   Cvar.FLAGS.CHEAT);
	r_showCollision     = Cvar.AddCvar('r_showCollision',     0,   Cvar.FLAGS.CHEAT);
	r_portalOnly        = Cvar.AddCvar('r_portalOnly',        0,   Cvar.FLAGS.CHEAT);
}

/**
 * Shutdown
 */
function Shutdown(callback) {
	log('Shutdown RE');

	SYS.CancelFileCallbacks('renderer');

	DeleteTextures();

	// Clear the color buffer at this point so we're not
	// flickering the old game while shutting down / restarting
	// the client subsystems.
	gl.clear(gl.COLOR_BUFFER_BIT);

	callback(null);
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
var transformed = [
	vec3.create(),
	vec3.create(),
	vec3.create(),
	vec3.create(),
	vec3.create(),
	vec3.create(),
	vec3.create(),
	vec3.create()
];

function CullLocalBox(bounds) {
	// if ( r_nocull->integer ) {
	// 	return CULL_CLIP;
	// }

	var or = re.or;

	// Transform into world space.
	var v = vec3.create();
	for (var i = 0; i < 8; i++) {
		v[0] = bounds[i&1][0];
		v[1] = bounds[(i>>1)&1][1];
		v[2] = bounds[(i>>2)&1][2];

		vec3.set(or.origin, transformed[i]);

		for (var j = 0; j < 3; j++) {
			transformed[i][0] += or.axis[j][0] * v[j];
			transformed[i][1] += or.axis[j][1] * v[j];
			transformed[i][2] += or.axis[j][2] * v[j];
		}
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
			return CULL.OUT;  // all points were behind one of the planes
		}
		anyBack |= back;
	}

	if (!anyBack) {
		return CULL.IN;  // completely inside frustum
	}

	return CULL.CLIP;  // partially clipped
}

/**
 * CullLocalPointAndRadius
 */
function CullLocalPointAndRadius(pt, radius) {
	var world = vec3.create();

	LocalPointToWorld(pt, world);

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

		if (dist < -radius) {
			return CULL.OUT;
		} else if (dist <= radius) {
			mightBeClipped = true;
		}
	}

	if (mightBeClipped) {
		return CULL.CLIP;
	}

	return CULL.IN;  // completely inside frustum
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
function RotateForEntity(refent, viewParms, or) {
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
	var delta = vec3.subtract(viewParms.or.origin, or.origin, vec3.create());

	// Compensate for scale in the axes if necessary.
	var axisLength = 1.0;
	if (refent.nonNormalizedAxes ) {
		axisLength = vec3.length(refent.axis[0]);
		if (!axisLength) {
			axisLength = 0;
		} else {
			axisLength = 1.0 / axisLength;
		}
	}

	QMath.RotatePoint(delta, or.axis);
	vec3.scale(delta, axisLength, or.viewOrigin);
}

/**
 * SetupProjectionMatrix
 */
function SetupProjectionMatrix() {
	var parms = re.viewParms;

	var zNear = r_znear.get();

	var ymax = zNear * Math.tan(parms.fovY * Math.PI / 360);
	var ymin = -ymax;

	var xmax = zNear * Math.tan(parms.fovX * Math.PI / 360);
	var xmin = -xmax;

	var width = xmax - xmin;
	var height = ymax - ymin;

	parms.projectionMatrix[0] = 2 * zNear / width;
	parms.projectionMatrix[4] = 0;
	parms.projectionMatrix[8] = (xmax + xmin) / width;
	parms.projectionMatrix[12] = 0;

	parms.projectionMatrix[1] = 0;
	parms.projectionMatrix[5] = 2 * zNear / height;
	parms.projectionMatrix[9] = (ymax + ymin) / height; // normally 0
	parms.projectionMatrix[13] = 0;

	parms.projectionMatrix[3] = 0;
	parms.projectionMatrix[7] = 0;
	parms.projectionMatrix[11] = -1;
	parms.projectionMatrix[15] = 0;
}

/**
 * SetupProjectionMatrixZ
 */
function SetupProjectionMatrixZ() {
	var parms = re.viewParms;

	// Dynamically computer far clip plane distance.
	SetFarClip();

	var zNear = r_znear.get();
	var zFar = parms.zFar;
	var depth = zFar - zNear;

	parms.projectionMatrix[2] = 0;
	parms.projectionMatrix[6] = 0;
	parms.projectionMatrix[10] = -(zFar + zNear) / depth;
	parms.projectionMatrix[14] = -2.0 * zFar * zNear / depth;
}

/**
 * SetupFrustum
 *
 * Setup that culling frustum planes for the current view.
 */
function SetupFrustum() {
	var parms = re.viewParms;
	var ang = parms.fovX / 180 * Math.PI * 0.5;
	var xs = Math.sin(ang);
	var xc = Math.cos(ang);

	vec3.scale(parms.or.axis[0], xs, parms.frustum[0].normal);
	vec3.add(parms.frustum[0].normal, vec3.scale(parms.or.axis[1], xc, vec3.create()));

	vec3.scale(parms.or.axis[0], xs, parms.frustum[1].normal);
	vec3.add(parms.frustum[1].normal, vec3.scale(parms.or.axis[1], -xc, vec3.create()));

	ang = parms.fovY / 180 * Math.PI * 0.5;
	xs = Math.sin(ang);
	xc = Math.cos(ang);

	vec3.scale(parms.or.axis[0], xs, parms.frustum[2].normal);
	vec3.add(parms.frustum[2].normal, vec3.scale(parms.or.axis[2], xc, vec3.create()));

	vec3.scale(parms.or.axis[0], xs, parms.frustum[3].normal);
	vec3.add(parms.frustum[3].normal, vec3.scale(parms.or.axis[2], -xc, vec3.create()));

	for (var i = 0; i < 4; i++) {
		parms.frustum[i].type = QMath.PLANE_NON_AXIAL;
		parms.frustum[i].dist = vec3.dot(parms.or.origin, parms.frustum[i].normal);
		parms.frustum[i].signbits = QMath.GetPlaneSignbits(parms.frustum[i].normal);
	}
}

/**
 * SetFarClip
 */
function SetFarClip() {
	var parms = re.viewParms;

	// If not rendering the world (icons, menus, etc)
	// set a 2k far clip plane.
	/*if (tr.refdef.rdflags & RDF_NOWORLDMODEL) {
		tr.viewParms.zFar = 2048;
		return;
	}*/

	// Set far clipping planes dynamically.
	var farthestCornerDistance = 0;
	for (var i = 0; i < 8; i++) {
		var v = vec3.create();

		if (i & 1) {
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

		var vecTo = vec3.subtract(v, parms.or.origin, vec3.create());
		var distance = vec3.squaredLength(vecTo);

		if (distance > farthestCornerDistance) {
			farthestCornerDistance = distance;
		}
	}

	parms.zFar = Math.sqrt(farthestCornerDistance);
}

/**
 * RenderView
 */
function RenderView(parms) {
	parms.clone(re.viewParms);
	re.viewParms.frameCount = re.frameCount++;
	re.viewCount++;

	RotateForViewer(re.viewParms.or);
	SetupFrustum();

	// Go ahead and setup the projection matrix without the z-component
	// transform so it's available for model lod calculation.
	SetupProjectionMatrix();

	// Store off first / last draw surf since we may render a portal
	// before we actually call RenderDrawSurfaces.
	var first = re.refdef.numDrawGeom;
	GenerateDrawGeometry();
	var last = re.refdef.numDrawGeom;

	// Only sort the surfaces we've added (e.g. because of a portal).
	SortDrawGeometry(first, last);

	// Check for any portals, which may cause another view to be
	// rendered first.
	var refdef = re.refdef;
	var drawGeom = backend.drawGeom;
	var sortedShaders = re.sortedShaders;

	// Look through the new surfaces and see if we need to render
	// any more portals.
	for (var i = first; i < last; i++) {
		var draw = drawGeom[i];
		var geo = draw.geo;

		var shader = sortedShaders[(draw.sort >> QSORT_SHADERNUM_SHIFT) % MAX_SHADERS];
		var entityNum = (draw.sort >> QSORT_ENTITYNUM_SHIFT) % QS.MAX_GENTITIES;

		if (shader.sort > Script.SORT.PORTAL) {
			break;
		}

		// No shader should ever have this sort type.
		if (shader.sort === Script.SORT.BAD) {
			error('Shader \'' + shader.name + '\' with sort === Script.SORT.BAD');
		}

		// If the mirror was completely clipped away, we may need to check another surface.
		if (RenderMirrorView(geo, entityNum)) {
			// This is a debug option to see exactly what is being mirrored
			if (r_portalOnly.get()) {
				return;
			}
			break;  // only one mirror view at a time
		}
	}

	RenderDrawGeometry(first, last);
}

/*
 * LocalNormalToWorld
 */
function LocalNormalToWorld(local, world) {
	var or = re.or;

	world[0] = local[0] * or.axis[0][0] + local[1] * or.axis[1][0] + local[2] * or.axis[2][0];
	world[1] = local[1] * or.axis[0][1] + local[1] * or.axis[1][1] + local[2] * or.axis[2][1];
	world[2] = local[2] * or.axis[0][2] + local[1] * or.axis[1][2] + local[2] * or.axis[2][2];
}

/**
 * LocalPointToWorld
 */
function LocalPointToWorld(local, world) {
	var or = re.or;

	world[0] = local[0] * or.axis[0][0] + local[1] * or.axis[1][0] + local[2] * or.axis[2][0] + or.origin[0];
	world[1] = local[1] * or.axis[0][1] + local[1] * or.axis[1][1] + local[2] * or.axis[2][1] + or.origin[1];
	world[2] = local[2] * or.axis[0][2] + local[1] * or.axis[1][2] + local[2] * or.axis[2][2] + or.origin[2];
}