/*global vec3: true, mat4: true */

define('client/cl',
['underscore', 'glmatrix', 'ByteBuffer', 'common/qmath', 'common/sh', 'cgame/cg', 'clipmap/cm', 'renderer/re', 'sound/snd', 'ui/ui'],
function (_, glmatrix, ByteBuffer, QMath, sh, cg_mod, cm_mod, re_mod, snd_mod, ui_mod) {
	function Client(imp) {
		var sys = imp.sys;
		var com = imp.com;

		var CMD_BACKUP            = sh.CMD_BACKUP;
		var SNAPFLAG_NOT_ACTIVE   = sh.SNAPFLAG_NOT_ACTIVE;
		var MAX_GENTITIES         = sh.MAX_GENTITIES;
		var MAX_MAP_AREA_BYTES    = com.MAX_MAP_AREA_BYTES;
		var PACKET_BACKUP         = com.PACKET_BACKUP;
		var MAX_RELIABLE_COMMANDS = com.MAX_RELIABLE_COMMANDS;
		var MAX_MSGLEN            = com.MAX_MSGLEN;

		var CVF                   = sh.CVF;
		var BUTTON                = sh.BUTTON;
		var ERR                   = com.ERR;
		var CLM                   = com.CLM;
		var SVM                   = com.SVM;
		
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
