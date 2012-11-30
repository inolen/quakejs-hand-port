
/*
 * PointLeafnum_r
 */
// function PointLeafnum_r(p, num) {
// 	var d;
// 	var node;
// 	var plane;
// 	
// 	while (num >= 0)
// 	{
// 		node = cm.nodes + num;
// 		plane = node.plane;
// 		
// 		if (plane.type < 3) {
// 			d = p[plane.type] - plane.dist;
// 		} else {
// 			d = vec3.dot(plane.normal, p) - plane.dist;
// 		}
// 		
// 		if (d < 0) {
// 			num = node.children[1];
// 		} else {
// 			num = node.children[0];
// 		}
// 	}
// 	
// // 	c_pointcontents++;		// optimize counter
// 	
// 	return (-1) - num;
// }
// 
// function PointLeafnum(p) {
// 	if (!cm.numNodes) {	// map not loaded
// 		return 0;
// 	}
// 	return PointLeafnum_r(p, 0);
// }

/*********************************************************************
 *
 * LEAF LISTING
 *
 ********************************************************************/

/**
 * BoxLeafnums
 *
 * Fills in a list of all the leafs touched
 */
function BoxLeafnums_r(ll, mins, maxs, nodenum) {
	while (1) {
		if (nodenum < 0) {
			if (ll.count >= MAX_POSITION_LEAFS) {
				return;
			}
			ll.list[ll.count++] = -1 - nodenum;
			return;
		}
	
		var node = cm.nodes[nodenum];
		var s = QMath.BoxOnPlaneSide(mins, maxs, cm.planes[node.planeNum]);

		if (s === 1) {
			nodenum = node.childrenNum[0];
		} else if (s === 2) {
			nodenum = node.childrenNum[1];
		} else {
			// go down both
			BoxLeafnums_r(ll, mins, maxs, node.childrenNum[0]);
			nodenum = node.childrenNum[1];
		}
	}
}


/********************************************************************/


/**
 * CM_PointContents
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
