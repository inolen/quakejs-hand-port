/*global vec3: true, mat4: true */

define(function (require) {
	var async         = require('vendor/async');
	var BitStream     = require('vendor/bit-buffer').BitStream;
	var QMath         = require('common/qmath');
	var QS            = require('common/qshared');
	var BspSerializer = require('common/bsp-serializer');
	var Cvar          = require('common/cvar');
	var Server        = require('server/sv');
	var Client        = require('client/cl');

	<% include com-defines.js %>
	<% include com-cmds.js %>
	<% include com-main.js %>
	<% include com-msg.js %>
	<% include com-net.js %>
	<% include com-world.js %>

	return {
		PACKET_BACKUP: PACKET_BACKUP,

		SE:            SE,

		Init:          Init,
		Frame:         Frame,
		ExecuteBuffer: ExecuteBuffer,
		QueueEvent:    QueueEvent
	};
});