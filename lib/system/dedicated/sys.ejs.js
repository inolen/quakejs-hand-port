/*jshint node: true */
/*global setMatrixArrayType: true */

// r.js sucks in node require() calls as dependencies when using the
// simplified CommonJS module definition syntax we use for all other
// modules, so here we use the standard AMD definition.
define([
	'async',
	'glmatrix',
	'common/qshared',
	'common/com',
	'common/cvar'
],
function (async, glmatrix, QS, COM, Cvar) {
	'use strict';

	<% include ../sys-defines.js %>
	<% include ../sys-file.js %>
	<% include sys-main.js %>
	<% include sys-file.js %>
	<% include sys-net.js %>

	return {
		Init: Init
	};
});
