/*global vec3: true, mat4: true */

define('common/com',
['underscore', 'ByteBuffer', 'common/bsp-serializer', 'common/qmath', 'common/sh', 'server/sv', 'client/cl'],
function (_, ByteBuffer, bspSerializer, QMath, sh, sv_mod, cl_mod) {
	var CVF    = sh.CVF;
	var NA     = sh.NA;
	var NS     = sh.NS;

	var NetAdr = sh.NetAdr;

	{{ include com-defines.js }}
	{{ include com-cmds.js }}
	{{ include com-cvar.js }}
	{{ include com-main.js }}
	{{ include com-net.js }}
	{{ include com-world.js }}

	return {
		PACKET_BACKUP: PACKET_BACKUP,

		SE:            SE,

		Init:          Init,
		Frame:         Frame,
		ExecuteBuffer: ExecuteBuffer,
		QueueEvent:    QueueEvent,
		NetchanSetup:  NetchanSetup,
	};
});