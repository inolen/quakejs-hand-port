/*global setMatrixArrayType: true */

// HACK to get the current CDN root for the com_filecdn cvar.
var sys_cdnroot = (function () {
	var scripts = document.getElementsByTagName('script');
	var script = scripts[scripts.length - 1];
	var matches = script.src.match(/^(http|https):\/\/[^\/]+/);
	return matches[0];
})();

define(function (require) {
	var async    = require('async');
	var gameshim = require('gameshim');
	var glmatrix = require('glmatrix');
	var QS       = require('common/qshared');
	var COM      = require('common/com');
	var Cvar     = require('common/cvar');

	var css = require('text!system/browser/css/main.css');

	<% include ../sys-defines.js %>
	<% include ../sys-file.js %>
	<% include sys-main.js %>
	<% include sys-file.js %>
	<% include sys-input.js %>
	<% include sys-net.js %>

	return {
		Init: Init
	};
});
