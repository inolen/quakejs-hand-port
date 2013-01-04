/*global vec3: true, mat4: true */

define('common/com',
['underscore', 'ByteBuffer', 'common/sh', 'common/qmath', 'server/sv', 'client/cl'],
function (_, ByteBuffer, sh, QMath, sv_mod, cl_mod) {
	var MAX_QPATH    = sh.MAX_QPATH;

	var CVF          = sh.CVF;

	var NA           = sh.NA;
	var NS           = sh.NS;
	var LUMP         = sh.LUMP;
	var MST          = sh.MST;

	var NetAdr       = sh.NetAdr;
	var World        = sh.World;
	var lumps_t      = sh.lumps_t;
	var dheader_t    = sh.dheader_t;
	var dmodel_t     = sh.dmodel_t;
	var dshader_t    = sh.dshader_t;
	var dplane_t     = sh.dplane_t;
	var dnode_t      = sh.dnode_t;
	var dleaf_t      = sh.dleaf_t;
	var dbrushside_t = sh.dbrushside_t;
	var dbrush_t     = sh.dbrush_t;
	var dfog_t       = sh.dfog_t;
	var drawVert_t   = sh.drawVert_t;
	var dsurface_t   = sh.dsurface_t;

	{{ include com-defines.js }}
	{{ include com-bsp.js }}
	{{ include com-cmds.js }}
	{{ include com-cvar.js }}
	{{ include com-main.js }}
	{{ include com-net.js }}

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