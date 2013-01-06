/*global setMatrixArrayType: true */

define('system/editor/sys',
['underscore', 'gameshim', 'glmatrix', 'common/qshared', 'common/com'],
function (_, gameshim, glmatrix, QShared, com) {
	var GAME_VERSION = QShared.GAME_VERSION;

	var SE           = com.SE;

	{{ include ../sys-defines.js }}
	{{ include sys-main.js }}
	{{ include sys-file.js }}
	{{ include sys-input.js }}

	return {
		Init: Init
	};
});
