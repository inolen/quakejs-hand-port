/*global vec3: true, vec4: true, mat4: true */

define(function (require) {
	var _              = require('underscore');
	var async          = require('async');
	var glmatrix       = require('glmatrix');
	var ByteBuffer     = require('ByteBuffer');
	var AssetCache     = require('common/asset-cache');
	var BspSerializer  = require('common/bsp-serializer');
	var Cvar           = require('common/cvar');
	var ShaderCompiler = require('common/shader-compiler');
	var TextTokenizer  = require('common/text-tokenizer');
	var QMath          = require('common/qmath');
	var QS             = require('common/qshared');

	function Renderer(imp) {
		var SYS = imp.SYS;
		var CL  = imp.CL;
		var CM  = imp.CM;

		<% include re-defines.js %>
		<% include re-main.js %>
		<% include re-backend.js %>
		<% include re-cmds.js %>
		<% include re-geometry.js %>
		<% include re-light.js %>
		<% include re-marks.js %>
		<% include re-model.js %>
		<% include re-patch.js %>
		<% include re-portal.js %>
		<% include re-scene.js %>
		<% include re-shader.js %>
		<% include re-sky.js %>
		<% include re-texture.js %>
		<% include re-world.js %>

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

	return Renderer;
});