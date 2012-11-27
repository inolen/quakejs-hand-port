/*global vec3: true, mat4: true */

define('server/sv',
['underscore', 'ByteBuffer', 'common/sh', 'common/qmath', 'game/gm', 'clipmap/cm'],
function (_, ByteBuffer, sh, QMath, gm_mod, cm_mod) {
	function Server(imp) {		
		{{ include ../common/sh-public.js }}

		var sys = imp.sys;
		var com = imp.com;

		var MAX_MAP_AREA_BYTES    = com.MAX_MAP_AREA_BYTES;
		var PACKET_BACKUP         = com.PACKET_BACKUP;
		var MAX_PACKET_USERCMDS   = com.MAX_PACKET_USERCMDS;
		var MAX_RELIABLE_COMMANDS = com.MAX_RELIABLE_COMMANDS;
		var MAX_MSGLEN            = com.MAX_MSGLEN;

		var CLM                   = com.CLM;
		var SVM                   = com.SVM;

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