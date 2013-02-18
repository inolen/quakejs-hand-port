/*global vec3: true, vec4: true, mat4: true */

define(function (require) {
	var glmatrix      = require('glmatrix');
	var BspSerializer = require('common/bsp-serializer');
	var QMath         = require('common/qmath');
	var QS            = require('common/qshared');
	var SURF          = require('common/surfaceflags');

	function ClipMap(imp) {
		var log = imp.log;
		var error = imp.error;

		<% include cm-defines.js %>
		<% include cm-patch.js %>
		<% include cm-test.js %>
		<% include cm-trace.js %>
		<% include cm-world.js %>

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

	return ClipMap;
});
