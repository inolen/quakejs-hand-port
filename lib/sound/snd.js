/*global vec3: true, mat4: true */

define('sound/snd',
['underscore'],
function (_) {	
	function Sound(imp) {
		{{ include ../common/sh-public.js }}

		{{ include snd-local.js }}
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