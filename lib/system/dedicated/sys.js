define('system/dedicated/sys',
['common/sh', 'common/com'],
function (sh, com) {
	{{ include ../sys-defines.js }}
	{{ include sys-main.js }}
	{{ include sys-file.js }}
	{{ include sys-net.js }}
	
	return {
		Init: Init
	};
});
