/*global vec3: true, mat4: true */

define('server/sv',
['underscore', 'ByteBuffer', 'common/sh', 'common/qmath', 'game/gm', 'client/cl', 'clipmap/cm'],
function (_, ByteBuffer, sh, qm, game, cl, clipmap) {
	{{ include ../common/sh-public.js }}
	{{ include ../common/com-public.js }}
	{{ include ../game/gm-public.js }}

	{{ include sv-local.js }}
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
});