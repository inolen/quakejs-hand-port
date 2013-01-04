/*global vec3: true, vec4: true, mat4: true */

define('clipmap/cm',
['underscore', 'glmatrix', 'ByteBuffer', 'common/sh', 'common/qmath', 'common/qpoly'],
function (_, glmatrix, ByteBuffer, sh, QMath, QPoly) {
	function ClipMap(imp) {
		var sys = imp.sys;
		var com = imp.com;

		var MAX_QPATH = sh.MAX_QPATH;

		var CONTENTS  = sh.CONTENTS;
		var MST       = sh.MST;
		var ERR       = com.ERR;

		{{ include cm-defines.js }}
		{{ include cm-main.js }}
		{{ include cm-bsp.js }}
		{{ include cm-patch.js }}
		{{ include cm-test.js }}
		{{ include cm-trace.js }}

		return {
			LoadWorld:                LoadWorld,
			EntityDefs:               function () { return cm.entities; },
			InlineModel:              InlineModel,
			TempBoxModel:             TempBoxModel,
			ModelBounds:              ModelBounds,
			LeafArea:                 LeafArea,
			LeafCluster:              LeafCluster,
			ClusterVisible:           ClusterVisible,
			BoxLeafnums:              BoxLeafnums,
			PointLeafnum:             PointLeafnum,
			PointContents:            PointContents,
			TransformedPointContents: TransformedPointContents,
			AdjustAreaPortalState:    AdjustAreaPortalState,
			AreasConnected:           AreasConnected,
			BoxTrace:                 BoxTrace,
			TransformedBoxTrace:      TransformedBoxTrace,
			EmitCollisionSurfaces:    EmitCollisionSurfaces
		};
	}

	return {
		CreateInstance: function (imp) {
			return new ClipMap(imp);
		}
	};
});
