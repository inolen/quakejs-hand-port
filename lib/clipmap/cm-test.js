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
				// ll->overflowed = qtrue;
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
	if (!cm.nodes.length) {	// map not loaded
		return 0;
	}
	return PointLeafnum_r(p, 0);
}

/**
 * PointContents
 */
function PointContents(p, model) {
	var leafnum;
	var i, k;
	var brushnum;
	var leaf;
	var b;
	var contents;
	var d;
	var clipm;
	
// 	if (!cm.numNodes) {	// map not loaded
// 		return 0;
// 	}
// 	
// 	if (model) {
// 		clipm = CM_ClipHandleToModel( model );
// 		leaf = clipm.leaf;
// 	} else {
// 		leafnum = PointLeafnum_r(p, 0);
// 		leaf = cm.leafs[leafnum];
// 	}
// 	
// 	contents = 0;
// 	for (k = 0; k < leaf.numLeafBrushes; k++) {
// 		brushnum = cm.leafbrushes[leaf.firstLeafBrush + k];
// 		b = cm.brushes[brushnum];
// 		
// 		if (!CM_BoundsIntersectPoint(b.bounds[0], b.bounds[1], p)) {
// 			continue;
// 		}
// 		
// 		// see if the point is in the brush
// 		for (i = 0; i < b.numsides; i++) {
// 			d = vec3.dot(p, b.sides[i].plane.normal);
// // FIXME test for Cash
// //			if ( d >= b->sides[i].plane->dist ) {
// 			if ( d > b.sides[i].plane.dist ) {
// 				break;
// 			}
// 		}
// 		
// 		if (i == b.numsides) {
// 			contents |= b.contents;
// 		}
// 	}
	
	return contents;
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

	if (area.floodvalid === cm.floodvalid) {
		if (area.floodnum === floodnum) {
			return;
		}
		com.error(ERR.DROP, 'FloodArea_r: reflooded');
	}

	area.floodnum = floodnum;
	area.floodvalid = cm.floodvalid;

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
	cm.floodvalid++;
	
	var floodnum = 0;

	for (var i = 0; i < cm.areas.length; i++) {
		var area = cm.areas[i];
		if (area.floodvalid == cm.floodvalid) {
			continue;  // already flooded into
		}
		floodnum++;
		FloodArea_r(i, floodnum);
	}

}

/**
 * AreasConnected
 */
function AreasConnected(area1, area2) {
	// if ( cm_noAreas->integer ) {
	// 	return qtrue;
	// }

	if (area1 < 0 || area2 < 0) {
		return false;
	}

	if (area1 >= cm.areas.length || area2 >= cm.areas.length) {
		com.error(ERR.DROP, 'area >= cm.numAreas');
	}

	if (cm.areas[area1].floodnum === cm.areas[area2].floodnum) {
		return true;
	}
	return false;
}
