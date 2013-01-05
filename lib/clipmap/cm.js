/*global vec3: true, vec4: true, mat4: true */

define('clipmap/cm',
['underscore', 'glmatrix', 'ByteBuffer', 'common/bsp-serializer', 'common/qmath', 'common/qshared'],
function (_, glmatrix, ByteBuffer, BspSerializer, QMath, QShared) {
	function ClipMap(imp) {
		var sys = imp.sys;
		var com = imp.com;

		var CONTENTS  = QShared.CONTENTS;
		var ERR       = com.ERR;
		var MST       = BspSerializer.MST;

		{{ include cm-defines.js }}
		{{ include cm-main.js }}
		{{ include cm-patch.js }}
		{{ include cm-test.js }}
		{{ include cm-trace.js }}
		{{ include cm-world.js }}

		return {
			LoadWorld:                LoadWorld,
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
