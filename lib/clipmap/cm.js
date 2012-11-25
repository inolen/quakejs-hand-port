/*global vec3: true, mat4: true */

define('clipmap/cm',
['underscore', 'glmatrix', 'ByteBuffer', 'common/sh', 'common/qmath'],
function (_, glmatrix, ByteBuffer, sh, qm) {
	function ClipMap(imp) {
		{{ include ../common/sh-public.js }}

		{{ include cm-local.js }}
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
