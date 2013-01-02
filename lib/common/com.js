/*global vec3: true, mat4: true */

define('common/com',
['underscore', 'ByteBuffer', 'common/sh', 'server/sv', 'client/cl'],
function (_, ByteBuffer, sh, sv_mod, cl_mod) {
	var CVF = sh.CVF;

	var NA = sh.NA;
	var NS = sh.NS;

	var NetAdr = sh.NetAdr;

	{{ include com-defines.js }}
	{{ include com-cmds.js }}
	{{ include com-cvar.js }}
	{{ include com-main.js }}
	{{ include com-net.js }}

	return {
		// constants
		PACKET_BACKUP: PACKET_BACKUP,

		// enums
		SE:            SE,

		// funcs
		Init:          Init,
		Frame:         Frame,
		ExecuteBuffer: ExecuteBuffer,
		QueueEvent:    QueueEvent,
		NetchanSetup:  NetchanSetup
	};
});