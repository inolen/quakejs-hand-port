define('system/dedicated/sys',
['common/sh', 'common/com'],
function (sh, com) {
	{{ include ../../common/sh-public.js }}
	{{ include ../../common/com-public.js }}

	{{ include ../sys-local.js }}
	{{ include sys-main.js }}
	{{ include sys-file.js }}
	{{ include sys-net.js }}

	var sysinterface = {
		GetMilliseconds:      GetMilliseconds,
		ReadFile:             ReadFile,
		GetGLContext: GetGLContext,
		GetUIContext:   GetUIContext,
		NetCreateServer:      NetCreateServer,
		NetConnectToServer:   NetConnectToServer,
		NetSend:              NetSend,
		NetClose:             NetClose
	};
	
	return {
		Init: Init
	};
});