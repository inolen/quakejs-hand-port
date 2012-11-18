/**
 * ENTITY CHECKING
 *
 * To avoid linearly searching through lists of entities during environment testing,
 * the world is carved up with an evenly spaced, axially aligned bsp tree.  Entities
 * are kept in chains either at the final leafs, or at the first node that splits
 * them, which prevents having to deal with multiple fragments of a single entity.
 */

var AREA_DEPTH = 4;
var worldSectors;

var WorldSector = function () {
	this.axis = 0; // -1 = leaf node
	this.dist = 0;
	this.children = [null, null];
	this.entities = {};
};

/**
 * CmdSectorList
 */
function CmdSectorList() {
	for (var i = 0; i < worldSectors.length; i++) {
		var node = worldSectors[i];
		log('sector ' + i + ': ' + _.keys(node.entities).length + ' entities');
	}
}

/**
 * ClearWorld
 */
function ClearWorld() {
	worldSectors = [];

	// get world map bounds
	var worldModel = cm.InlineModel(0);
	var mins = [0, 0, 0];
	var maxs = [0, 0, 0];
	cm.ModelBounds(worldModel, mins, maxs);

	CreateWorldSector(0, mins, maxs);
}

/**
 * CreateWorldSector
 *
 * Builds a uniformly subdivided tree for the given world size
 */
function CreateWorldSector(depth, mins, maxs) {
	var node = worldSectors[worldSectors.length] = new WorldSector();

	if (depth === AREA_DEPTH) {
		node.axis = -1;
		node.children[0] = node.children[1] = null;
		return node;
	}
	
	var size = vec3.subtract(maxs, mins, [0, 0, 0]);
	if (size[0] > size[1]) {
		node.axis = 0;
	} else {
		node.axis = 1;
	}

	var mins1 = vec3.set(mins, [0, 0, 0]);
	var mins2 = vec3.set(mins, [0, 0, 0]);
	var maxs1 = vec3.set(maxs, [0, 0, 0]);
	var maxs2 = vec3.set(maxs, [0, 0, 0]);

	node.dist = 0.5 * (maxs[node.axis] + mins[node.axis]);
	maxs1[node.axis] = mins2[node.axis] = node.dist;
	
	node.children[0] = CreateWorldSector(depth+1, mins2, maxs2);
	node.children[1] = CreateWorldSector(depth+1, mins1, maxs1);

	return node;
}

/**
 * FindEntitiesInBox
 */
function FindEntitiesInBox(mins, maxs) {
	var entityNums = [];

	var FindEntitiesInBox_r = function (node) {
		for (var num in node.entities) {
			if (!node.entities.hasOwnProperty(num)) {
				continue;
			}

			var ent = node.entities[num];
			var gent = GentityForSvEntity(ent);
			
			if (gent.absmin[0] > maxs[0] ||
				gent.absmin[1] > maxs[1] ||
				gent.absmin[2] > maxs[2] ||
				gent.absmax[0] < mins[0] ||
				gent.absmax[1] < mins[1] ||
				gent.absmax[2] < mins[2]) {
				continue;
			}

			entityNums.push(gent.s.number);
		}
		
		if (node.axis == -1) {
			return; // terminal node
		}

		// recurse down both sides
		if (maxs[node.axis] > node.dist) {
			FindEntitiesInBox_r(node.children[0]);
		}
		if (mins[node.axis] < node.dist ) {
			FindEntitiesInBox_r(node.children[1]);
		}
	};

	FindEntitiesInBox_r(worldSectors[0]);

	return entityNums;
}

/**
 * LinkEntity
 */
function LinkEntity(gent) {
	var ent = SvEntityForGentity(gent);

	if (ent.worldSector) {
		UnlinkEntity(gent); // unlink from old position
	}

	// encode the size into the entityState_t for client prediction
	/*if (gent.bmodel) {
		gent.s.solid = SOLID_BMODEL; // a solid_box will never create this value
	} else if (gent.contents & (CONTENTS.SOLID | CONTENTS.BODY)) {
		// assume that x/y are equal and symetric
		var i = gEnt.maxs[0];
		if (i < 1) {
			i = 1;
		} else if (i > 255) {
			i = 255;
		}

		// z is not symetric
		var j = (-gent.mins[2]);
		if (j < 1) {
			j = 1;
		} else if (j > 255) {
			j = 255;
		}

		// and z maxs can be negative...
		var k = (gent.maxs[2] + 32);
		if (k < 1) {
			k = 1;
		} else if (k > 255) {
			k = 255;
		}

		gent.s.solid = (k << 16) | (j << 8) | i;
	} else {
		gent.s.solid = 0;
	}*/

	// get the position
	var origin = gent.currentOrigin;
	var angles = gent.currentAngles;

	// set the abs box
	/*if (gent.bmodel && (angles[0] || angles[1] || angles[2])) {
		var max = qm.RadiusFromBounds(gent.mins, gent.maxs);
		for (var i = 0; i < 3; i++) {
			gent.absmin[i] = origin[i] - max;
			gent.absmax[i] = origin[i] + max;
		}
	} else {*/
		// normal
		vec3.add(origin, gent.mins, gent.absmin);
		vec3.add(origin, gent.maxs, gent.absmax);
	//}

	// because movement is clipped an epsilon away from an actual edge,
	// we must fully check even when bounding boxes don't quite touch
	gent.absmin[0] -= 1;
	gent.absmin[1] -= 1;
	gent.absmin[2] -= 1;
	gent.absmax[0] += 1;
	gent.absmax[1] += 1;
	gent.absmax[2] += 1;

	/*// link to PVS leafs
	ent.numClusters = 0;
	ent.lastCluster = 0;
	ent.areanum = -1;
	ent.areanum2 = -1;

	// get all leafs, including solids
	num_leafs = CM_BoxLeafnums( gEnt->r.absmin, gEnt->r.absmax,
		leafs, MAX_TOTAL_ENT_LEAFS, &lastLeaf );

	// if none of the leafs were inside the map, the
	// entity is outside the world and can be considered unlinked
	if (!num_leafs) {
		return;
	}

	// set areas, even from clusters that don't fit in the entity array
	for (var i = 0; i < num_leafs; i++) {
		var area = CM_LeafArea(leafs[i]);

		if (area === -1) {
			continue;
		}

		// doors may legally straggle two areas,
		// but nothing should ever need more than that
		if (ent.areanum !== -1 && ent.areanum != area) {
			ent.areanum2 = area;
		} else {
			ent.areanum = area;
		}
	}

	// store as many explicit clusters as we can
	ent.numClusters = 0;

	for (var i = 0; i < num_leafs; i++) {
		var cluster = CM_LeafCluster(leafs[i]);

		if (cluster === -1) {
			continue;
		}

		ent.clusternums[ent.numClusters++] = cluster;

		if (ent.numClusters == MAX_ENT_CLUSTERS) {
			break;
		}
	}

	// store off a last cluster if we need to
	if (i !== num_leafs) {
		ent.lastCluster = CM_LeafCluster( lastLeaf );
	}*/

	// find the first world sector node that the ent's box crosses
	var node = worldSectors[0];

	while (1) {
		if (node.axis == -1) {
			break;
		}

		if (gent.absmin[node.axis] > node.dist) {
			node = node.children[0];
		}
		else if (gent.absmax[node.axis] < node.dist) {
			node = node.children[1];
		}
		else {
			break; // crosses the node
		}
	}
	
	// Link it in.
	gent.linked = true;
	ent.worldSector = node;
	node.entities[gent.s.number] = ent;
}

/**
 * UnlinkEntity
 */
function UnlinkEntity(gent) {
	var ent = SvEntityForGentity(gent);
	var node = ent.worldSector;

	if (!node) {
		return;  // not linked in anywhere
	}

	// Unlink.
	gent.linked = false;
	delete node.entities[gent.s.number];
	ent.worldSector = null;
}

/**
 * Trace
 *
 * Moves the given mins/maxs volume through the world from start to end.
 * passEntityNum and entities owned by passEntityNum are explicitly not checked.
 */
function Trace(start, end, mins, maxs, passEntityNum, contentmask, capsule) {
	if (!mins) {
		mins = [0, 0, 0];
	}
	if (!maxs) {
		maxs = [0, 0, 0];
	}

	// Clip to world
	var trace = cm.BoxTrace(start, end, mins, maxs, 0, contentmask, capsule);
	trace.entityNum = trace.fraction !== 1.0 ? ENTITYNUM_WORLD : ENTITYNUM_NONE;
	if (trace.fraction === 0) {
		return trace;  // blocked immediately by the world
	}

	// clip.contentmask = contentmask;
	// clip.start = start;
	// vec3.set(end, clip.end);
	// clip.mins = mins;
	// clip.maxs = maxs;
	// clip.passEntityNum = passEntityNum;
	// clip.capsule = capsule;

	// // Create the bounding box of the entire move.
	// // We can limit it to the part of the move not
	// // already clipped off by the world, which can be
	// // a significant savings for line of sight and shot traces.
	// for (var i = 0; i < 3; i++) {
	// 	if (end[i] > start[i]) {
	// 		clip.boxmins[i] = clip.start[i] + clip.mins[i] - 1;
	// 		clip.boxmaxs[i] = clip.end[i] + clip.maxs[i] + 1;
	// 	} else {
	// 		clip.boxmins[i] = clip.end[i] + clip.mins[i] - 1;
	// 		clip.boxmaxs[i] = clip.start[i] + clip.maxs[i] + 1;
	// 	}
	// }

	// // clip to other solid entities
	// SV_ClipMoveToEntities ( &clip );

	return trace;
}