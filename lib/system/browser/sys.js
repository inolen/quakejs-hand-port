define('system/browser/sys',
['underscore', 'gameshim', 'common/sh', 'common/com'],
function (_, gameshim, sh, com) {
	var SE = com.SE;
	
	{{ include ../sys-defines.js }}
	{{ include sys-main.js }}
	{{ include sys-file.js }}
	{{ include sys-input.js }}
	{{ include sys-net.js }}
	
	return {
		Init: Init
	};
});
