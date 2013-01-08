/*global vec3: true, mat4: true */

define('common/com',
[
	'underscore', 'ByteBuffer', 'common/bsp-serializer', 'common/map-serializer', 'common/map-compiler',
	'common/qmath', 'common/qshared', 'server/sv', 'client/cl'
],
function (_, ByteBuffer, BspSerializer, MapSerializer, MapCompiler, QMath, QShared, sv_mod, cl_mod) {
	var MAX_GENTITIES  = QShared.MAX_GENTITIES;
	var MAX_STATS      = QShared.MAX_STATS;
	var MAX_PERSISTANT = QShared.MAX_PERSISTANT;
	var MAX_POWERUPS   = QShared.MAX_POWERUPS;
	var MAX_WEAPONS    = QShared.MAX_WEAPONS;

	var CVF            = QShared.CVF;
	var NA             = QShared.NA;
	var NS             = QShared.NS;

	var NetAdr         = QShared.NetAdr;

	{{ include com-defines.js }}
	{{ include com-cmds.js }}
	{{ include com-cvar.js }}
	{{ include com-main.js }}
	{{ include com-msg.js }}
	{{ include com-net.js }}
	{{ include com-world.js }}

	return {
		PACKET_BACKUP: PACKET_BACKUP,

		SE:            SE,

		Init:          Init,
		Frame:         Frame,
		ExecuteBuffer: ExecuteBuffer,
		QueueEvent:    QueueEvent
	};
});