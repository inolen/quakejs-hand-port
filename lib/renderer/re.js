/*global vec3: true, mat4: true */

define('renderer/re',
['underscore', 'glmatrix', 'ByteBuffer', 'common/sh', 'common/qmath'],
function (_, glmatrix, ByteBuffer, sh, qm) {
	function Renderer(imp) {
		{{ include ../common/sh-public.js }}

		{{ include re-public.js }}
		{{ include re-local.js }}
		{{ include re-main.js }}
		{{ include re-backend.js }}
		{{ include re-bsp.js }}
		{{ include re-image.js }}
		{{ include re-light.js }}
		{{ include re-model.js }}
		{{ include re-patch.js }}
		{{ include re-scene.js }}
		{{ include re-shader.js }}
		{{ include re-surface.js }}
		{{ include re-sky.js }}
		{{ include re-world.js }}

		return {
			RefDef:                RefDef,
			RefEntity:             RefEntity,
			ViewParms:             ViewParms,

			Init:                  Init,
			Shutdown:              Shutdown,
			LoadMap:               LoadMap,
			RenderScene:           RenderScene,
			AddRefEntityToScene:   AddRefEntityToScene,
			GetCounts:             function () { return re.counts; },
			RegisterShader:        RegisterShader,
			RegisterModel:         RegisterModel,
			RegisterSkin:          RegisterSkin,
			LerpTag:               LerpTag,
			BuildCollisionBuffers: BuildCollisionBuffers
		};
	};

	return {
		CreateInstance: function (imp) {
			return new Renderer(imp);
		}
	};
});