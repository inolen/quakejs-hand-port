/*global vec3: true, mat4: true */

define('server/sv',
['underscore', 'ByteBuffer', 'common/qmath', 'common/sh', 'game/gm', 'clipmap/cm'],
function (_, ByteBuffer, QMath, sh, gm_mod, cm_mod) {
	function Server(imp) {
		var sys = imp.sys;
		var com = imp.com;

		// Use the following namespaces.
		var using = _.extend({},
			sh.constants,
			sh.enums,
			com.constants,
			com.enums
		);
		for (var key in using) {
			if (using.hasOwnProperty(key)) {
				eval('var ' + key + ' = using[key];');
			}
		}
		
		{{ include sv-defines.js }}
		{{ include sv-main.js }}
		{{ include sv-client.js }}
		{{ include sv-cmds.js }}
		{{ include sv-game.js }}
		{{ include sv-snapshot.js }}
		{{ include sv-world.js }}

		return {
			Init:             Init,
			Frame:            Frame,
			PacketEvent:      PacketEvent,
			SocketClosed:     SocketClosed
		};
	}

	return {
		CreateInstance: function (imp) {
			return new Server(imp);
		}
	};
});