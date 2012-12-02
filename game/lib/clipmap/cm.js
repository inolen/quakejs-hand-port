/*global vec3: true, mat4: true */

define('clipmap/cm',
['underscore', 'glmatrix', 'ByteBuffer', 'common/sh', 'common/qmath'],
function (_, glmatrix, ByteBuffer, sh, QMath) {
	function ClipMap(imp) {
		var sys = imp.sys;

		// Use the following namespaces.
		var using = _.extend({},
			sh.constants,
			sh.enums
		);
		for (var key in using) {
			if (using.hasOwnProperty(key)) {
				eval('var ' + key + ' = using[key];');
			}
		}

		{{ include cm-defines.js }}
		{{ include cm-main.js }}
		{{ include cm-bsp.js }}
		{{ include cm-patch.js }}
		{{ include cm-polylib.js }}
		{{ include cm-test.js }}
		{{ include cm-trace.js }}

		return {
			LoadMap:               LoadMap,
			EntityDefs:            function () { return cm.entities; },
			InlineModel:           InlineModel,
			TempBoxModel:          TempBoxModel,
			ModelBounds:           ModelBounds,
			LeafArea:              LeafArea,
			LeafCluster:           LeafCluster,
			ClusterVisible:        ClusterVisible,
			BoxLeafnums:           BoxLeafnums,
			PointLeafnum:          PointLeafnum,
			AreasConnected:        AreasConnected,
			BoxTrace:              BoxTrace,
			TransformedBoxTrace:   TransformedBoxTrace,
			EmitCollisionSurfaces: EmitCollisionSurfaces,
			SnapVector:            SnapVector
		};
	}

	return {
		CreateInstance: function (imp) {
			return new ClipMap(imp);
		}
	};
});
