/*global vec3: true, mat4: true */

define('renderer/re',
['underscore', 'glmatrix', 'ByteBuffer', 'common/sh', 'common/qmath'],
function (_, glmatrix, ByteBuffer, sh, QMath) {
	function Renderer(imp) {
		var sys = imp.sys;
		var com = imp.com;
		var cm  = imp.cm;

		var MAX_QPATH       = sh.MAX_QPATH;
		var GENTITYNUM_BITS = sh.GENTITYNUM_BITS;
		var MAX_GENTITIES   = sh.MAX_GENTITIES;
		var ENTITYNUM_WORLD = sh.ENTITYNUM_WORLD;

		var CVF             = sh.CVF;
		var CONTENTS        = sh.CONTENTS;
		var ERR             = com.ERR;

		{{ include re-defines.js }}
		{{ include re-main.js }}
		{{ include re-backend.js }}
		{{ include re-bsp.js }}
		{{ include re-image.js }}
		{{ include re-light.js }}
		{{ include re-model.js }}
		{{ include re-patch.js }}
		{{ include re-portal.js }}
		{{ include re-scene.js }}
		{{ include re-shader.js }}
		{{ include re-surface.js }}
		{{ include re-sky.js }}
		{{ include re-world.js }}

		return {
			// enums
			RT: RT,
			RF: RF,

			// funcs
			RefDef:                RefDef,
			ViewParms:             ViewParms,
			RefEntity:             RefEntity,

			Init:                  Init,
			Shutdown:              Shutdown,
			LoadMap:               LoadMap,
			NumInlineModels:       function () { return re.world.bmodels.length; },
			RenderScene:           RenderScene,
			AddRefEntityToScene:   AddRefEntityToScene,
			GetCounts:             function () { return re.counts; },
			RegisterShader:        RegisterShader,
			RegisterModel:         RegisterModel,
			RegisterSkin:          RegisterSkin,
			LerpTag:               LerpTag,
			ModelBounds:           ModelBounds,
			BuildCollisionBuffers: BuildCollisionBuffers
		};
	}

	return {
		CreateInstance: function (imp) {
			return new Renderer(imp);
		}
	};
});