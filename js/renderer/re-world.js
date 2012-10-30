/**
 * BuildWorldBuffers
 */
function BuildWorldBuffers() {
	var faces = re.world.faces,
		verts = re.world.verts,
		meshVerts = re.world.meshVerts,
		shaders = re.world.shaders;

	// Compile vert list.
	var vertices = new Array(verts.length*14);
	var offset = 0;
	for (var i = 0; i < verts.length; i++) {
		var vert = verts[i];

		vertices[offset++] = vert.pos[0];
		vertices[offset++] = vert.pos[1];
		vertices[offset++] = vert.pos[2];

		vertices[offset++] = vert.texCoord[0];
		vertices[offset++] = vert.texCoord[1];

		vertices[offset++] = vert.lmCoord[0];
		vertices[offset++] = vert.lmCoord[1];

		vertices[offset++] = vert.normal[0];
		vertices[offset++] = vert.normal[1];
		vertices[offset++] = vert.normal[2];

		vertices[offset++] = vert.color[0];
		vertices[offset++] = vert.color[1];
		vertices[offset++] = vert.color[2];
		vertices[offset++] = vert.color[3];
	}

	// Start setting up shader map (groups faces by shader).
	re.worldShaderMap = [];

	for (var i = 0; i < faces.length; i++) {
		var face = faces[i];
		var shader = face.shader;
		var entry = re.worldShaderMap[shader.index];

		if (!entry) {
			entry = re.worldShaderMap[shader.index] = {
				faces: [],
				indexOffset: 0,
				elementCount: 0
			};
		}

		entry.faces.push(face);
	}
		
	// Compile index list / shader map.
	var indices = new Array();

	for (var i = 0; i < re.worldShaderMap.length; i++) {
		var entry = re.worldShaderMap[i];

		if (!entry) {
			continue;
		}

		entry.indexOffset = indices.length * 2; // Offset is in bytes

		for (var j = 0; j < entry.faces.length; j++) {
			var face = entry.faces[j];

			for (var k = 0; k < face.meshVertCount; k++) {
				indices.push(face.vertex + meshVerts[face.meshVert + k]);
			}

			entry.elementCount += face.meshVertCount;
		}
		
		entry.faces = null; // Don't need this in memory anymore.
	}

	re.worldVertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, re.worldVertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	re.worldIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, re.worldIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	// We no longer need the vert info, let's free up ~8mb of memory.
	re.world.verts = null;
	re.world.meshVerts = null;
}

/**
 * CmdShowCluster
 */
function CmdShowCluster() {
	var leaf = PointInLeaf(re.viewParms.pvsOrigin);	
	console.log('Current cluster: ' + leaf.cluster);
}

/**
 * PointInLeaf
 */
function PointInLeaf(p) {
	if (!re.world) {
		throw new Error('PointInLeaf: bad model');
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
			if (nodes[i].contents != ContentTypes.SOLID) {
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

function AddWorldSurface(surf/*, dlightBits*/) {
	if (surf.viewCount === re.viewCount) {
		return; // already in this view
	}

	surf.viewCount = re.viewCount;

	// try to cull before dlighting or adding
	if (CullSurface(surf, surf.shader)) {
		return;
	}

	// check for dlighting
	/*if (dlightBits ) {
		dlightBits = DlightSurface(surf, dlightBits);
		dlightBits = (dlightBits !== 0);
	}*/

	AddDrawSurf(surf, surf.shader, ENTITYNUM_WORLD);
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

	if (surface.type === SurfaceType.GRID/*SurfaceType.GRID*/) {
		//return R_CullGrid( (srfGridMesh_t *)surface );
		return false;
	}

	/*if ( *surface == SF_TRIANGLES ) {
		return R_CullTriSurf( (srfTriangles_t *)surface );
	}*/

	if (surface.type !== SurfaceType.FACE) {
		return false;
	}

	if (!shader.cull) {
		return false;
	}

	var d = vec3.dot(re.viewParms.or.origin, surface.plane.normal);

	// Don't cull exactly on the plane, because there are levels of rounding
	// through the BSP, ICD, and hardware that may cause pixel gaps if an
	// epsilon isn't allowed here.
	if (shader.cull === 'front') {
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
				r = BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[0]);
				if (r === 2) {
					return;                      // culled
				} else if (r === 1) {
					planeBits &= ~1;             // all descendants will also be in front
				}
			}

			if (planeBits & 2) {
				r = BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[1]);
				if (r === 2) {
					return;                      // culled
				} else if (r === 1) {
					planeBits &= ~2;             // all descendants will also be in front
				}
			}

			if (planeBits & 4) {
				r = BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[2]);
				if (r === 2) {
					return;                      // culled
				} else if (r == 1) {
					planeBits &= ~4;             // all descendants will also be in front
				}
			}

			if (planeBits & 8) {
				r = BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[3]);
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

	// add the individual surfaces
	var faces = re.world.faces;
	var leafSurfaces = re.world.leafSurfaces;

	for (var i = 0; i < node.numLeafSurfaces; i++) {
		var face = faces[leafSurfaces[node.firstLeafSurface + i]];
		// The surface may have already been added if it spans multiple leafs.
		AddWorldSurface(face/*, dlightBits*/);
	}
}

/**
 * AddWorldSurfaces
 */
function AddWorldSurfaces(map) {
	MarkLeaves();
	RecursiveWorldNode(re.world.nodes[0], 15);
	/*var faces = re.world.faces;
	for (var i = 0; i < faces.length; i++) {
		AddWorldSurface(faces[i]);
	}*/
}