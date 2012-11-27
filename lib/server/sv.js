/*global vec3: true, mat4: true */

define('server/sv',
['underscore', 'ByteBuffer', 'common/qmath', 'common/sh', 'game/gm', 'clipmap/cm'],
function (_, ByteBuffer, QMath, sh, gm_mod, cm_mod) {
	function Server(imp) {
		var sys = imp.sys;
		var com = imp.com;

		var MAX_CLIENTS           = sh.MAX_CLIENTS;
		var MAX_GENTITIES         = sh.MAX_GENTITIES;
		var ENTITYNUM_NONE        = sh.ENTITYNUM_NONE;
		var ENTITYNUM_WORLD       = sh.ENTITYNUM_WORLD;
		var ENTITYNUM_MAX_NORMAL  = sh.ENTITYNUM_MAX_NORMAL;

		var MAX_MAP_AREA_BYTES    = com.MAX_MAP_AREA_BYTES;
		var PACKET_BACKUP         = com.PACKET_BACKUP;
		var MAX_PACKET_USERCMDS   = com.MAX_PACKET_USERCMDS;
		var MAX_RELIABLE_COMMANDS = com.MAX_RELIABLE_COMMANDS;
		var MAX_MSGLEN            = com.MAX_MSGLEN;

		var CVF                   = sh.CVF;
		var BUTTON                = sh.BUTTON;
		var CONTENTS              = sh.CONTENTS;

		var ERR                   = com.ERR;
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