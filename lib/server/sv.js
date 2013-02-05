/*global mat4: true, vec3: true */

define('server/sv',
['underscore', 'ByteBuffer', 'common/qmath', 'common/qshared', 'common/cvar', 'clipmap/cm', 'game/gm'],
function (_, ByteBuffer, QMath, QS, Cvar, Clipmap, Game) {
	function Server(imp) {
		var SYS = imp.SYS;
		var COM = imp.COM;

		var CM = Clipmap.CreateInstance(ClipmapExports());
		var GM = Game.CreateInstance(GameExports());

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