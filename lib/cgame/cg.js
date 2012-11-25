/*global vec3: true, mat4: true */

define('cgame/cg',
['underscore', 'glmatrix', 'common/sh', 'common/qmath', 'game/bg'],
function (_, glmatrix, sh, qm, bg) {	
	function CGame(imp) {
		{{ include ../common/sh-public.js }}
		{{ include ../game/bg-public.js }}
		{{ include ../renderer/re-public.js }}

		{{ include cg-local.js }}
		{{ include cg-main.js }}
		{{ include cg-cmds.js }}
		{{ include cg-draw.js }}
		{{ include cg-effects.js }}
		{{ include cg-ents.js }}
		{{ include cg-event.js }}
		{{ include cg-localents.js }}
		{{ include cg-players.js }}
		{{ include cg-playerstate.js }}
		{{ include cg-predict.js }}
		{{ include cg-servercmds.js }}
		{{ include cg-snapshot.js }}
		{{ include cg-view.js }}
		{{ include cg-weapons.js }}

		return {
			Init: Init,
			Shutdown: Shutdown,
			Frame: Frame
		};
	}

	return {
		CreateInstance: function (imp) {
			return new CGame(imp);
		}
	};
});
