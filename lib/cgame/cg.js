/*global mat4: true, vec3: true */

define('cgame/cg',
['underscore', 'glmatrix', 'common/qmath', 'common/sh', 'game/bg'],
function (_, glmatrix, QMath, sh, bg_mod) {
	function CGame(imp) {
		var sys = imp.sys;
		var com = imp.com;
		var cl  = imp.cl;
		var cm  = imp.cm;
		var re  = imp.re;
		var snd = imp.snd;
		var ui  = imp.ui;
		
		var bg  = bg_mod.CreateInstance(BGExports());

		var CMD_BACKUP             = sh.CMD_BACKUP;
		var SOLID_BMODEL           = sh.SOLID_BMODEL;
		var SNAPFLAG_NOT_ACTIVE    = sh.SNAPFLAG_NOT_ACTIVE;
		var SNAPFLAG_SERVERCOUNT   = sh.SNAPFLAG_SERVERCOUNT;
		var MAX_CLIENTS            = sh.MAX_CLIENTS;
		var MAX_GENTITIES          = sh.MAX_GENTITIES;
		var MAX_POWERUPS           = sh.MAX_POWERUPS;
		var MAX_WEAPONS            = sh.MAX_WEAPONS;
		var MAX_PS_EVENTS          = sh.MAX_PS_EVENTS;
		var ENTITYNUM_NONE         = sh.ENTITYNUM_NONE;
		var ENTITYNUM_WORLD        = sh.ENTITYNUM_WORLD;
		var RANK_TIED_FLAG         = bg.RANK_TIED_FLAG;
		var DEFAULT_SHOTGUN_SPREAD = bg.DEFAULT_SHOTGUN_SPREAD;
		var DEFAULT_SHOTGUN_COUNT  = bg.DEFAULT_SHOTGUN_COUNT;
		var LIGHTNING_RANGE        = bg.LIGHTNING_RANGE;
		var SCORE_NOT_PRESENT      = bg.SCORE_NOT_PRESENT;
		var DEFAULT_VIEWHEIGHT     = bg.DEFAULT_VIEWHEIGHT;
		var CROUCH_VIEWHEIGHT      = bg.CROUCH_VIEWHEIGHT;
		var ANIM_TOGGLEBIT         = bg.ANIM_TOGGLEBIT;
		var EV_EVENT_BITS          = bg.EV_EVENT_BITS;
		var EVENT_VALID_MSEC       = bg.EVENT_VALID_MSEC;

		var CVF                    = sh.CVF;
		var BUTTON                 = sh.BUTTON;
		var TR                     = sh.TR;
		var SURF                   = sh.SURF;
		var CONTENTS               = sh.CONTENTS;
		var ERR                    = com.ERR;
		var PM                     = bg.PM;
		var PMF                    = bg.PMF;
		var GT                     = bg.GT;
		var WS                     = bg.WS;
		var IT                     = bg.IT;
		var MASK                   = bg.MASK;
		var STAT                   = bg.STAT;
		var WP                     = bg.WP;
		var PW                     = bg.PW;
		var TEAM                   = bg.TEAM;
		var PERS                   = bg.PERS;
		var PLAYEREVENTS           = bg.PLAYEREVENTS;
		var ET                     = bg.ET;
		var EF                     = bg.EF;
		var EV                     = bg.EV;
		var ANIM                   = bg.ANIM;
		var MOD                    = bg.MOD;
		var RT                     = re.RT;
		var RF                     = re.RF;

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
