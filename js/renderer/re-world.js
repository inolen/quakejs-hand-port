var q3render_vertex_stride = 56;

var vertexBuffer = null;
var indexBuffer = null;

function BuildWorldBuffers() {
	var faces = re.world.faces,
		verts = re.world.verts,
		meshVerts = re.world.meshVerts,
		shaders = re.world.shaders;

	// Compile vert list
	var vertices = new Array(verts.length*14);
	var offset = 0;
	for (var i = 0; i < verts.length; ++i) {
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

	// Compile index list
	var indices = new Array();

	for (var i = 0; i < faces.length; i++) {
		var face = faces[i];

		face.indexOffset = indices.length * 2; // Offset is in bytes

		for(var j = 0; j < face.meshVertCount; j++) {
			indices.push(face.vertex + meshVerts[face.meshVert + j]);
		}
	}

	vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}

/**
 * Helper functions to bind attributes to vertex arrays.
 */
function BindShaderAttribs(shader, modelViewMat, projectionMat) {
	// Set uniforms
	gl.uniformMatrix4fv(shader.uniform.modelViewMat, false, modelViewMat);
	gl.uniformMatrix4fv(shader.uniform.projectionMat, false, projectionMat);

	// Setup vertex attributes
	gl.enableVertexAttribArray(shader.attrib.position);
	gl.vertexAttribPointer(shader.attrib.position, 3, gl.FLOAT, false, q3render_vertex_stride, 0);

	if(shader.attrib.texCoord !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.texCoord);
		gl.vertexAttribPointer(shader.attrib.texCoord, 2, gl.FLOAT, false, q3render_vertex_stride, 3*4);
	}

	if(shader.attrib.lightCoord !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.lightCoord);
		gl.vertexAttribPointer(shader.attrib.lightCoord, 2, gl.FLOAT, false, q3render_vertex_stride, 5*4);
	}

	if(shader.attrib.normal !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.normal);
		gl.vertexAttribPointer(shader.attrib.normal, 3, gl.FLOAT, false, q3render_vertex_stride, 7*4);
	}

	if(shader.attrib.color !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.color);
		gl.vertexAttribPointer(shader.attrib.color, 4, gl.FLOAT, false, q3render_vertex_stride, 10*4);
	}
}

function BindSkyAttribs(shader, modelViewMat, projectionMat) {
	mat4.set(modelViewMat, skyboxMat);

	// Clear out the translation components
	skyboxMat[12] = 0;
	skyboxMat[13] = 0;
	skyboxMat[14] = 0;

	// Set uniforms
	gl.uniformMatrix4fv(shader.uniform.modelViewMat, false, skyboxMat);
	gl.uniformMatrix4fv(shader.uniform.projectionMat, false, projectionMat);

	// Setup vertex attributes
	gl.enableVertexAttribArray(shader.attrib.position);
	gl.vertexAttribPointer(shader.attrib.position, 3, gl.FLOAT, false, q3render_sky_vertex_stride, 0);

	if(shader.attrib.texCoord !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.texCoord);
		gl.vertexAttribPointer(shader.attrib.texCoord, 2, gl.FLOAT, false, q3render_sky_vertex_stride, 3*4);
	}
}

/**
 *
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

function ClusterVisible(current, test) {
	var world = re.world;

	if (!world || !world.vis || current === test || current == -1) {
		return true;
	}

	var offset = current * world.clusterBytes;
	return (world.vis[offset + (test >> 3)] & (1 << (test & 7))) !== 0;
}

function MarkLeaves() {
	var world = re.world;
	var nodes = world.nodes;

	// current viewcluster
	var leaf = PointInLeaf(re.viewParms.pvsOrigin);
	var cluster = leaf.cluster;

	// if the cluster is the same and the area visibility matrix
	// hasn't changed, we don't need to mark everything again
	if (re.viewCluster === cluster) {
		return;
	}

	re.viewCluster = cluster;
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

	AddDrawSurf(surf/*.data*/, surf.shader/*, surf.fogIndex, dlightBits*/);
}

/*
================
CullSurface

Tries to back face cull surfaces before they are lighted or
added to the sorting list.

This will also allow mirrors on both sides of a model without recursion.
================
*/
function CullSurface(surface, shader) {
	if (!r_cull()) {
		return false;
	}

	// TODO We don't convert to a render specific type yet.
	if (surface.type === SurfaceType.GRID/*SurfaceType.GRID*/) {
		//return R_CullGrid( (srfGridMesh_t *)surface );
		return false;
	}

	/*if ( *surface == SF_TRIANGLES ) {
		return R_CullTriSurf( (srfTriangles_t *)surface );
	}*/

	// TODO We don't convert to a render specific type yet.
	if (surface.type !== SurfaceType.FACE) {
		return false;
	}

	// TODO map shader cull value to enum
	if (shader.cull === 'twosided' || shader.cull === 'none' || shader.cull === 'disable') {
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

	re.pc.leafs++;
}

function AddWorldSurfaces(map) {
	MarkLeaves();
	RecursiveWorldNode(re.world.nodes[0], 15);
	/*var faces = re.world.faces;
	for (var i = 0; i < faces.length; i++) {
		AddWorldSurface(faces[i]);
	}*/
}