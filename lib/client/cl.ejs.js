/*global mat4: true, vec3: true */

define(function (require) {
	var async         = require('vendor/async');
	var glmatrix      = require('vendor/gl-matrix');
	var BitStream     = require('vendor/bit-buffer').BitStream;
	var QMath         = require('common/qmath');
	var QS            = require('common/qshared');
	var Cvar          = require('common/cvar');
	var CGame         = require('cgame/cg');
	var Clipmap       = require('clipmap/cm');
	var Renderer      = require('renderer/re');
	var Sound         = require('sound/snd');
	var UserInterface = require('ui/ui');

	function Client(imp) {
		var SYS = imp.SYS;
		var COM = imp.COM;
		var CM  = new Clipmap(ClipmapExports());
		var RE  = new Renderer(RendererExports());
		var SND = new Sound(SoundExports());
		var UI  = new UserInterface(UIExports());
		var CG  = new CGame(CGameExports());
		var SV  = null;

		<% include cl-defines.js %>
		<% include cl-main.js %>
		<% include cl-cgame.js %>
		<% include cl-cmds.js %>
		<% include cl-input.js %>
		<% include cl-server.js %>

		return {
			ClientSnapshot:         ClientSnapshot,
			RegisterKeyCommands:    RegisterKeyCommands,
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
			PrintConsole:           PrintConsole,
			KeyDownEvent:           KeyDownEvent,
			KeyUpEvent:             KeyUpEvent,
			KeyPressEvent:          KeyPressEvent,
			MouseMoveEvent:         MouseMoveEvent,
			BindsModified:          BindsModified,
			ClearBindsModified:     ClearBindsModified,
			WriteBindings:          WriteBindings
		};
	}

	return Client;
});
