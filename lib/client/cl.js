/*global vec3: true, mat4: true */

define('client/cl',
['underscore', 'glmatrix', 'ByteBuffer', 'common/qmath', 'common/sh', 'cgame/cg', 'clipmap/cm', 'renderer/re', 'sound/snd', 'ui/ui'],
function (_, glmatrix, ByteBuffer, QMath, sh, cg_mod, cm_mod, re_mod, snd_mod, ui_mod) {
	function Client(imp) {
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

		{{ include cl-defines.js }}
		{{ include cl-main.js }}
		{{ include cl-cgame.js }}
		{{ include cl-cmds.js }}
		{{ include cl-input.js }}
		{{ include cl-server.js }}

		return {
			ClientSnapshot:     ClientSnapshot,
			Init:               Init,
			InitCGame:          InitCGame,
			ShutdownCGame:      ShutdownCGame,
			InitSubsystems:     InitSubsystems,
			ShutdownSubsystems: ShutdownSubsystems,
			Frame:              Frame,
			MapLoading:         MapLoading,
			PacketEvent:        PacketEvent,
			KeyDownEvent:       KeyDownEvent,
			KeyUpEvent:         KeyUpEvent,
			MouseMoveEvent:     MouseMoveEvent,
			WriteBindings:      WriteBindings
		};
	}

	return {
		CreateInstance: function (imp) {
			return new Client(imp);
		}
	};
});
