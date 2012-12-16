/*global vec3: true */

define('sound/snd',
['underscore', 'glmatrix', 'common/sh'],
function (_, glmatrix, sh) {
	function Snd(imp) {
		var sys = imp.sys;
		var com = imp.com;

		var MAX_GENTITIES = sh.MAX_GENTITIES;

		var CVF           = sh.CVF;
		var ERR           = com.ERR;

		{{ include snd-defines.js }}
		{{ include snd-main.js }}

		return {
			Init:                 Init,
			Shutdown:             Shutdown,
			Frame:                Frame,
			RegisterSound:        RegisterSound,
			StartSound:           StartSound,
			StartLocalSound:      StartLocalSound,
			StartBackgroundTrack: StartBackgroundTrack,
			Respatialize:         Respatialize,
			UpdateEntityPosition: UpdateEntityPosition
		};
	}
	
	return {
		CreateInstance: function (imp) {
			return new Snd(imp);
		}
	};
});
