/*jshint node: true */

define('system/dedicated/sys',
['underscore', 'glmatrix', 'common/sh', 'common/com'],
function (_, glmatrix, sh, com) {
	'use strict';

	var GAME_VERSION = sh.GAME_VERSION;
	
	var SE           = com.SE;

	{{ include ../sys-defines.js }}
	{{ include sys-main.js }}
	{{ include sys-file.js }}
	{{ include sys-net.js }}
	
	return {
		Init: Init
	};
});
