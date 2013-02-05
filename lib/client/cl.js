/*global mat4: true, vec3: true */

define('client/cl',
[
	'underscore', 'async', 'glmatrix', 'ByteBuffer',
	'common/qmath', 'common/qshared', 'common/cvar',
	'cgame/cg', 'clipmap/cm', 'renderer/re', 'sound/snd', 'ui/ui'
],
function (
	_, async, glmatrix, ByteBuffer,
	QMath, QS, Cvar,
	CGame, Clipmap, Renderer, Sound, UserInterface) {
	function Client(imp) {
		var SYS = imp.SYS;
		var COM = imp.COM;

		var CM  = Clipmap.CreateInstance(ClipmapExports());
		var RE  = Renderer.CreateInstance(RendererExports());
		var SND = Sound.CreateInstance(SoundExports());
		var UI  = UserInterface.CreateInstance(UIExports());
		var CG  = CGame.CreateInstance(CGameExports());

		{{ include cl-defines.js }}
		{{ include cl-main.js }}
		{{ include cl-cgame.js }}
		{{ include cl-cmds.js }}
		{{ include cl-cvar.js }}
		{{ include cl-input.js }}
		{{ include cl-server.js }}

		return {
			ClientSnapshot:         ClientSnapshot,
			Init:                   Init,
			InitCGame:              InitCGame,
			ShutdownCGame:          ShutdownCGame,
			InitSubsystems:         InitSubsystems,
			ShutdownSubsystems:     ShutdownSubsystems,
			Frame:                  Frame,
			ForwardCommandToServer: ForwardCommandToServer,
			MapLoading:             MapLoading,
			Disconnect:             Disconnect,
			PacketEvent:            PacketEvent,
			KeyDownEvent:           KeyDownEvent,
			KeyUpEvent:             KeyUpEvent,
			MouseMoveEvent:         MouseMoveEvent,
			BindsModified:          BindsModified,
			ClearBindsModified:     ClearBindsModified,
			WriteBindings:          WriteBindings
		};
	}

	return {
		CreateInstance: function (imp) {
			return new Client(imp);
		}
	};
});
