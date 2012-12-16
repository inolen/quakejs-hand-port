define('system/browser/sys',
['underscore', 'gameshim', 'glmatrix', 'common/sh', 'common/com'],
function (_, gameshim, glmatrix, sh, com) {
	var GAME_VERSION = sh.GAME_VERSION;
	
	var SE           = com.SE;
	
	{{ include ../sys-defines.js }}
	{{ include sys-main.js }}
	{{ include sys-file.js }}
	{{ include sys-input.js }}
	{{ include sys-net.js }}
	
	return {
		Init: Init
	};
});
