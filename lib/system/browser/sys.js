define('system/browser/sys',
['common/sh', 'common/com'],
function (sh, com) {
	{{ include ../../common/com-public.js }}
	{{ include ../sys-local.js }}
	{{ include sys-main.js }}
	{{ include sys-file.js }}
	{{ include sys-input.js }}
	{{ include sys-net.js }}

	var sysinterface = {
		GetMilliseconds:      GetMilliseconds,
		ReadFile:             ReadFile,
		WriteFile:            WriteFile,
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
