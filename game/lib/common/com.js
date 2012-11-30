/*global vec3: true, mat4: true */

define('common/com',
['underscore', 'ByteBuffer', 'common/sh', 'server/sv', 'client/cl'],
function (_, ByteBuffer, sh, sv_mod, cl_mod) {
	// Use the following namespaces.
	var using = _.extend({},
		sh.enums
	);
	for (var key in using) {
		if (using.hasOwnProperty(key)) {
			eval('var ' + key + ' = using[key];');
		}
	}

	{{ include com-defines.js }}
	{{ include com-cmds.js }}
	{{ include com-cvar.js }}
	{{ include com-main.js }}
	{{ include com-net.js }}

	return {
		constants: {
			PACKET_BACKUP: PACKET_BACKUP
		},
		
		enums: {
			SE: SE
		},

		Init:          Init,
		Frame:         Frame,
		ExecuteBuffer: ExecuteBuffer,
		QueueEvent:    QueueEvent,
		NetchanSetup:  NetchanSetup
	};
});