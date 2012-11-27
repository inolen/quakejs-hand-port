/*global vec3: true, mat4: true */

define('sound/snd',
['underscore'],
function (_) {	
	function Sound(imp) {
		{{ include ../common/sh-public.js }}

		var sys = imp.sys;
		var com = imp.com;

		{{ include snd-defines.js }}
		{{ include snd-main.js }}

		return {
			Init:                 Init,
			Shutdown:             Shutdown,
			Frame:                Frame,
			RegisterSound:        RegisterSound,
			StartSound:           StartSound,
			StartBackgroundTrack: StartBackgroundTrack,
			Respatialize:         Respatialize,
			UpdateEntityPosition: UpdateEntityPosition
		};
	}
	
	return {
		CreateInstance: function (imp) {
			return new Sound(imp);
		}
	};
});
