/*global MAX_CLIENTS: true, MAX_GENTITIES: true,
         ENTITYNUM_NONE: true, ENTITYNUM_WORLD: true, LIGHTNING_RANGE: true, SOLID_BMODEL: true,
         CONTENTS: true, CVF: true, ERR: true,
         PM: true, PMF: true, GT: true, WS: true, IT: true, MASK: true, STAT: true, WP: true, PW: true,
         TEAM: true, PERS: true, PLAYEREVENTS: true, ET: true, EF: true, EV: true, ANIM: true, MOD: true,
         mat4: true, vec3: true */

define('cgame/cg',
['underscore', 'glmatrix', 'common/qmath', 'common/sh', 'game/bg'],
function (_, glmatrix, QMath, sh, bg) {
	function CGame(imp) {
		var sys = imp.sys;
		var com = imp.com;
		var cl  = imp.cl;
		var re  = imp.re;
		var snd = imp.snd;
		var ui  = imp.ui;

		// Use the following namespaces.
		var using = _.extend({},
			sh.constants,
			sh.enums,
			com.enums,
			bg.constants,
			bg.enums,
			re.enums
		);
		for (var key in using) {
			if (using.hasOwnProperty(key)) {
				eval('var ' + key + ' = using[key];');
			}
		}

		{{ include cg-defines.js }}
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
