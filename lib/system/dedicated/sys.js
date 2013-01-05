/*jshint node: true */
/*global setMatrixArrayType: true */

define('system/dedicated/sys',
['underscore', 'glmatrix', 'common/qshared', 'common/com'],
function (_, glmatrix, QShared, com) {
	'use strict';

	var GAME_VERSION = QShared.GAME_VERSION;

	var SE           = com.SE;

	{{ include ../sys-defines.js }}
	{{ include sys-main.js }}
	{{ include sys-file.js }}
	{{ include sys-net.js }}

	return {
		Init: Init
	};
});
