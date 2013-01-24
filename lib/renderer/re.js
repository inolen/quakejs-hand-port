/*global vec3: true, vec4: true, mat4: true */

define('renderer/re',
[
	'underscore', 'async', 'glmatrix', 'ByteBuffer',
	'common/qmath', 'common/qshared',
	'common/asset-cache', 'common/bsp-serializer', 'common/shader-compiler', 'common/text-tokenizer'
],
function (
	_, async, glmatrix, ByteBuffer,
	QMath, QShared, AssetCache, BspSerializer, ShaderCompiler, TextTokenizer
) {
	function Renderer(imp) {
		var sys = imp.sys;
		var com = imp.com;
		var cm  = imp.cm;

		var GENTITYNUM_BITS = QShared.GENTITYNUM_BITS;
		var MAX_GENTITIES   = QShared.MAX_GENTITIES;
		var ENTITYNUM_WORLD = QShared.ENTITYNUM_WORLD;

		var CVF             = QShared.CVF;
		var SURF            = QShared.SURF;
		var CONTENTS        = QShared.CONTENTS;

		var MST             = BspSerializer.MST;
		var SS              = ShaderCompiler.SS;

		{{ include re-defines.js }}
		{{ include re-main.js }}
		{{ include re-backend.js }}
		{{ include re-cmds.js }}
		{{ include re-cvar.js }}
		{{ include re-geometry.js }}
		{{ include re-light.js }}
		{{ include re-marks.js }}
		{{ include re-model.js }}
		{{ include re-patch.js }}
		{{ include re-portal.js }}
		{{ include re-scene.js }}
		{{ include re-shader.js }}
		{{ include re-sky.js }}
		{{ include re-texture.js }}
		{{ include re-world.js }}

		return {
			RT:  RT,
			RF:  RF,
			RDF: RDF,

			RefDef:                RefDef,
			ViewParms:             ViewParms,
			RefEntity:             RefEntity,
			PolyVert:              PolyVert,

			Init:                  Init,
			Shutdown:              Shutdown,
			LoadWorld:             LoadWorld,
			NumInlineModels:       function () { return re.world.bmodels.length; },
			RenderScene:           RenderScene,
			AddRefEntityToScene:   AddRefEntityToScene,
			AddLightToScene:       AddLightToScene,
			GetCounts:             function () { return re.counts; },
			RegisterShader:        RegisterShader,
			RegisterModel:         RegisterModel,
			RegisterSkin:          RegisterSkin,
			LerpTag:               LerpTag,
			ModelBounds:           ModelBounds,
			MarkFragments:         MarkFragments
		};
	}

	return {
		CreateInstance: function (imp) {
			return new Renderer(imp);
		}
	};
});