var re;
var backend;
var gl;

var r_nocull,
	r_znear,
	r_lodscale,
	r_subdivisions,
	r_overBrightBits,
	r_mapOverBrightBits,
	r_ambientScale,
	r_directedScale,
	r_railCoreWidth,
	r_dlights,
	r_pauseVis,
	r_showTris,
	r_showNormals,
	r_showFrustum,
	r_showCollision,
	r_dlights,
	r_activeDlight;

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
 * error
 */
function error(str) {
	com.Error(str);
}

/**
 * Init
 */
function Init() {
	log('Initializing');

	re      = new RenderLocals();
	backend = new BackendState();
	gl      = sys.GetGLContext();

	r_nocull            = com.AddCvar('r_nocull',            0);
	r_znear             = com.AddCvar('r_znear',             4);
	r_lodscale          = com.AddCvar('r_lodscale',          5,   CVF.CHEAT );
	r_subdivisions      = com.AddCvar('r_subdivisions',      4);
	r_overBrightBits    = com.AddCvar('r_overBrightBits',    0,   CVF.ARCHIVE);
	r_mapOverBrightBits = com.AddCvar('r_mapOverBrightBits', 2,   CVF.ARCHIVE);
	r_ambientScale      = com.AddCvar('r_ambientScale',      0.6);
	r_directedScale     = com.AddCvar('r_directedScale',     1);
	r_railCoreWidth     = com.AddCvar('r_railCoreWidth',     6,   CVF.ARCHIVE);
	r_dlights           = com.AddCvar('r_dlights',           1,   CVF.ARCHIVE);
	r_pauseVis          = com.AddCvar('r_pauseVis',          0,   CVF.CHEAT);
	r_showTris          = com.AddCvar('r_showTris',          0,   CVF.CHEAT);
	r_showNormals       = com.AddCvar('r_showNormals',       0,   CVF.CHEAT);
	r_showFrustum       = com.AddCvar('r_showFrustum',       0,   CVF.CHEAT);
	r_showCollision     = com.AddCvar('r_showCollision',     0,   CVF.CHEAT);
	r_activeDlight      = com.AddCvar('r_activeDlight',      -1,  CVF.CHEAT);

	RegisterCommands();

	InitTextures();
	InitShaders();
	InitSkins();
	InitModels();
	InitBackend();

	entityGeo = new EntityGeometry();
	entityGeo.dynamic = true;
	InitBuffers(entityGeo, 0xFFFF, 0xFFFF, {
		'index':      'uint',
		'position':   'vec3',
		'normal':     'vec3',
		'texCoord':   'vec2',
		'color':      'vec4'
	});
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

	var i;
	var or = re.or;

	// Transform into world space.
	var v = vec3.create();
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

	for (i = 0; i < 8; i++) {
		v[0] = bounds[i&1][0];
		v[1] = bounds[(i>>1)&1][1];
		v[2] = bounds[(i>>2)&1][2];

		vec3.set(or.origin, transformed[i]);
		vec3.add(transformed[i], vec3.scale(or.axis[0], v[0], vec3.create()));
		vec3.add(transformed[i], vec3.scale(or.axis[1], v[1], vec3.create()));
		vec3.add(transformed[i], vec3.scale(or.axis[2], v[2], vec3.create()));
	}

	// Check against frustum planes.
	var anyBack = 0;
	var dists = [0, 0, 0, 0, 0, 0, 0, 0];
	var parms = re.viewParms;

	for (i = 0; i < 4; i++) {
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

	var zNear = r_znear();

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
var Z_BUFFER_EPSILON = 0.01;

function SetupProjectionMatrixZ() {
	var parms = re.viewParms;

	// Dynamically computer far clip plane distance.
	SetFarClip();

	var zNear = r_znear();
	var zFar = parms.zFar;
	var depth = zFar - zNear;

	parms.projectionMatrix[2] = 0;
	parms.projectionMatrix[6] = 0;
	// This is the far-plane-at-infinity formulation, and
	// crunches the Z range slightly so w=0 vertexes do not
	// rasterize right at the wraparound point.
	parms.projectionMatrix[10] = Z_BUFFER_EPSILON - (zFar + zNear) / depth;
	parms.projectionMatrix[14] = -2 * zFar * zNear / depth;
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
		var distance = vecTo[0] * vecTo[0] + vecTo[1] * vecTo[1] + vecTo[2] * vecTo[2];

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
		var entityNum = (draw.sort >> QSORT_ENTITYNUM_SHIFT) % MAX_GENTITIES;

		if (shader.sort > SS.PORTAL) {
			break;
		}

		// No shader should ever have this sort type.
		if (shader.sort === SS.BAD) {
			error('Shader \'' + shader.name + '\' with sort === SS.BAD');
		}

		// If the mirror was completely clipped away, we may need to check another surface.
		if (RenderMirrorView(geo, entityNum)) {
			// // This is a debug option to see exactly what is being mirrored
			// if (r_portalOnly()) {
			// 	return;
			// }
			break;  // only one mirror view at a time
		}
	}

	RenderDrawGeometry(first, last);
}

/**
 * GenerateDrawGeometry
 */
function GenerateDrawGeometry() {
	AddWorldGeometry();
	AddEntityGeometry();

	// We know the size of the clipping volume. Now set the rest of the projection matrix.
	SetupProjectionMatrixZ();
}

/**
 * AddDrawGeometry
 */
function AddDrawGeometry(geo, shader/*, fogIndex*/) {
	// Instead of checking for overflow, we just mask the index so it wraps around.
	var index = re.refdef.numDrawGeom % MAX_DRAWGEOM;
	// The sort data is packed into a single 32 bit value so it can be
	// compared quickly during the qsorting process.
	backend.drawGeom[index].sort = (shader.sortedIndex << QSORT_SHADERNUM_SHIFT) |
	    (re.currentEntityNum << QSORT_ENTITYNUM_SHIFT)/* |
	    (fogIndex << QSORT_FOGNUM_SHIFT)*/;
	backend.drawGeom[index].geo = geo;

	re.refdef.numDrawGeom++;
}

/**
 * SortDrawGeometry
 */
function SortDrawGeometry(start, end) {
	QMath.RadixSort(backend.drawGeom, 'sort', start, end);
}

/**
 * AddWorldGeometry
 */
function AddWorldGeometry() {
	if (re.refdef.rdflags & RDF.NOWORLDMODEL) {
		return;
	}

	re.currentEntityNum = ENTITYNUM_WORLD;

	// Determine which leaves are in the PVS / areamask.
	MarkLeaves();

	// Clear out the visible min/max.
	QMath.ClearBounds(re.viewParms.visBounds[0], re.viewParms.visBounds[1]);

	if (re.skyShader) {
		AddDrawGeometry(re.skydomeGeo, re.skyShader);
	}

	// Perform frustum culling and add all the potentially visible surfaces.
	RecursiveWorldNode(re.world.nodes[0], 15);
}

/**
 * AddBrushModelGeometry
 */
function AddBrushModelGeometry(refent) {
	var mod = GetModelByHandle(refent.hModel);
	var bmodel = mod.bmodel;
	var faces = re.world.surfaces;

	var clip = CullLocalBox(bmodel.bounds);
	if (clip === CULL.OUT) {
		return;
	}

	SetupEntityLighting(refent);
	// R_DlightBmodel( bmodel );

	for (var i = 0; i < bmodel.numSurfaces; i++) {
		var face = faces[bmodel.firstSurface + i];
		AddWorldSurface(face, true);
	}
}

/**
 * MarkLeaves
 */
function MarkLeaves() {
	var world = re.world;
	var nodes = world.nodes;

	// Get current viewcluster.
	var leaf = PointInLeaf(re.viewParms.pvsOrigin);
	var viewCluster = leaf.cluster;

	// If the cluster is the same and the area visibility matrix
	// hasn't changed, we don't need to mark everything again.
	if (re.viewCluster === viewCluster) {
		return;
	}

	re.viewCluster = viewCluster;
	re.visCount++;

	// If we're not in a valid vis cluster, mark everything visible.
	if (re.viewCluster === -1) {
		for (var i = 0, numNodes = nodes.length; i < numNodes; i++) {
			if (nodes[i].contents !== CONTENTS.SOLID) {
				nodes[i].visframe = re.visCount;
			}
		}
		return;
	}

	for (var i = 0, numNodes = nodes.length; i < numNodes; i++) {
		var node = nodes[i];
		var cluster = node.cluster;

		if (cluster < 0 || cluster >= world.numClusters) {
			continue;
		}

		// Check general PVS.
		if (!ClusterVisible(re.viewCluster, cluster)) {
			continue;
		}

		// Check for door connection.
		/*if ( (tr.refdef.areamask[node->area>>3] & (1<<(node->area&7)) ) ) {
			continue;		// not visible
		}*/

		var parent = node;
		while (parent) {
			if (parent.visframe === re.visCount) {
				break;
			}
			parent.visframe = re.visCount;
			parent = parent.parent;
		}
	}
}

/**
 * PointInLeaf
 */
function PointInLeaf(p) {
	if (!re.world) {
		com.Error('PointInLeaf: bad model');
	}

	var node = re.world.nodes[0];

	while (1) {
		if (!node.children) {
			break;
		}
		var plane = node.plane;
		var d = vec3.dot(p, plane.normal) - plane.dist;

		if (d > 0) {
			node = node.children[0];
		} else {
			node = node.children[1];
		}
	}

	return node;
}

/**
 * ClusterVisible
 */
function ClusterVisible(current, test) {
	var world = re.world;

	if (!world || !world.vis || current === test || current == -1) {
		return true;
	}

	var offset = current * world.clusterBytes;
	return (world.vis[offset + (test >> 3)] & (1 << (test & 7))) !== 0;
}

/**
 * RecursiveWorldNode
 */
function RecursiveWorldNode(node, planeBits) {
	re.counts.nodes++;

	while (1) {
		// If the node wasn't marked as potentially visible, exit.
		if (node.visframe !== re.visCount) {
			return;
		}

		// If the bounding volume is outside the frustum, nothing
		// inside can be visible.
		// OPTIMIZE: don't do this all the way to leafs?
		if (!r_nocull()) {
			var r;

			if (planeBits & 1) {
				r = QMath.BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[0]);
				if (r === QMath.SIDE_BACK) {
					return;                      // culled
				} else if (r === QMath.SIDE_FRONT) {
					planeBits &= ~1;             // all descendants will also be in front
				}
			}

			if (planeBits & 2) {
				r = QMath.BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[1]);
				if (r === QMath.SIDE_BACK) {
					return;                      // culled
				} else if (r === QMath.SIDE_FRONT) {
					planeBits &= ~2;             // all descendants will also be in front
				}
			}

			if (planeBits & 4) {
				r = QMath.BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[2]);
				if (r === QMath.SIDE_BACK) {
					return;                      // culled
				} else if (r == QMath.SIDE_FRONT) {
					planeBits &= ~4;             // all descendants will also be in front
				}
			}

			if (planeBits & 8) {
				r = QMath.BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[3]);
				if (r === QMath.SIDE_BACK) {
					return;                      // culled
				} else if (r === QMath.SIDE_FRONT) {
					planeBits &= ~8;             // all descendants will also be in front
				}
			}
		}

		if (!node.children) {
			break;
		}

		// AP - Leaving this out and calculating per surface.
		// Surfaces can span multiple nodes, meaning we'd have to merge
		// the surfaces's dlightBits with the dlightBits from each leaf node
		// that hits it. Quake3 kind of does this, but is ultimately broken.
		// // Determine the dlights that are touching this node.
		// var newDlights = [0, 0];

		// if (dlightBits) {
		// 	for (var i = 0; i < re.refdef.numDlights; i++) {
		// 		if (dlightBits & (1 << i)) {
		// 			var dl = backend.dlights[i];
		// 			var dist = vec3.dot(dl.origin, node.plane.normal) - node.plane.dist;

		// 			if (dist > -dl.radius) {
		// 				newDlights[0] |= (1 << i);
		// 			}

		// 			if (dist < dl.radius) {
		// 				newDlights[1] |= (1 << i);
		// 			}
		// 		}
		// 	}
		// }

		// Node is just a decision point, so go down both sides.
		// Since we don't care about sort orders, just go positive to negative.

		// Recurse down the children, front side first.
		RecursiveWorldNode(node.children[0], planeBits);

		// Tail recurse.
		node = node.children[1];
	}

	re.counts.leafs++;

	// Add to z buffer bounds.
	var parms = re.viewParms;

	if (node.mins[0] < parms.visBounds[0][0]) {
		parms.visBounds[0][0] = node.mins[0] * 2;
	}
	if (node.mins[1] < parms.visBounds[0][1]) {
		parms.visBounds[0][1] = node.mins[1] * 2;
	}
	if (node.mins[2] < parms.visBounds[0][2]) {
		parms.visBounds[0][2] = node.mins[2] * 2;
	}

	if (node.maxs[0] > parms.visBounds[1][0]) {
		parms.visBounds[1][0] = node.maxs[0] * 2;
	}
	if (node.maxs[1] > parms.visBounds[1][1]) {
		parms.visBounds[1][1] = node.maxs[1] * 2;
	}
	if (node.maxs[2] > parms.visBounds[1][2]) {
		parms.visBounds[1][2] = node.maxs[2] * 2;
	}

	// Add the individual surfaces.
	var faces = re.world.surfaces;
	var leafSurfaces = re.world.leafSurfaces;

	for (var i = 0; i < node.numLeafSurfaces; i++) {
		var face = faces[leafSurfaces[node.firstLeafSurface + i]];
		AddWorldSurface(face, false);
	}
}

/**
 * AddWorldSurface
 *
 * Since the world has been pre-compiled into groups of surfaces,
 * we use the compiled surface as the check for non-bmodel surfaces
 * to keep from adding duplicates to the draw list.
 */
function AddWorldSurface(surf, isBmodel) {
	if (!surf.geo) {
		return;  // sky surfaces
	}

	re.counts.surfaces++;

	// The surface may have already been added if it spans multiple leafs.
	if (surf.geo.viewCount === re.viewCount) {
		return;  // already in this view
	}
	surf.geo.viewCount = re.viewCount;

	// Setup dlight info.
	surf.geo.dlightBits = DlightSurface(surf);

	AddDrawGeometry(surf.geo, surf.shader);
}

/**
 * DlightSurface
 *
 * The given surface is going to be drawn, and it touches a leaf
 * that is touched by one or more dlights, so try to throw out
 * more dlights if possible.
 */
function DlightSurface(surf) {
	var dlightBits = 0;

	if (surf.surfaceType === SF.FACE) {
		dlightBits = DlightFace(surf);
	} /*else if ( *surf->data == SF_GRID ) {
		dlightBits = R_DlightGrid( (srfGridMesh_t *)surf->data, dlightBits );
	}*/ else if (surf.surfaceType === SF.TRIANGLES) {
		dlightBits = DlightTrisurf(surf);
	}

	// if (dlightBits) {
	// 	tr.pc.c_dlightSurfaces++;
	// }

	return dlightBits;
}

/**
 * DlightFace
 */
function DlightFace(face) {
	var dlightBits = 0;

	for (var i = 0; i < re.refdef.numDlights; i++) {
		var dl = backend.dlights[i];
		var d = vec3.dot(dl.origin, face.plane.normal) - face.plane.dist;
		if (d >= -dl.radius || d <= dl.radius) {
			dlightBits |= (1 << i);
		}
	}

	// if ( !dlightBits ) {
	// 	tr.pc.c_dlightSurfacesCulled++;
	// }

	return dlightBits;
}

// static int R_DlightGrid( srfGridMesh_t *grid, int dlightBits ) {
// 	int			i;
// 	dlight_t	*dl;

// 	for ( i = 0 ; i < tr.refdef.num_dlights ; i++ ) {
// 		if ( ! ( dlightBits & ( 1 << i ) ) ) {
// 			continue;
// 		}
// 		dl = &tr.refdef.dlights[i];
// 		if ( dl->origin[0] - dl->radius > grid->meshBounds[1][0]
// 			|| dl->origin[0] + dl->radius < grid->meshBounds[0][0]
// 			|| dl->origin[1] - dl->radius > grid->meshBounds[1][1]
// 			|| dl->origin[1] + dl->radius < grid->meshBounds[0][1]
// 			|| dl->origin[2] - dl->radius > grid->meshBounds[1][2]
// 			|| dl->origin[2] + dl->radius < grid->meshBounds[0][2] ) {
// 			// dlight doesn't reach the bounds
// 			dlightBits &= ~( 1 << i );
// 		}
// 	}

// 	if ( !dlightBits ) {
// 		tr.pc.c_dlightSurfacesCulled++;
// 	}

// 	grid->dlightBits[ tr.smpFrame ] = dlightBits;
// 	return dlightBits;
// }

/**
 * DlightTrisurf
 */
function DlightTrisurf(surf) {
	// FIXME: more dlight culling to trisurfs...
	var dlightBits = (1 << re.refdef.numDlights) - 1;
	return dlightBits;
// #if 0
// 	int			i;
// 	dlight_t	*dl;

// 	for ( i = 0 ; i < tr.refdef.num_dlights ; i++ ) {
// 		if ( ! ( dlightBits & ( 1 << i ) ) ) {
// 			continue;
// 		}
// 		dl = &tr.refdef.dlights[i];
// 		if ( dl->origin[0] - dl->radius > grid->meshBounds[1][0]
// 			|| dl->origin[0] + dl->radius < grid->meshBounds[0][0]
// 			|| dl->origin[1] - dl->radius > grid->meshBounds[1][1]
// 			|| dl->origin[1] + dl->radius < grid->meshBounds[0][1]
// 			|| dl->origin[2] - dl->radius > grid->meshBounds[1][2]
// 			|| dl->origin[2] + dl->radius < grid->meshBounds[0][2] ) {
// 			// dlight doesn't reach the bounds
// 			dlightBits &= ~( 1 << i );
// 		}
// 	}

// 	if ( !dlightBits ) {
// 		tr.pc.c_dlightSurfacesCulled++;
// 	}

// 	grid->dlightBits[ tr.smpFrame ] = dlightBits;
// 	return dlightBits;
// #endif
}

/**
 * AddEntityGeometry
 */
function AddEntityGeometry() {
	for (var i = 0; i < re.refdef.numRefEnts; i++) {
		var refent = backend.refents[i];

		re.currentEntityNum = i;

		//
		// The weapon model must be handled special,
		// we don't want the hacked weapon position showing in
		// mirrors, because the true body position will already be drawn
		//
		if ((refent.renderfx & RF.FIRST_PERSON) && re.viewParms.isPortal) {
			continue;
		}

		// Simple generated models, like sprites and beams, are not culled.
		switch (refent.reType) {
			case RT.PORTALSURFACE:
				break;  // don't draw anything
			case RT.POLY:
			case RT.SPRITE:
			case RT.BEAM:
			case RT.LIGHTNING:
			case RT.RAIL_CORE:
				// Self blood sprites, talk balloons, etc should not be drawn in the primary
				// view. We can't just do this check for all entities, because md3
				// entities may still want to cast shadows from them.
				if ((refent.renderfx & RF.THIRD_PERSON) && !re.viewParms.isPortal) {
					continue;
				}
				var shader = GetShaderByHandle(refent.customShader);
				AddDrawGeometry(entityGeo, shader, 0);
				break;

			case RT.MODEL:
				// We must set up parts of re.or for model culling.
				RotateForEntity(refent, re.viewParms, re.or);

				var mod = GetModelByHandle(refent.hModel);

				switch (mod.type) {
					case MOD.MD3:
						AddMd3Surfaces(refent);
						break;

					case MOD.BRUSH:
						// AddBrushModelSurfaces(refent);
						break;
				}
				break;

			default:
				com.Error('AddEntityGeos: BadGeometry');
				break;
		}
	}
}

/**
 * AddMd3Surfaces
 */
function AddMd3Surfaces(refent) {
	var mod = GetModelByHandle(refent.hModel);

	if (mod.type === MOD.BAD) {
		return;  // failed to load
	}

	// Don't add third_person objects if not in a portal.
	var personalModel = (refent.renderfx & RF.THIRD_PERSON) && !re.viewParms.isPortal;

	/*if (ent->e.renderfx & RF_WRAP_FRAMES) {
		ent->e.frame %= tr.currentModel->md3[0]->numFrames;
		ent->e.oldframe %= tr.currentModel->md3[0]->numFrames;
	}*/

	// Validate the frames so there is no chance of a crash.
	// This will write directly into the entity structure, so
	// when the surfaces are rendered, they don't need to be
	// range checked again.
	/*if ((ent->e.frame >= tr.currentModel->md3[0]->numFrames)
		|| (ent->e.frame < 0)
		|| (ent->e.oldframe >= tr.currentModel->md3[0]->numFrames)
		|| (ent->e.oldframe < 0)) {
			ri.Printf( PRINT_DEVELOPER, "R_AddMD3Surfaces: no such frame %d to %d for '%s'\n",
				ent->e.oldframe, ent->e.frame,
				tr.currentModel->name );
			ent->e.frame = 0;
			ent->e.oldframe = 0;
	}*/

	// // Compute LOD.
	// var lod = ComputeLOD(refent);
	// var md3 = mod.md3[lod];
	var md3 = mod.md3;

	// Cull the entire model if merged bounding box of both frames
	// is outside the view frustum.
	var cull = CullModel(md3, refent);
	if (cull === CULL.OUT) {
		return;
	}

	// Set up lighting now that we know we aren't culled.
	if (!personalModel) {
		SetupEntityLighting(refent);
	}

	// See if we are in a fog volume.
	//var fogNum = R_ComputeFogNum( header, ent );

	//
	// Draw all surfaces.
	//
	for (var i = 0; i < md3.surfaces.length; i++) {
		var surface = md3.surfaces[i];

		var shader;
		if (refent.customShader) {
			shader = GetShaderByHandle(refent.customShader);
		} else if (refent.customSkin) {
			var skin = GetSkinByHandle(refent.customSkin);

			// Match the surface name to something in the skin file.
			shader = re.shaders[0];

			for (var j = 0; j < skin.surfaces.length; j++) {
				// The names have both been lowercased.
				if (skin.surfaces[j].name === surface.name) {
					shader = skin.surfaces[j].shader;
					break;
				}
			}
		} else {
			if (surface.shaders.length <= 0) {
				shader = re.shaders[0];
			} else {
				shader = surface.shaders[refent.skinNum % surface.shaders.length];
			}
		}

		// We will add shadows even if the main object isn't visible in the view

		// // Stencil shadows can't do personal models unless I polyhedron clip.
		// if ( !personalModel
		//      && r_shadows->integer == 2
		//      && fogNum == 0
		//      && !(ent->e.renderfx & ( RF_NOSHADOW | RF_DEPTHHACK ) )
		//      && shader->sort == SS_OPAQUE ) {
		//      R_AddDrawSurf( (void *)surface, tr.shadowShader, 0, false );
		// }

		// // Projection shadows work fine with personal models.
		// if (r_shadows->integer == 3
		//      && fogNum == 0
		//      && (ent->e.renderfx & RF_SHADOW_PLANE )
		//      && shader->sort == SS_OPAQUE ) {
		//      R_AddDrawSurf( (void *)surface, tr.projectionShadowShader, 0, false );
		// }

		// Don't add third_person objects if not viewing through a portal.
		if (!personalModel) {
			AddDrawGeometry(surface.geo, shader, 0);
		}
	}
}

/**
 * ComputeLOD
 */
function ComputeLOD(refent) {
	var mod = GetModelByHandle(refent.hModel);
	var lod;

	if (mod.numLods < 2) {
		// Model has only 1 LOD level, skip computations and bias.
		lod = 0;
	} else {
		// Multiple LODs exist, so compute projected bounding sphere
		// and use that as a criteria for selecting LOD.
		var frame = mod.md3.frames[refent.frame];
		var radius = QMath.RadiusFromBounds(frame.bounds[0], frame.bounds[1]);

		var flod;

		var projectedRadius;
		if ((projectedRadius = ProjectRadius(radius, refent.origin)) !== 0) {
			var lodscale = r_lodscale();
			if (lodscale > 20) {
				lodscale = 20;
			}
			flod = 1.0 - projectedRadius * lodscale;
		} else {
			// Object intersects near view plane, e.g. view weapon.
			flod = 0;
		}

		flod *= mod.numLods;
		lod = parseInt(Math.round(flod), 10);

		if (lod < 0) {
			lod = 0;
		} else if (lod >= mod.numLods) {
			lod = mod.numLods - 1;
		}
	}

	// lod += r_lodbias.integer;

	if (lod >= mod.numLods) {
		lod = mod.numLods - 1;
	} else if (lod < 0) {
		lod = 0;
	}

	return lod;
}

/**
 * ProjectRadius
 */
function ProjectRadius(r, location) {
	var parms = re.viewParms;
	var p = vec3.create();
	var projected = vec4.create();

	var c = vec3.dot(parms.or.axis[0], parms.or.origin);
	var dist = vec3.dot(parms.or.axis[0], location) - c;
	if (dist <= 0) {
		return 0;
	}

	p[0] = 0;
	p[1] = Math.abs(r);
	p[2] = -dist;

	projected[0] = p[0] * parms.projectionMatrix[0] +
	               p[1] * parms.projectionMatrix[4] +
	               p[2] * parms.projectionMatrix[8] +
	               parms.projectionMatrix[12];

	projected[1] = p[0] * parms.projectionMatrix[1] +
	               p[1] * parms.projectionMatrix[5] +
	               p[2] * parms.projectionMatrix[9] +
	               parms.projectionMatrix[13];

	projected[2] = p[0] * parms.projectionMatrix[2] +
	               p[1] * parms.projectionMatrix[6] +
	               p[2] * parms.projectionMatrix[10] +
				   parms.projectionMatrix[14];

	projected[3] = p[0] * parms.projectionMatrix[3] +
	               p[1] * parms.projectionMatrix[7] +
	               p[2] * parms.projectionMatrix[11] +
	               parms.projectionMatrix[15];

	var pr = projected[1] / projected[3];
	if (pr > 1.0) {
		pr = 1.0;
	}

	return pr;
}

/**
 * CullModel
 */
function CullModel(md3, refent) {
	var newFrame = md3.frames[refent.frame];
	var oldFrame = md3.frames[refent.oldFrame];

	// Cull bounding sphere ONLY if this is not an upscaled entity.
	if (!refent.nonNormalizedAxes) {
		if (refent.frame === refent.oldframe) {
			switch (CullLocalPointAndRadius(newFrame.localOrigin, newFrame.radius)) {
				case CULL.OUT:
					re.counts.culledModelOut++;
					return CULL.OUT;

				case CULL.IN:
					re.counts.culledModelIn++;
					return CULL.IN;

				case CULL.CLIP:
					re.counts.culledModelClip++;
					break;
			}
		} else {
			var sphereCull  = CullLocalPointAndRadius(newFrame.localOrigin, newFrame.radius);
			var sphereCullB;

			if (newFrame === oldFrame) {
				sphereCullB = sphereCull;
			} else {
				sphereCullB = CullLocalPointAndRadius(oldFrame.localOrigin, oldFrame.radius);
			}

			if (sphereCull === sphereCullB) {
				if (sphereCull === CULL.OUT) {
					re.counts.culledModelOut++;
					return CULL.OUT;
				} else if (sphereCull === CULL.IN) {
					re.counts.culledModelIn++;
					return CULL.IN;
				} else {
					re.counts.culledModelClip++;
				}
			}
		}
	}

	// Calculate a bounding box in the current coordinate system.
	var bounds = [
		vec3.create(),
		vec3.create()
	];

	for (var i = 0 ; i < 3 ; i++) {
		bounds[0][i] = oldFrame.bounds[0][i] < newFrame.bounds[0][i] ? oldFrame.bounds[0][i] : newFrame.bounds[0][i];
		bounds[1][i] = oldFrame.bounds[1][i] > newFrame.bounds[1][i] ? oldFrame.bounds[1][i] : newFrame.bounds[1][i];
	}

	switch (CullLocalBox(bounds)) {
		case CULL.OUT:
			re.counts.culledModelOut++;
			return CULL.OUT;
		case CULL.IN:
			re.counts.culledModelIn++;
			return CULL.IN;
		case CULL.CLIP:
			re.counts.culledModelClip++;
			return CULL.CLIP;
		default:
			com.Error('Invalid cull result');
	}
}

/*
 * LocalNormalToWorld
 */
function LocalNormalToWorld (local, world) {
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

/**
 * TransformModelToClip
 */
function TransformModelToClip(src, modelMatrix, projectionMatrix, eye, dst) {
	for (var i = 0; i < 4; i++) {
		eye[i] = src[0] * modelMatrix[i + 0 * 4] +
		         src[1] * modelMatrix[i + 1 * 4] +
		         src[2] * modelMatrix[i + 2 * 4] +
		         1 * modelMatrix[i + 3 * 4];
	}

	for (var i = 0; i < 4; i++) {
		dst[i] = eye[0] * projectionMatrix[i + 0 * 4] +
		         eye[1] * projectionMatrix[i + 1 * 4] +
		         eye[2] * projectionMatrix[i + 2 * 4] +
		         eye[3] * projectionMatrix[i + 3 * 4];
	}
}