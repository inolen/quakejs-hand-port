/*global vec3: true */

define(function (require) {
	var glmatrix   = require('vendor/gl-matrix');
	var AssetCache = require('common/asset-cache');
	var Cvar       = require('common/cvar');
	var QS         = require('common/qshared');

	function Sound(imp) {
		var SYS = imp.SYS;
		var CL  = imp.CL;

		<% include snd-defines.js %>
		<% include snd-main.js %>

		return {
			Init:                 Init,
			Shutdown:             Shutdown,
			Frame:                Frame,
			RegisterSound:        RegisterSound,
			StartSound:           StartSound,
			StartLocalSound:      StartLocalSound,
			StartBackgroundTrack: StartBackgroundTrack,
			AddLoopingSound:      AddLoopingSound,
			Respatialize:         Respatialize,
			UpdateEntityPosition: UpdateEntityPosition
		};
	}

	return Sound;
});
