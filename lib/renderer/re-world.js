/**
 * BatchWorldSurfaces
 *
 * We go ahead and group world faces by shader (just as the render loop
 * would) and pre-compile the render buffers since this geometry is
 * going to stay static.
 */
function BatchWorldSurfaces() {
	var world = re.world;
	var nodes = world.nodes;
	var leafSurfaces = world.leafSurfaces;
	var faces = world.surfaces;
	var verts = world.verts;
	var meshVerts = world.meshVerts;

	// Group faces by shader.
	var groups = {};

	// Walk the nodes list lists to determine the faces to add,
	// as the raw face list has bmodel surfaces we don't
	// want to group together in our static render.
	var addFacesForNode = function (node) {
		for (var i = 0; i < node.numLeafSurfaces; i++) {
			var face = faces[leafSurfaces[node.firstLeafSurface + i]];
			var shader = face.shader;

			if (face.batch) {
				continue;  // we've already processed this face
			}

			// Add the surface to its batch.
			var group = groups[shader.name];

			if (!group) {
				group = groups[shader.name] = {
					numVerts: 0,
					numIndexes: 0,
					faces: []
				};

				group.batch = new BatchSurface();
				group.batch.shader = shader;
			}

			group.numVerts += face.vertCount;
			group.numIndexes += face.meshVertCount;
			group.faces.push(face);

			// Link the actual face to the batch.
			face.batch = group.batch;
		}

		if (node.children) {
			addFacesForNode(node.children[0]);
			addFacesForNode(node.children[1]);
		}
	};

	addFacesForNode(nodes[0]);

	// For each group of faces, create render buffers for the
	// composite compiled surface.
	var originalCmd = backend.tess;

	for (var key in groups) {
		if (!groups.hasOwnProperty(key)) {
			continue;
		}

		var group = groups[key];
		var batch = group.batch;

		var xyz        = batch.cmd.xyz        = CreateBuffer('float32', 3, group.numVerts);
		var normal     = batch.cmd.normal     = CreateBuffer('float32', 3, group.numVerts);
		var texCoord   = batch.cmd.texCoord   = CreateBuffer('float32', 2, group.numVerts);
		var lightCoord = batch.cmd.lightCoord = CreateBuffer('float32', 2, group.numVerts);
		var color      = batch.cmd.color      = CreateBuffer('uint8',   4, group.numVerts);
		var index      = batch.cmd.index      = CreateBuffer('uint16',  1, group.numIndexes, true);

		// Overwrite the current backend cmd so TesselateFace
		// writes to us.
		backend.tess = batch.cmd;

		var offset = index.elementCount;
		for (var j = 0; j < group.faces.length; j++) {
			TesselateFace(group.faces[j]);
		}
		batch.cmd.indexOffset = offset;
		batch.cmd.indexCount = index.elementCount - offset;

		xyz.modified = true;
		normal.modified = true;
		texCoord.modified = true;
		lightCoord.modified = true;
		color.modified = true;
		index.modified = true;
	}

	// Restore the original command.
	backend.tess = originalCmd;

	// We no longer need the vert info, let's free up the memory.
	// world.verts = null;
	// world.meshVerts = null;
}

/**
 * BuildCollisionBuffers
 */
function BuildCollisionBuffers() {
	var buffers = backend.collisionBuffers = {
		index: CreateBuffer('uint16',  1, 0xFFFF, true),
		xyz:   CreateBuffer('float32', 3, 0xFFFF)
	};

	var index = buffers.index;
	var xyz = buffers.xyz;

	var tessFn = function (pts) {
		for (var i = 0; i < pts.length; i++) {
			var pt = pts[i];
			index.data[index.offset++] = index.elementCount-1;
			xyz.data[xyz.offset++] = pt[0];
			xyz.data[xyz.offset++] = pt[1];
			xyz.data[xyz.offset++] = pt[2];
		}
	};

	index.modified = true;
	xyz.modified = true;

	cm.EmitCollisionSurfaces(tessFn);
}

/**
 * AddWorldSurfaces
 */
function AddWorldSurfaces(map) {
	if (re.refdef.rdflags & RDF.NOWORLDMODEL) {
		return;
	}

	re.currentEntityNum = ENTITYNUM_WORLD;

	// Determine which leaves are in the PVS / areamask.
	MarkLeaves();

	// Clear out the visible min/max.
	QMath.ClearBounds(re.viewParms.visBounds[0], re.viewParms.visBounds[1]);

	// Perform frustum culling and add all the potentially visible surfaces.
	RecursiveWorldNode(re.world.nodes[0], 15);
}

/**
 * AddBrushModelSurfaces
 */
function AddBrushModelSurfaces(refent) {
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
		com.Error(ERR.DROP, 'PointInLeaf: bad model');
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
function AddWorldSurface(face, isBmodel) {
	if (face.surfaceType === SF.BAD) {
		return;
	}
	re.counts.surfaces++;

	// The surface may have already been added if it spans multiple leafs.
	if (face.viewCount === re.viewCount) {
		return;  // already in this view
	}
	face.viewCount = re.viewCount;

	// Setup dlight info.
	DlightSurface(face);

	AddDrawSurf(face, face.shader, face.fogIndex);
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

	surf.dlightBits = dlightBits;
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