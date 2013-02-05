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

	re.currentEntityNum = QS.ENTITYNUM_WORLD;

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
	var mod = FindModelByHandle(refent.hModel);
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
			if (nodes[i].contents !== QS.CONTENTS.SOLID) {
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
		COM.Error('PointInLeaf: bad model');
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
		if (!r_nocull.getAsInt()) {
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
				var shader = FindShaderByHandle(refent.customShader);
				AddDrawGeometry(re.entityGeo, shader, 0);
				break;

			case RT.MODEL:
				// We must set up parts of re.or for model culling.
				RotateForEntity(refent, re.viewParms, re.or);

				var mod = FindModelByHandle(refent.hModel);

				switch (mod.type) {
					case MOD.MD3:
						AddMd3Geometry(refent);
						break;

					case MOD.BRUSH:
						AddBrushModelGeometry(refent);
						break;
				}
				break;

			default:
				COM.Error('AddEntityGeos: BadGeometry');
				break;
		}
	}
}

/**
 * AddMd3Geometry
 */
function AddMd3Geometry(refent) {
	var mod = FindModelByHandle(refent.hModel);

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

	// Compute LOD.
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
			shader = FindShaderByHandle(refent.customShader);
		} else if (refent.customSkin) {
			var skin = FindSkinByHandle(refent.customSkin);

			// Match the surface name to something in the skin file.
			shader = re.defaultShader;

			for (var j = 0; j < skin.surfaces.length; j++) {
				// The names have both been lowercased.
				if (skin.surfaces[j].name === surface.name) {
					shader = skin.surfaces[j].shader;
					break;
				}
			}
		} else {
			if (surface.shaders.length <= 0) {
				shader = re.defaultShader;
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
			COM.Error('Invalid cull result');
	}
}

/**
 * UpdateWorldGeometry
 */
function UpdateWorldGeometry(geo) {
	backend.dlightBits |= geo.dlightBits;

	if (geo.initialized) {  // static
		return;
	}

	var verts = re.world.verts;
	var meshVerts = re.world.meshVerts;

	var index      = geo.attributes.index      = CreateBuffer('index',      geo.numIndexes, 'uint');
	var position   = geo.attributes.position   = CreateBuffer('position',   geo.numVerts,   'vec3');
	var normal     = geo.attributes.normal     = CreateBuffer('normal',     geo.numVerts,   'vec3');
	var texCoord   = geo.attributes.texCoord   = CreateBuffer('texCoord',   geo.numVerts,   'vec2');
	var lightCoord = geo.attributes.lightCoord = CreateBuffer('lightCoord', geo.numVerts,   'vec2');
	var color      = geo.attributes.color      = CreateBuffer('color',      geo.numVerts,   'vec4');

	for (var i = 0; i < geo.faces.length; i++) {
		var face = geo.faces[i];
		var positionOffset = position.index / position.size;

		for (var j = 0; j < face.vertCount; j++) {
			var vert = verts[face.vertex + j];

			position.array[position.index++] = vert.pos[0];
			position.array[position.index++] = vert.pos[1];
			position.array[position.index++] = vert.pos[2];

			normal.array[normal.index++] = vert.normal[0];
			normal.array[normal.index++] = vert.normal[1];
			normal.array[normal.index++] = vert.normal[2];

			texCoord.array[texCoord.index++] = vert.texCoord[0];
			texCoord.array[texCoord.index++] = vert.texCoord[1];

			lightCoord.array[lightCoord.index++] = vert.lmCoord[0];
			lightCoord.array[lightCoord.index++] = vert.lmCoord[1];

			color.array[color.index++] = vert.color[0];
			color.array[color.index++] = vert.color[1];
			color.array[color.index++] = vert.color[2];
			color.array[color.index++] = vert.color[3];
		}

		for (var j = 0; j < face.meshVertCount; j++) {
			index.array[index.index++] = positionOffset + meshVerts[face.meshVert + j];
		}
	}

	index.update = true;
	position.update = true;
	normal.update = true;
	texCoord.update = true;
	lightCoord.update = true;
	color.update = true;

	geo.initialized = true;
	// These are no longer needed, clear them off the heap.
	geo.faces = null;
}

/**
 * UpdateMd3Geometry
 *
 * This is called by both the backend, and the model code
 * when caching single-frame models. For that reason, refent
 * may not be valid, and in that case, we can assume this is
 * a single-frame model being precompiled.
 */
function UpdateMd3Geometry(geo) {
	var surface = geo.surface;
	var numFrames = surface.numFrames;
	var numVerts = surface.numVerts;
	var refent = backend.currentEntity;

	if (geo.initialized) {
		// Just update the frame offsets.
		geo.attributes.position.offset  = refent.frame * numVerts * 3;
		geo.attributes.normal.offset    = geo.attributes.position.offset;

		geo.attributes.position2.offset = refent.oldFrame * numVerts * 3;
		geo.attributes.normal2.offset   = geo.attributes.position2.offset;
		return;
	}

	var numIndexes = surface.indexes.length;

	var index     = geo.attributes.index     = CreateBuffer('index',    numIndexes,             'uint');
	var position  = geo.attributes.position  = CreateBuffer('position', numFrames * numVerts,   'vec3');
	var position2 = geo.attributes.position2 = position.clone();
	var normal    = geo.attributes.normal    = CreateBuffer('normal',   numFrames * numVerts,   'vec3');
	var normal2   = geo.attributes.normal2   = normal.clone();
	var texCoord  = geo.attributes.texCoord  = CreateBuffer('texCoord', numVerts,               'vec2');

	for (var i = 0; i < numFrames; i++) {
		for (var j = 0; j < numVerts; j++) {
			var idx = i * numVerts + j;

			position.array[position.index++] = surface.xyz[idx][0];
			position.array[position.index++] = surface.xyz[idx][1];
			position.array[position.index++] = surface.xyz[idx][2];

			normal.array[normal.index++] = surface.normals[idx][0];
			normal.array[normal.index++] = surface.normals[idx][1];
			normal.array[normal.index++] = surface.normals[idx][2];

			if (i === 0) {
				texCoord.array[texCoord.index++] = surface.st[j][0];
				texCoord.array[texCoord.index++] = surface.st[j][1];
			}
		}
	}

	for (var i = 0; i < surface.indexes.length; i++) {
		index.array[index.index++] = surface.indexes[i];
	}

	// We interpolate animation frames in the VP, so we'll share the
	// same VBOs for position2 and normal2, just changing the offset
	// for each frame.
	geo.attributes.position.offset  = refent.frame * numVerts * 3;

	geo.attributes.normal.offset    = refent.frame * numVerts * 3;

	geo.attributes.position2.index  = geo.attributes.position.index;
	geo.attributes.position2.offset = refent.oldFrame * numVerts * 3;

	geo.attributes.normal2.index    = geo.attributes.normal.index;
	geo.attributes.normal2.offset   = refent.oldFrame * numVerts * 3;

	position.update = true;
	position2.update = true;
	normal.update = true;
	normal2.update = true;
	texCoord.update = true;
	index.update = true;

	geo.initialized = true;
}

/**
 * UpdateEntityGeometry
 */
function UpdateEntityGeometry(geo) {
	switch (backend.currentEntity.reType) {
		case RT.POLY:
			UpdatePoly(geo);
			break;

		case RT.SPRITE:
			UpdateSprite(geo);
			break;

		case RT.RAIL_CORE:
			UpdateRailCore(geo);
			break;

		case RT.LIGHTNING:
			UpdateLightningBolt(geo);
			break;
	}
}

/**
 * UpdatePoly
 */
function UpdatePoly(geo) {
	var refent = backend.currentEntity;
	var index = geo.attributes.index;
	var position = geo.attributes.position;
	var normal = geo.attributes.normal;
	var texCoord = geo.attributes.texCoord;
	var color = geo.attributes.color;

	var positionOffset = position.index / position.size;
	var numPolyVerts = refent.polyVerts.length;

	// Fan triangles into the tess array.
	for (var i = 0; i < numPolyVerts; i++) {
		var p = refent.polyVerts[i];

		position.array[position.index++] = p.xyz[0];
		position.array[position.index++] = p.xyz[1];
		position.array[position.index++] = p.xyz[2];

		normal.array[normal.index++] = 0;
		normal.array[normal.index++] = 0;
		normal.array[normal.index++] = 0;

		texCoord.array[texCoord.index++] = p.st[0];
		texCoord.array[texCoord.index++] = p.st[1];

		color.array[color.index++] = p.modulate[0];
		color.array[color.index++] = p.modulate[1];
		color.array[color.index++] = p.modulate[2];
		color.array[color.index++] = p.modulate[3];
	}

	// Generate fan indexes into the tess array.
	for (var i = 0; i < numPolyVerts - 2; i++) {
		index.array[index.index++] = positionOffset + 0;
		index.array[index.index++] = positionOffset + i + 1;
		index.array[index.index++] = positionOffset + i + 2;
	}

	index.update = true;
	position.update = true;
	normal.update = true;
	texCoord.update = true;
	color.update = true;
}

/**
 * UpdateSprite
 */
function UpdateSprite(geo) {
	var refent = backend.currentEntity;
	var radius = refent.radius;
	var left = vec3.create();
	var up = vec3.create();

	// Calculate the xyz locations for the four corners
	if (refent.rotation === 0) {
		vec3.scale(backend.viewParms.or.axis[1], radius, left);
		vec3.scale(backend.viewParms.or.axis[2], radius, up);
	} else {
		var ang = Math.PI * refent.rotation / 180;
		var s = Math.sin(ang);
		var c = Math.cos(ang);

		vec3.scale(backend.viewParms.or.axis[1], c * radius, left);
		vec3.add(left, vec3.scale(backend.viewParms.or.axis[2], -s * radius, vec3.create()), left);

		vec3.scale(backend.viewParms.or.axis[2], c * radius, up);
		vec3.add(up, vec3.scale(backend.viewParms.or.axis[1], s * radius, vec3.create()), up);
	}

	// if (backend.viewParms.isMirror) {
	// 	vec3.negate(left);
	// }

	AddQuadStamp(geo, refent.origin, left, up, refent.shaderRGBA);
}

/**
 * UpdateLightningBolt
 */
function UpdateLightningBolt(geo) {
	var refent = backend.currentEntity;

	var start = vec3.create(refent.origin);
	var end = vec3.create(refent.oldOrigin);

	var forward = vec3.subtract(end, start, vec3.create());
	vec3.normalize(forward);

	// Compute side vector.
	var v1 = vec3.subtract(start, backend.viewParms.or.origin, vec3.create());
	vec3.normalize(v1);
	var v2 = vec3.subtract(end, backend.viewParms.or.origin, vec3.create());
	vec3.normalize(v2);
	var right = vec3.cross(v1, v2, vec3.create());
	vec3.normalize(right);

	for (var i = 0; i < 4; i++) {
		DoRailCore(geo, start, end, right, 8, refent.shaderRGBA);
		QMath.RotatePointAroundVector(right, forward, 45);
	}
}

/**
 * UpdateRailCore
 */
function UpdateRailCore(geo) {
	var refent = backend.currentEntity;

	var start = vec3.create(refent.origin);
	var end = vec3.create(refent.oldOrigin);

	// Compute side vector.
	var v1 = vec3.subtract(start, backend.viewParms.or.origin, vec3.create());
	vec3.normalize(v1);
	var v2 = vec3.subtract(end, backend.viewParms.or.origin, vec3.create());
	vec3.normalize(v2);
	var right = vec3.cross(v1, v2, vec3.create());
	vec3.normalize(right);

	DoRailCore(geo, start, end, right, r_railCoreWidth.getAsInt(), refent.shaderRGBA);
}

/**
 * DoRailCore
 */
function DoRailCore(geo, start, end, right, spanWidth, modulate) {
	var dir = vec3.subtract(end, start, vec3.create());
	var len = vec3.length(dir);

	var t = len / 256;

	// This is a bit odd, the up vector for the quad
	// describes the narrow part of the rail.
	var left = vec3.scale(dir, -0.5, vec3.create());
	var up = vec3.scale(right, spanWidth, vec3.create());
	var center = vec3.subtract(start, left);

	AddQuadStampExt(geo, center, left, up, modulate, 0, 0, t, 1);
}

/**
 * AddQuadStamp
 */
function AddQuadStamp(geo, origin, left, up, modulate) {
	AddQuadStampExt(geo, origin, left, up, modulate, 0, 0, 1, 1);
}

/**
 * AddQuadStampExt
 */
function AddQuadStampExt(geo, origin, left, up, modulate, s1, t1, s2, t2) {
	var index = geo.attributes.index;
	var position = geo.attributes.position;
	var normal = geo.attributes.normal;
	var texCoord = geo.attributes.texCoord;
	var color = geo.attributes.color;
	var positionOffset = position.index / position.size;

	// Triangle indexes for a simple quad.
	index.array[index.index++] = positionOffset;
	index.array[index.index++] = positionOffset + 1;
	index.array[index.index++] = positionOffset + 3;

	index.array[index.index++] = positionOffset + 3;
	index.array[index.index++] = positionOffset + 1;
	index.array[index.index++] = positionOffset + 2;

	position.array[position.index++] = origin[0] + left[0] + up[0];
	position.array[position.index++] = origin[1] + left[1] + up[1];
	position.array[position.index++] = origin[2] + left[2] + up[2];

	position.array[position.index++] = origin[0] - left[0] + up[0];
	position.array[position.index++] = origin[1] - left[1] + up[1];
	position.array[position.index++] = origin[2] - left[2] + up[2];

	position.array[position.index++] = origin[0] - left[0] - up[0];
	position.array[position.index++] = origin[1] - left[1] - up[1];
	position.array[position.index++] = origin[2] - left[2] - up[2];

	position.array[position.index++] = origin[0] + left[0] - up[0];
	position.array[position.index++] = origin[1] + left[1] - up[1];
	position.array[position.index++] = origin[2] + left[2] - up[2];

	// Constant normal all the way around.
	var norm = vec3.negate(backend.viewParms.or.axis[0], vec3.create());

	normal.array[normal.index++] = norm[0];
	normal.array[normal.index++] = norm[1];
	normal.array[normal.index++] = norm[2];

	normal.array[normal.index++] = norm[0];
	normal.array[normal.index++] = norm[1];
	normal.array[normal.index++] = norm[2];

	normal.array[normal.index++] = norm[0];
	normal.array[normal.index++] = norm[1];
	normal.array[normal.index++] = norm[2];

	normal.array[normal.index++] = norm[0];
	normal.array[normal.index++] = norm[1];
	normal.array[normal.index++] = norm[2];

	// Standard square texture coordinates.
	texCoord.array[texCoord.index++] = s1;
	texCoord.array[texCoord.index++] = t1;

	texCoord.array[texCoord.index++] = s2;
	texCoord.array[texCoord.index++] = t1;

	texCoord.array[texCoord.index++] = s2;
	texCoord.array[texCoord.index++] = t2;

	texCoord.array[texCoord.index++] = s1;
	texCoord.array[texCoord.index++] = t2;

	// Constant color all the way around.
	color.array[color.index++] = modulate[0];
	color.array[color.index++] = modulate[1];
	color.array[color.index++] = modulate[2];
	color.array[color.index++] = modulate[3];

	color.array[color.index++] = modulate[0];
	color.array[color.index++] = modulate[1];
	color.array[color.index++] = modulate[2];
	color.array[color.index++] = modulate[3];

	color.array[color.index++] = modulate[0];
	color.array[color.index++] = modulate[1];
	color.array[color.index++] = modulate[2];
	color.array[color.index++] = modulate[3];

	color.array[color.index++] = modulate[0];
	color.array[color.index++] = modulate[1];
	color.array[color.index++] = modulate[2];
	color.array[color.index++] = modulate[3];

	index.update = true;
	position.update = true;
	normal.update = true;
	texCoord.update = true;
	color.update = true;
}