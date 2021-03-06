/*global mat4: true, vec3: true */

define(function (require) {
	var BitStream  = require('vendor/bit-buffer').BitStream;
	var QMath      = require('common/qmath');
	var QS         = require('common/qshared');
	var SURF       = require('common/surfaceflags');
	var Cvar       = require('common/cvar');
	var Clipmap    = require('clipmap/cm');
	var Game       = require('game/gm');

	function Server(imp) {
		var SYS = imp.SYS;
		var COM = imp.COM;
		var CM  = new Clipmap(ClipmapExports());
		var GM  = new Game(GameExports());
		var CL  = null;

		<% include sv-defines.js %>
		<% include sv-main.js %>
		<% include sv-client.js %>
		<% include sv-cmds.js %>
		<% include sv-game.js %>
		<% include sv-snapshot.js %>
		<% include sv-world.js %>

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