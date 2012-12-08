/*global mat4: true, vec3: true */

define('server/sv',
['underscore', 'ByteBuffer', 'common/qmath', 'common/sh', 'game/gm', 'clipmap/cm'],
function (_, ByteBuffer, QMath, sh, gm_mod, cm_mod) {
	function Server(imp) {
		var sys = imp.sys;
		var com = imp.com;

		var SOLID_BMODEL          = sh.SOLID_BMODEL;
		var SNAPFLAG_NOT_ACTIVE   = sh.SNAPFLAG_NOT_ACTIVE;
		var SNAPFLAG_SERVERCOUNT  = sh.SNAPFLAG_SERVERCOUNT;
		var MAX_CLIENTS           = sh.MAX_CLIENTS;
		var MAX_GENTITIES         = sh.MAX_GENTITIES;
		var ENTITYNUM_NONE        = sh.ENTITYNUM_NONE;
		var ENTITYNUM_WORLD       = sh.ENTITYNUM_WORLD;
		var PACKET_BACKUP         = com.PACKET_BACKUP;
		var MAX_RELIABLE_COMMANDS = com.MAX_RELIABLE_COMMANDS;
		var MAX_MSGLEN            = com.MAX_MSGLEN;

		var CVF                   = sh.CVF;
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