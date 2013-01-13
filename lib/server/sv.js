/*global mat4: true, vec3: true */

define('server/sv',
['underscore', 'ByteBuffer', 'common/qmath', 'common/qshared', 'game/gm', 'clipmap/cm'],
function (_, ByteBuffer, QMath, QShared, gm_mod, cm_mod) {
	function Server(imp) {
		var sys = imp.sys;
		var com = imp.com;

		var cm  = cm_mod.CreateInstance(ClipmapExports());
		var gm  = gm_mod.CreateInstance(GameExports());

		var SOLID_BMODEL          = QShared.SOLID_BMODEL;
		var SNAPFLAG_NOT_ACTIVE   = QShared.SNAPFLAG_NOT_ACTIVE;
		var SNAPFLAG_SERVERCOUNT  = QShared.SNAPFLAG_SERVERCOUNT;
		var MAX_CLIENTS           = QShared.MAX_CLIENTS;
		var MAX_GENTITIES         = QShared.MAX_GENTITIES;
		var ENTITYNUM_NONE        = QShared.ENTITYNUM_NONE;
		var ENTITYNUM_WORLD       = QShared.ENTITYNUM_WORLD;
		var PACKET_BACKUP         = com.PACKET_BACKUP;
		var MAX_RELIABLE_COMMANDS = com.MAX_RELIABLE_COMMANDS;
		var MAX_MSGLEN            = com.MAX_MSGLEN;

		var CVF                   = QShared.CVF;
		var CONTENTS              = QShared.CONTENTS;
		var NS                    = QShared.NS;
		var CLM                   = com.CLM;
		var SVM                   = com.SVM;

		{{ include sv-defines.js }}
		{{ include sv-main.js }}
		{{ include sv-client.js }}
		{{ include sv-cvar.js }}
		{{ include sv-cmds.js }}
		{{ include sv-game.js }}
		{{ include sv-snapshot.js }}
		{{ include sv-world.js }}

		return {
			Init:               Init,
			Running:            Running,
			Frame:              Frame,
			PacketEvent:        PacketEvent,
			ClientDisconnected: ClientDisconnected,
			Kill:               Kill
		};
	}

	return {
		CreateInstance: function (imp) {
			return new Server(imp);
		}
	};
});