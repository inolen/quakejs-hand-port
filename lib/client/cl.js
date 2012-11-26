/*global vec3: true, mat4: true */

define('client/cl',
['underscore', 'glmatrix', 'ByteBuffer', 'common/sh', 'common/qmath', 'cgame/cg', 'clipmap/cm', 'renderer/re', 'sound/snd', 'ui/ui'],
function (_, glmatrix, ByteBuffer, sh, qm, cgame, clipmap, renderer, sound, uinterface) {
	{{ include ../common/sh-public.js }}
	{{ include ../common/com-public.js }}
	
	{{ include cl-local.js }}
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
});