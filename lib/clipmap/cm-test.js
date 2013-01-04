/**
 * ClusterVisible
 */
function ClusterVisible(current, test) {
	if (!cm.vis || current === test || current == -1) {
		return true;
	}

	var offset = current * cm.clusterBytes;
	return (cm.vis[offset + (test >> 3)] & (1 << (test & 7))) !== 0;
}

/**
 * BoxLeafnums
 *
 * Fills in a list of all the leafs touched
 */
function BoxLeafnums_r(ll, mins, maxs, nodenum) {
	while (1) {
		if (nodenum < 0) {
			var leafNum = -1 - nodenum;

			// Store the lastLeaf even if the list is overflowed
			if (cm.leafs[leafNum].cluster !== -1) {
				ll.lastLeaf = leafNum;
			}

			if (ll.count >= ll.maxCount) {
				// ll->overflowed = true;
				return;
			}

			ll.list[ll.count++] = leafNum;
			return;
		}

		var node = cm.nodes[nodenum];
		var s = QMath.BoxOnPlaneSide(mins, maxs, cm.planes[node.planeNum]);

		if (s === 1) {
			nodenum = node.childrenNum[0];
		} else if (s === 2) {
			nodenum = node.childrenNum[1];
		} else {
			// Go down both.
			BoxLeafnums_r(ll, mins, maxs, node.childrenNum[0]);
			nodenum = node.childrenNum[1];
		}
	}
}

/**
 * BoxLeafnums
 */
function BoxLeafnums(mins, maxs, list, maxCount) {
	var ll = new LeafList();

	ll.list = list;
	ll.maxCount = maxCount;

	cm.checkcount++;
	BoxLeafnums_r(ll, mins, maxs, 0);

	return ll;
}

/*
 * PointLeafnum_r
 */
function PointLeafnum_r(p, num) {
	var d;

	while (num >= 0) {
		var node = cm.nodes[num];
		var plane = cm.planes[node.planeNum];

		if (plane.type < 3) {
			d = p[plane.type] - plane.dist;
		} else {
			d = vec3.dot(plane.normal, p) - plane.dist;
		}

		if (d < 0) {
			num = node.childrenNum[1];
		} else {
			num = node.childrenNum[0];
		}
	}

// 	c_pointcontents++;		// optimize counter

	return (-1) - num;
}

/**
 * PointLeafnum
 */
function PointLeafnum(p) {
	if (!cm.nodes.length) {  // map not loaded
		return 0;
	}
	return PointLeafnum_r(p, 0);
}

/**
 * PointContents
 */
function PointContents(p, model) {
	var leafBrushes = cm.leafBrushes;
	var brushes = cm.brushes;
	var brushSides = cm.brushSides;

	if (!cm.nodes.length) {  // map not loaded
		return 0;
	}

	var leaf;
	if (model) {
		var clipModel = ClipHandleToModel(model);
		leaf = clipModel.leaf;
	} else {
		var leafNum = PointLeafnum(p);
		leaf = cm.leafs[leafNum];
	}

	var contents = 0;
	for (var i = 0; i < leaf.numLeafBrushes; i++) {
		var brushNum = leafBrushes[leaf.firstLeafBrush + i];
		var brush = brushes[brushNum];

		if (!QMath.BoundsIntersectPoint(brush.bounds[0], brush.bounds[1], p)) {
			continue;
		}

		// See if the point is in the brush.
		var j;
		for (var j = 0; j < brush.numSides; j++) {
			var side = brushSides[brush.firstSide + j];
			var d = vec3.dot(p, side.plane.normal);
			if (d > side.plane.dist) {
				break;
			}
		}

		if (j === brush.numSides) {
			contents |= brush.contents;
		}
	}

	return contents;
}

/**
 * TransformedPointContents
 */
function TransformedPointContents(p, model, origin, angles) {
	// Subtract origin offset.
	var local = vec3.subtract(p, origin, vec3.create());

	// Rotate start and end into the models frame of reference.
	if (model !== BOX_MODEL_HANDLE && (angles[0] || angles[1] || angles[2])) {
		var forward = vec3.create();
		var right = vec3.create();
		var up = vec3.create();

		QMath.AnglesToVectors(angles, forward, right, up);

		var temp = vec3.create(local);

		local[0] = vec3.dot(temp, forward);
		local[1] = -vec3.dot(temp, right);
		local[2] = vec3.dot(temp, up);
	}

	return PointContents(local, model);
}

/**********************************************************
 *
 * Area portals
 *
 **********************************************************/

/**
 * FloodArea_r
 */
function FloodArea_r(areaNum, floodnum) {
	var area = cm.areas[areaNum];

	if (area.floodValid === cm.floodValid) {
		if (area.floodnum === floodnum) {
			return;
		}
		com.Error(ERR.DROP, 'FloodArea_r: reflooded');
	}

	area.floodnum = floodnum;
	area.floodValid = cm.floodValid;

	var offset = areaNum * cm.areas.length;
	for (var i = 0; i < cm.areas.length; i++) {
		if (cm.areaPortals[offset+i] > 0) {
			FloodArea_r(i, floodnum);
		}
	}
}

/**
 * FloodAreaConnections
 */
function FloodAreaConnections() {
	// All current floods are now invalid.
	cm.floodValid++;

	var floodnum = 0;

	for (var i = 0; i < cm.areas.length; i++) {
		var area = cm.areas[i];
		if (area.floodValid === cm.floodValid) {
			continue;  // already flooded into
		}
		floodnum++;
		FloodArea_r(i, floodnum);
	}

}

/**
 * AdjustAreaPortalState
 */
function AdjustAreaPortalState(area1, area2, open) {
	if (area1 < 0 || area2 < 0) {
		return;
	}

	if (area1 >= cm.areas.length || area2 >= cm.areas.length) {
		com.Error(ERR.DROP, 'ChangeAreaPortalState: bad area number');
	}

	if (open) {
		cm.areaPortals[area1 * cm.numAreas + area2]++;
		cm.areaPortals[area2 * cm.numAreas + area1]++;
	} else {
		cm.areaPortals[area1 * cm.numAreas + area2]--;
		cm.areaPortals[area2 * cm.numAreas + area1]--;
		if (cm.areaPortals[area2 * cm.numAreas + area1] < 0) {
			com.Error(ERR.DROP, 'AdjustAreaPortalState: negative reference count');
		}
	}

	FloodAreaConnections();
}

/**
 * AreasConnected
 */
function AreasConnected(area1, area2) {
	// if ( cm_noAreas->integer ) {
	// 	return true;
	// }

	if (area1 < 0 || area2 < 0) {
		return false;
	}

	if (area1 >= cm.areas.length || area2 >= cm.areas.length) {
		com.Error(ERR.DROP, 'area >= cm.numAreas');
	}

	if (cm.areas[area1].floodnum === cm.areas[area2].floodnum) {
		return true;
	}
	return false;
}
