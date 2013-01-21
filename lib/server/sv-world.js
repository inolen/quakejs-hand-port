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
	var worldModel = CM.InlineModel(0);
	var mins = vec3.create();
	var maxs = vec3.create();
	CM.ModelBounds(worldModel, mins, maxs);

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

	var size = vec3.subtract(maxs, mins, vec3.create());
	if (size[0] > size[1]) {
		node.axis = 0;
	} else {
		node.axis = 1;
	}

	var mins1 = vec3.create(mins);
	var mins2 = vec3.create(mins);
	var maxs1 = vec3.create(maxs);
	var maxs2 = vec3.create(maxs);

	node.dist = 0.5 * (maxs[node.axis] + mins[node.axis]);
	maxs1[node.axis] = mins2[node.axis] = node.dist;

	node.children[0] = CreateWorldSector(depth+1, mins2, maxs2);
	node.children[1] = CreateWorldSector(depth+1, mins1, maxs1);

	return node;
}

/**
 * GetEntityDefs
 */
function GetEntityDefs() {
	return sv.world.entities;
}

/**
 * LinkEntity
 */
var MAX_TOTAL_ENT_LEAFS = 128;
var leleafs = new Uint32Array(MAX_TOTAL_ENT_LEAFS);

function LinkEntity(gent) {
	var i, j, k;
	var svEnt = SvEntityForGentity(gent);

	if (svEnt.worldSector) {
		UnlinkEntity(gent);  // unlink from old position
	}

	// Encode the size into the entityState for client prediction.
	if (gent.r.bmodel) {
		gent.s.solid = QS.SOLID_BMODEL; // a solid_box will never create this value
	} else if (gent.r.contents & (QS.CONTENTS.SOLID | QS.CONTENTS.BODY)) {
		// Assume that x/y are equal and symetric.
		i = gent.r.maxs[0];
		if (i < 1) {
			i = 1;
		} else if (i > 255) {
			i = 255;
		}

		// z is not symetric.
		j = (-gent.r.mins[2]);
		if (j < 1) {
			j = 1;
		} else if (j > 255) {
			j = 255;
		}

		// And z maxs can be negative...
		k = (gent.r.maxs[2] + 32);
		if (k < 1) {
			k = 1;
		} else if (k > 255) {
			k = 255;
		}

		gent.s.solid = (k << 16) | (j << 8) | i;
	} else {
		gent.s.solid = 0;
	}

	// Get the position.
	var origin = gent.r.currentOrigin;
	var angles = gent.r.currentAngles;

	// Set the abs box.
	if (gent.r.bmodel && (angles[0] || angles[1] || angles[2])) {
		var max = QMath.RadiusFromBounds(gent.r.mins, gent.r.maxs);
		for (i = 0; i < 3; i++) {
			gent.r.absmin[i] = origin[i] - max;
			gent.r.absmax[i] = origin[i] + max;
		}
	} else {
		// Normal
		vec3.add(origin, gent.r.mins, gent.r.absmin);
		vec3.add(origin, gent.r.maxs, gent.r.absmax);
	}

	// Because movement is clipped an epsilon away from an actual edge,
	// we must fully check even when bounding boxes don't quite touch.
	gent.r.absmin[0] -= 1;
	gent.r.absmin[1] -= 1;
	gent.r.absmin[2] -= 1;
	gent.r.absmax[0] += 1;
	gent.r.absmax[1] += 1;
	gent.r.absmax[2] += 1;

	// Link to PVS leafs.
	svEnt.numClusters = 0;
	svEnt.lastCluster = 0;
	svEnt.areanum = -1;
	svEnt.areanum2 = -1;

	// Get all leafs, including solids
	var ll = CM.BoxLeafnums(gent.r.absmin, gent.r.absmax, leleafs, MAX_TOTAL_ENT_LEAFS);

	// If none of the leafs were inside the map, the
	// entity is outside the world and can be considered unlinked
	if (!ll.count) {
		return;
	}

	// Set areas, even from clusters that don't fit in the entity array.
	for (i = 0; i < ll.count; i++) {
		var area = CM.LeafArea(leleafs[i]);

		if (area === -1) {
			continue;
		}

		// Doors may legally straggle two areas,
		// but nothing should ever need more than that/
		if (svEnt.areanum !== -1 && svEnt.areanum !== area) {
			svEnt.areanum2 = area;
		} else {
			svEnt.areanum = area;
		}
	}

	// Store as many explicit clusters as we can.
	svEnt.numClusters = 0;

	for (i = 0; i < ll.count; i++) {
		var cluster = CM.LeafCluster(leleafs[i]);

		if (cluster === -1) {
			continue;
		}

		svEnt.clusternums[svEnt.numClusters++] = cluster;

		if (svEnt.numClusters === MAX_ENT_CLUSTERS) {
			break;
		}
	}

	// Store off a last cluster if we need to.
	if (i !== ll.count) {
		svEnt.lastCluster = CM.LeafCluster(ll.lastLeaf);
	}

	// Find the first world sector node that the ent's box crosses.
	var node = worldSectors[0];

	while (1) {
		if (node.axis == -1) {
			break;
		}

		if (gent.r.absmin[node.axis] > node.dist) {
			node = node.children[0];
		}
		else if (gent.r.absmax[node.axis] < node.dist) {
			node = node.children[1];
		}
		else {
			break; // crosses the node
		}
	}

	// Link it in.
	gent.r.linked = true;
	svEnt.worldSector = node;
	node.entities[gent.s.number] = svEnt;
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
	gent.r.linked = false;
	delete node.entities[gent.s.number];
	ent.worldSector = null;
}

/**********************************************************
 *
 * Area query
 *
 * Fills in a list of all entities who's absmin / absmax
 * intersects the given bounds. This does NOT mean that
 * they actually touch in the case of bmodels.
 *
 **********************************************************/

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

			if (gent.r.absmin[0] > maxs[0] ||
				gent.r.absmin[1] > maxs[1] ||
				gent.r.absmin[2] > maxs[2] ||
				gent.r.absmax[0] < mins[0] ||
				gent.r.absmax[1] < mins[1] ||
				gent.r.absmax[2] < mins[2]) {
				continue;
			}

			entityNums.push(gent.s.number);
		}

		if (node.axis == -1) {
			return; // terminal node
		}

		// Recurse down both sides.
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

/**********************************************************
 *
 * Trace through the world and entities
 *
 **********************************************************/
var moveclip = function () {
	this.boxmins       = vec3.create();                        // enclose the test object along entire move
	this.boxmaxs       = vec3.create();
	this.mins          = vec3.create();
	this.maxs          = vec3.create();
	this.start         = vec3.create();
	this.end           = vec3.create();
	this.trace         = null;
	this.passEntityNum = 0;
	this.contentmask   = 0;
};
var clip = new moveclip();

/**
 * Trace
 *
 * Moves the given mins/maxs volume through the world from start to end.
 * passEntityNum and entities owned by passEntityNum are explicitly not checked.
 */
function Trace(start, end, mins, maxs, passEntityNum, contentmask) {
	if (!mins) {
		mins = vec3.create();
	}
	if (!maxs) {
		maxs = vec3.create();
	}

	// Clip to world.
	clip.trace = CM.BoxTrace(start, end, mins, maxs, 0, contentmask);
	clip.trace.entityNum = clip.trace.fraction !== 1.0 ? QS.ENTITYNUM_WORLD : QS.ENTITYNUM_NONE;
	if (clip.trace.fraction === 0) {
		return clip.trace;  // blocked immediately by the world
	}

	clip.contentmask = contentmask;
	vec3.set(start, clip.start);
	vec3.set(end, clip.end);
	vec3.set(mins, clip.mins);
	vec3.set(maxs, clip.maxs);
	clip.passEntityNum = passEntityNum;

	// Create the bounding box of the entire move.
	// We can limit it to the part of the move not
	// already clipped off by the world, which can be
	// a significant savings for line of sight and shot traces.
	for (var i = 0; i < 3; i++) {
		if (end[i] > start[i]) {
			clip.boxmins[i] = clip.start[i] + clip.mins[i] - 1;
			clip.boxmaxs[i] = clip.end[i] + clip.maxs[i] + 1;
		} else {
			clip.boxmins[i] = clip.end[i] + clip.mins[i] - 1;
			clip.boxmaxs[i] = clip.start[i] + clip.maxs[i] + 1;
		}
	}

	// Clip to other solid entities.
	ClipMoveToEntities(clip);

	return clip.trace;
}

/**
 * ClipMoveToEntities
 */
function ClipMoveToEntities(clip) {
	var origin = vec3.create();
	var angles = vec3.create();
	var passOwnerNum = -1;

	var touchlist = FindEntitiesInBox(clip.boxmins, clip.boxmaxs);

	if (clip.passEntityNum !== QS.ENTITYNUM_NONE) {
		passOwnerNum = (GentityForNum(clip.passEntityNum)).r.ownerNum;
		if (passOwnerNum === QS.ENTITYNUM_NONE) {
			passOwnerNum = -1;
		}
	}

	for (var i = 0; i < touchlist.length; i++) {
		if (clip.trace.allSolid) {
			return;
		}

		var touch = GentityForNum(touchlist[i]);

		// See if we should ignore this entity.
		if (clip.passEntityNum !== QS.ENTITYNUM_NONE) {
			if (touchlist[i] === clip.passEntityNum) {
				continue;  // don't clip against the pass entity
			}
			if (touch.r.ownerNum === clip.passEntityNum) {
				continue;  // don't clip against own missiles
			}
			if (touch.r.ownerNum === passOwnerNum) {
				continue;  // don't clip against other missiles from our owner
			}
		}

		// If it doesn't have any brushes of a type we
		// are looking for, ignore it.
		if (!(clip.contentmask & touch.r.contents)) {
			continue;
		}

		// Might intersect, so do an exact clip.
		var clipHandle = ClipHandleForEntity(touch);

		vec3.set(touch.r.currentOrigin, origin);
		vec3.set(touch.r.currentAngles, angles);
		if (!touch.r.bmodel) {
			angles[0] = angles[1] = angles[2] = 0;  // boxes don't rotate
		}

		var trace = CM.TransformedBoxTrace(clip.start, clip.end, clip.mins, clip.maxs,
			clipHandle, clip.contentmask, origin, angles);

		if (trace.allSolid) {
			clip.trace.allSolid = true;
			trace.entityNum = touch.s.number;
		} else if (trace.startSolid) {
			clip.trace.startSolid = true;
			trace.entityNum = touch.s.number;
		}

		if (trace.fraction < clip.trace.fraction) {
			// Make sure we keep a startSolid from a previous trace.
			var oldStart = clip.trace.startSolid;

			trace.entityNum = touch.s.number;
			clip.trace = trace;
			clip.trace.startSolid |= oldStart;
		}
	}
}

/**
 * ClipHandleForEntity
 *
 * Returns a headnode that can be used for testing or clipping to a
 * given entity. If the entity is a bsp model, the headnode will
 * be returned, otherwise a custom box tree will be constructed.
 */
function ClipHandleForEntity(ent) {
	if (ent.r.bmodel) {
		// Explicit hulls in the BSP model.
		return CM.InlineModel(ent.s.modelIndex);
	}

	// Create a temp tree from bounding box sizes.
	return CM.TempBoxModel(ent.r.mins, ent.r.maxs);
}

/**
 * PointContents
 */
function PointContents(p, passEntityNum) {
	// Get base contents from world.
	var c = CM.PointContents(p, 0);

	// Or in contents from all the other entities.
	var touchlist = FindEntitiesInBox(p, p);

	for (var i = 0; i < touchlist.length; i++) {
		if (touchlist[i] === passEntityNum) {
			continue;
		}

		var hit = GentityForNum(touchlist[i]);

		// Might intersect, so do an exact clip.
		var clipHandle = ClipHandleForEntity(hit);
		var angles = QMath.vec3origin;
		if (hit.r.bmodel) {
			angles = hit.r.currentAngles;
		}

		var c2 = CM.TransformedPointContents(p, clipHandle, hit.r.currentOrigin, angles);

		c |= c2;
	}

	return c;
}