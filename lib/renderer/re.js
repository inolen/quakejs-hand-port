/*global vec3: true, mat4: true */

define('renderer/re',
['underscore', 'glmatrix', 'ByteBuffer', 'common/sh', 'common/qmath'],
function (_, glmatrix, ByteBuffer, sh, QMath) {
	function Renderer(imp) {
		{{ include ../common/sh-public.js }}

		var sys = imp.sys;
		var com = imp.com;
		var cm  = imp.cm;

		{{ include re-defines.js }}
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
			RT:                    RT,
			RF:                    RF,

			RefDef:                RefDef,
			ViewParms:             ViewParms,
			RefEntity:             RefEntity,

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