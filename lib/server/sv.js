/*global mat4: true, vec3: true */

define(function (require) {
	var ByteBuffer = require('ByteBuffer');
	var QMath      = require('common/qmath');
	var QS         = require('common/qshared');
	var Cvar       = require('common/cvar');
	var Clipmap    = require('clipmap/cm');
	var Game       = require('game/gm');

	function Server(imp) {
		var SYS = imp.SYS;
		var COM = imp.COM;

		var CM = new Clipmap(ClipmapExports());
		var GM = new Game(GameExports());

		include('server/sv-defines');
		include('server/sv-main');
		include('server/sv-client');
		include('server/sv-cvar');
		include('server/sv-cmds');
		include('server/sv-game');
		include('server/sv-snapshot');
		include('server/sv-world');

		return {
			Init:               Init,
			Running:            Running,
			Frame:              Frame,
			PacketEvent:        PacketEvent,
			ClientDisconnected: ClientDisconnected,
			Kill:               Kill
		};
	}

	return Server;
});