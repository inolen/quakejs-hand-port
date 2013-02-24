
/*global setMatrixArrayType: true */

define(function (require) {
	var async    = require('async');
	var gameshim = require('gameshim');
	var glmatrix = require('glmatrix');
	var QS       = require('common/qshared');
	var COM      = require('common/com');

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
