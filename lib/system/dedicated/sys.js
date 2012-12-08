/*jshint node: true */

define('system/dedicated/sys',
['underscore', 'common/sh', 'common/com'],
function (_, sh, com) {
	'use strict';

	var SE = com.SE;

	{{ include ../sys-defines.js }}
	{{ include sys-main.js }}
	{{ include sys-file.js }}
	{{ include sys-net.js }}
	
	return {
		Init: Init
	};
});
