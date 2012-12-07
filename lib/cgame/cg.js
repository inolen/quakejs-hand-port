/*global ANIM_TOGGLEBIT: true, CMD_BACKUP: true, CROUCH_VIEWHEIGHT: true, DEFAULT_SHOTGUN_COUNT: true,
         DEFAULT_SHOTGUN_SPREAD: true, DEFAULT_VIEWHEIGHT: true, ENTITYNUM_NONE: true, ENTITYNUM_WORLD: true,
         EV_EVENT_BITS: true, EVENT_VALID_MSEC: true, LIGHTNING_RANGE: true, MAX_CLIENTS: true,
         MAX_GENTITIES: true, MAX_PS_EVENTS: true, MAX_WEAPONS: true,
         SNAPFLAG_NOT_ACTIVE: true, SNAPFLAG_SERVERCOUNT: true, SOLID_BMODEL: true,
         CONTENTS: true, CVF: true, ERR: true, RF: true, RT: true, SURF: true, TR: true,
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
		var cm  = imp.cm;
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
