/**
 * BuildWorldBuffers
 */
function BuildWorldBuffers() {
	var world = re.world;
	var faces = world.faces;
	var verts = world.verts;
	var meshVerts = world.meshVerts;

	// 
	// Setup vertex buffers.
	//
	var buffers    = backend.worldBuffers = {};
	var xyz        = buffers.xyz          = CreateBuffer('float32', 3, verts.length);
	var normal     = buffers.normal       = CreateBuffer('float32', 3, verts.length);
	var texCoord   = buffers.texCoord     = CreateBuffer('float32', 2, verts.length);
	var lightCoord = buffers.lightCoord   = CreateBuffer('float32', 2, verts.length);
	var color      = buffers.color        = CreateBuffer('float32', 4, verts.length);

	for (var i = 0; i < verts.length; i++) {
		var vert = verts[i];

		xyz.data[xyz.offset++] = vert.pos[0];
		xyz.data[xyz.offset++] = vert.pos[1];
		xyz.data[xyz.offset++] = vert.pos[2];

		normal.data[normal.offset++] = vert.normal[0];
		normal.data[normal.offset++] = vert.normal[1];
		normal.data[normal.offset++] = vert.normal[2];

		texCoord.data[texCoord.offset++] = vert.texCoord[0];
		texCoord.data[texCoord.offset++] = vert.texCoord[1];

		lightCoord.data[lightCoord.offset++] = vert.lmCoord[0];
		lightCoord.data[lightCoord.offset++] = vert.lmCoord[1];

		color.data[color.offset++] = vert.color[0];
		color.data[color.offset++] = vert.color[1];
		color.data[color.offset++] = vert.color[2];
		color.data[color.offset++] = vert.color[3];
	}

	xyz.modified = true;
	normal.modified = true;
	texCoord.modified = true;
	lightCoord.modified = true;
	color.modified = true;

	//
	// For the world data, we go ahead and group faces by shader (just as the render loop
	// would) in order to avoid uploading a new index buffer each frame.
	//
	world.rsurfs = [];

	var numIndexes = 0;

	for (var i = 0; i < faces.length; i++) {
		var face = faces[i];

		// Only add these surface types to the list.
		if (face.surfaceType !== SF.FACE &&
			face.surfaceType !== SF.GRID &&
			face.surfaceType !== SF.TRIANGLES) {
			continue;
		}

		var shader = face.shader;
		var rsurf = world.rsurfs[shader.index];

		if (!rsurf) {
			rsurf = world.rsurfs[shader.index] = new WorldSurface();
			rsurf.shader = shader;
		}

		// Link the face to the rsurf.
		face.rsurf = rsurf;

		// Push the face to the temp buffer so we can create
		// an index buffer;
		rsurf.faces.push(face);

		numIndexes += face.meshVertCount;
	}

	//
	// Create the pre-sorted index buffer.
	//
	var index = buffers.index = CreateBuffer('uint16', 1, numIndexes, true);

	for (var i = 0; i < world.rsurfs.length; i++) {
		var rsurf = world.rsurfs[i];
		if (!rsurf) {
			continue;
		}

		rsurf.indexOffset = index.elementCount;

		for (var j = 0; j < rsurf.faces.length; j++) {
			var face = rsurf.faces[j];

			for (var k = 0; k < face.meshVertCount; k++) {
				index.data[index.offset++] = face.vertex + meshVerts[face.meshVert + k];
			}

			rsurf.elementCount += face.meshVertCount;
		}

		// Don't need this in memory anymore.
		rsurf.faces = null;
	}

	index.modified = true;

	LockBuffer(index);
	LockBuffer(xyz);
	LockBuffer(normal);
	LockBuffer(texCoord);
	LockBuffer(lightCoord);
	LockBuffer(color);

	// We no longer need the vert info, let's free up ~8mb of memory.
	re.world.verts = null;
	re.world.meshVerts = null;
}

/**
 * BuildCollisionBuffers
 */
function BuildCollisionBuffers() {
	var buffers = backend.cmBuffers = {
		index: CreateBuffer('uint16',  1, 0xFFFF, true),
		xyz:   CreateBuffer('float32', 3, 0xFFFF)
	};

	var index = buffers.index;
	var xyz = buffers.xyz;

	ResetBuffer(index);
	ResetBuffer(xyz);
	
	var tessFn = function (pts) {
		for (var i = 0; i < pts.length; i++) {
			var pt = pts[i];
			xyz.data[xyz.offset++] = pt[0];
			xyz.data[xyz.offset++] = pt[1];
			xyz.data[xyz.offset++] = pt[2];
			index.data[index.offset++] = index.elementCount;
		}
	};

	xyz.modified = true;
	index.modified = true;

	cm.EmitCollisionSurfaces(tessFn);
}

/**
 * CmdShowCluster
 */
function CmdShowCluster() {
	var leaf = PointInLeaf(re.viewParms.pvsOrigin);	
	log('Current cluster: ' + leaf.cluster);
}

/**
 * AddWorldSurfaces
 */
function AddWorldSurfaces(map) {
	MarkLeaves();
	RecursiveWorldNode(re.world.nodes[0], 15);
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

	/*if (re.viewCluster == -1 ) {
		for (var i = 0, numNodes = nodes.length; i < numNodes; i++) {
			if (nodes[i].contents != CONTENTS.SOLID) {
				nodes[i].visframe = re.visCount;
			}
		}
		return;
	}*/

	for (var i = 0, numNodes = nodes.length; i < numNodes; i++) {
		var node = nodes[i];
		var cluster = node.cluster;

		if (cluster < 0 || cluster >= world.numClusters) {
			continue;
		}

		// check general pvs
		if (!ClusterVisible(re.viewCluster, cluster)) {
			continue;
		}

		// check for door connection
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
		com.error(ERR.DROP, 'PointInLeaf: bad model');
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
function RecursiveWorldNode(node, planeBits/*, dlightBits*/) {
	while (1) {
		// if the node wasn't marked as potentially visible, exit
		if (node.visframe != re.visCount) {
			return;
		}

		// if the bounding volume is outside the frustum, nothing
		// inside can be visible OPTIMIZE: don't do this all the way to leafs?
		if (true/*!r_nocull->integer*/) {
			var r;

			if (planeBits & 1) {
				r = QMath.BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[0]);
				if (r === 2) {
					return;                      // culled
				} else if (r === 1) {
					planeBits &= ~1;             // all descendants will also be in front
				}
			}

			if (planeBits & 2) {
				r = QMath.BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[1]);
				if (r === 2) {
					return;                      // culled
				} else if (r === 1) {
					planeBits &= ~2;             // all descendants will also be in front
				}
			}

			if (planeBits & 4) {
				r = QMath.BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[2]);
				if (r === 2) {
					return;                      // culled
				} else if (r == 1) {
					planeBits &= ~4;             // all descendants will also be in front
				}
			}

			if (planeBits & 8) {
				r = QMath.BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[3]);
				if (r === 2) {
					return;                      // culled
				} else if (r === 1 ) {
					planeBits &= ~8;             // all descendants will also be in front
				}
			}
		}

		if (!node.children) {
			break;
		}

		// node is just a decision point, so go down both sides
		// since we don't care about sort orders, just go positive to negative

		// determine which dlights are needed
		/*var newDlights = [0, 0];

		if (dlightBits) {
			int	i;

			for ( i = 0 ; i < tr.refdef.num_dlights ; i++ ) {
				dlight_t	*dl;
				float		dist;

				if ( dlightBits & ( 1 << i ) ) {
					dl = &tr.refdef.dlights[i];
					dist = DotProduct( dl->origin, node->plane->normal ) - node->plane->dist;
					
					if ( dist > -dl->radius ) {
						newDlights[0] |= ( 1 << i );
					}
					if ( dist < dl->radius ) {
						newDlights[1] |= ( 1 << i );
					}
				}
			}
		}*/

		// recurse down the children, front side first
		RecursiveWorldNode(node.children[0], planeBits/*, newDlights[0]*/);

		// tail recurse
		node = node.children[1];
		/*dlightBits = newDlights[1];*/
	}

	// add to z buffer bounds
	var parms = re.viewParms;

	if (node.mins[0] < parms.visBounds[0][0]) {
		parms.visBounds[0][0] = node.mins[0];
	}
	if (node.mins[1] < parms.visBounds[0][1]) {
		parms.visBounds[0][1] = node.mins[1];
	}
	if (node.mins[2] < parms.visBounds[0][2]) {
		parms.visBounds[0][2] = node.mins[2];
	}

	if (node.maxs[0] > parms.visBounds[1][0]) {
		parms.visBounds[1][0] = node.maxs[0];
	}
	if (node.maxs[1] > parms.visBounds[1][1]) {
		parms.visBounds[1][1] = node.maxs[1];
	}
	if (node.maxs[2] > parms.visBounds[1][2]) {
		parms.visBounds[1][2] = node.maxs[2];
	}

	// Add the individual surfaces.
	var faces = re.world.faces;
	var leafSurfaces = re.world.leafSurfaces;

	for (var i = 0; i < node.numLeafSurfaces; i++) {
		var face = faces[leafSurfaces[node.firstLeafSurface + i]];
		// The surface may have already been added if it spans multiple leafs.
		AddWorldSurface(face/*, dlightBits*/);
	}
}

/**
 * AddWorldSurface
 */
function AddWorldSurface(face/*, dlightBits*/) {
	if (face.surfaceType === SF.BAD) {
		return;
	}

	if (face.rsurf.viewCount === re.viewCount) {
		return;  // already in this view
	}

	// TODO Probably shouldn't cull world surfaces as they're
	// grouped by shader and checking this when we're going batch
	// render if only one is visible probably isn't efficient.
	// Try to cull before dlighting or adding.
	if (CullSurface(face, face.shader)) {
		re.counts.culledFaces++;
		return;
	}

	face.rsurf.viewCount = re.viewCount;

	// check for dlighting
	/*if (dlightBits ) {
		dlightBits = DlightSurface(surf, dlightBits);
		dlightBits = (dlightBits !== 0);
	}*/

	AddDrawSurf(face.rsurf, face.shader, ENTITYNUM_WORLD);
}

/**
 * CullSurface
 * 
 * Tries to back face cull surfaces before they are lighted or
 * added to the sorting list.
 *
 * This will also allow mirrors on both sides of a model without recursion.
 */
function CullSurface(surface, shader) {
	if (!r_cull()) {
		return false;
	}

	if (surface.surfaceType === SF.GRID/*SF.GRID*/) {
		//return R_CullGrid( (srfGridMesh_t *)surface );
		return false;
	}

	/*if ( *surface == SF_TRIANGLES ) {
		return R_CullTriSurf( (srfTriangles_t *)surface );
	}*/

	if (surface.surfaceType !== SF.FACE) {
		return false;
	}

	if (!shader.cull) {
		return false;
	}

	var d = vec3.dot(re.viewParms.or.viewOrigin, surface.plane.normal);

	// Don't cull exactly on the plane, because there are levels of rounding
	// through the BSP, ICD, and hardware that may cause pixel gaps if an
	// epsilon isn't allowed here.
	if (shader.cull === gl.FRONT) {
		if (d < surface.plane.dist - 8) {
			return true;
		}
	} else {
		if (d > surface.plane.dist + 8) {
			return true;
		}
	}

	return false;
}