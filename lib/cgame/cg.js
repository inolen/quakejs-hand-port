/*global vec3: true, mat4: true */

define('cgame/cg',
['underscore', 'glmatrix', 'common/sh', 'common/qmath', 'game/bg'],
function (_, glmatrix, sh, QMath, bg) {
	function CGame(imp) {
		{{ include ../common/sh-public.js }}

		var sys = imp.sys;
		var com = imp.com;
		var cl  = imp.cl;
		var re  = imp.re;
		var snd = imp.snd;
		var ui  = imp.ui;

		var RT   = re.RT;
		var RF   = re.RF;
		var PM   = bg.PM;
		var PMF  = bg.PMF;
		var WS   = bg.WS;
		var IT   = bg.IT;
		var MASK = bg.MASK;
		var STAT = bg.STAT;
		var WP   = bg.WP;
		var PW   = bg.PW;
		var TEAM = bg.TEAM;
		var PERS = bg.PERS;
		var ET   = bg.ET;
		var EF   = bg.EF;
		var EV   = bg.EV;
		var ANIM = bg.ANIM;
		var MOD  = bg.MOD;

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
