/*global vec3: true, mat4: true */

define('sound/snd',
['underscore', 'common/sh'],
function (_, sh) {	
	function Sound(imp) {
		var sys = imp.sys;
		var com = imp.com;

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
