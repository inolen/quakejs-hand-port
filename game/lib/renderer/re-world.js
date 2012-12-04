/**
 * CompileWorldSurfaces
 *
 * We go ahead and group world faces by shader (just as the render loop
 * would) and pre-compile the render buffers since this geometry is
 * going to stay static.
 */
function CompileWorldSurfaces() {
	var world = re.world;
	var faces = world.faces;
	var verts = world.verts;
	var meshVerts = world.meshVerts;

	// Groups faces by shader.
	world.compiledFaces = [];

	for (var i = 0; i < faces.length; i++) {
		var face = faces[i];

		// Only add these surface types to the list.
		if (face.surfaceType !== SF.FACE &&
			face.surfaceType !== SF.GRID) {
			continue;
		}

		var shader = face.shader;
		var compiled = world.compiledFaces[shader.index];

		if (!compiled) {
			compiled = world.compiledFaces[shader.index] = new CompiledSurface();
			compiled.shader = shader;
		}

		// Link the actual face to the group for vis checks.
		face.compiled = compiled;

		compiled.numVerts += face.vertCount;
		compiled.numIndexes += face.meshVertCount;
		compiled.faces.push(face);
	}

	// For each group of faces, create render buffers for the
	// composite compiled surface.
	var originalCmd = backend.tess;

	for (var i = 0; i < world.compiledFaces.length; i++) {
		var compiled = world.compiledFaces[i];
		if (!compiled) {
			continue;
		}

		var xyz        = compiled.cmd.xyz        = CreateBuffer('float32', 3, compiled.numVerts);
		var normal     = compiled.cmd.normal     = CreateBuffer('float32', 3, compiled.numVerts);
		var texCoord   = compiled.cmd.texCoord   = CreateBuffer('float32', 2, compiled.numVerts);
		var lightCoord = compiled.cmd.lightCoord = CreateBuffer('float32', 2, compiled.numVerts);
		var color      = compiled.cmd.color      = CreateBuffer('uint8',   4, compiled.numVerts);
		var index      = compiled.cmd.index      = CreateBuffer('uint16',  1, compiled.numIndexes, true);

		// Overwrite the current backend cmd so TesselateFace
		// writes to us.
		backend.tess = compiled.cmd;

		compiled.cmd.indexOffset = index.elementCount;
		for (var j = 0; j < compiled.faces.length; j++) {
			TesselateFace(compiled.faces[j]);
		}
		compiled.cmd.elementCount = index.elementCount - compiled.cmd.indexOffset;

		xyz.modified = true;
		normal.modified = true;
		texCoord.modified = true;
		lightCoord.modified = true;
		color.modified = true;
		index.modified = true;

		LockBuffer(xyz);
		LockBuffer(normal);
		LockBuffer(texCoord);
		LockBuffer(lightCoord);
		LockBuffer(color);
		LockBuffer(index);
	}

	// Restore the original command.
	backend.tess = originalCmd;

	// We no longer need the vert info, let's free up the memory.
	world.verts = null;
	world.meshVerts = null;
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
	var faces = re.world.faces;
	
	var clip = CullLocalBox(bmodel.bounds);
	if (clip === CULL.OUT) {
		return;
	}
	
	SetupEntityLighting(refent);
	// R_DlightBmodel( bmodel );

	for (var i = 0; i < bmodel.numSurfaces; i++) {
		AddWorldSurface(faces[bmodel.firstSurface + i]/*, tr.currentEntity->needDlights*/);
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

	if (re.viewCluster == -1 ) {
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

		// Node is just a decision point, so go down both sides.
		// Since we don't care about sort orders, just go positive to negative.

		// // Determine which dlights are needed.
		// var newDlights = [0, 0];

		// if (dlightBits) {
		// 	int	i;

		// 	for ( i = 0 ; i < tr.refdef.num_dlights ; i++ ) {
		// 		dlight_t	*dl;
		// 		float		dist;

		// 		if ( dlightBits & ( 1 << i ) ) {
		// 			dl = &tr.refdef.dlights[i];
		// 			dist = DotProduct( dl->origin, node->plane->normal ) - node->plane->dist;
					
		// 			if ( dist > -dl->radius ) {
		// 				newDlights[0] |= ( 1 << i );
		// 			}
		// 			if ( dist < dl->radius ) {
		// 				newDlights[1] |= ( 1 << i );
		// 			}
		// 		}
		// 	}
		// }

		// Recurse down the children, front side first.
		RecursiveWorldNode(node.children[0], planeBits/*, newDlights[0]*/);

		// Tail recurse.
		node = node.children[1];
		/*dlightBits = newDlights[1];*/
	}

	// Add to z buffer bounds.
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

	if (face.compiled.viewCount === re.viewCount) {
		return;  // already in this view
	}

	// Try to cull before dlighting or adding.
	// TODO Probably shouldn't cull world surfaces as they're
	// grouped by shader and checking this when we're going batch
	// render if only one is visible probably isn't efficient.
	if (CullSurface(face, face.shader)) {
		re.counts.culledFaces++;
		return;
	}

	face.compiled.viewCount = re.viewCount;

	// check for dlighting
	/*if (dlightBits ) {
		dlightBits = DlightSurface(surf, dlightBits);
		dlightBits = (dlightBits !== 0);
	}*/

	AddDrawSurf(face.compiled, face.compiled.shader);
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
	if (r_nocull()) {
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