/*global vec3: true, mat4: true */

define('renderer/re',
['underscore', 'glmatrix', 'ByteBuffer', 'common/sh', 'common/qmath'],
function (_, glmatrix, ByteBuffer, sh, QMath) {
	function Renderer(imp) {
		var sys = imp.sys;
		var com = imp.com;
		var cm  = imp.cm;

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
			enums: {
				RT: RT,
				RF: RF
			},

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
	};

	return {
		CreateInstance: function (imp) {
			return new Renderer(imp);
		}
	};
});