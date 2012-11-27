/*global vec3: true, mat4: true */

define('game/gm',
['underscore', 'glmatrix', 'common/qmath', 'common/sh', 'game/bg'],
function (_, glmatrix, QMath, sh, bg) {
	function Game(imp) {
		var sys = imp.sys;
		var com = imp.com;
		var sv  = imp.sv;
		
		var MAX_CLIENTS          = sh.MAX_CLIENTS;
		var MAX_GENTITIES        = sh.MAX_GENTITIES;
		var ENTITYNUM_NONE       = sh.ENTITYNUM_NONE;
		var ENTITYNUM_WORLD      = sh.ENTITYNUM_WORLD;
		var ENTITYNUM_MAX_NORMAL = sh.ENTITYNUM_MAX_NORMAL;
		var MAX_STATS            = sh.MAX_STATS;
		var MAX_PERSISTANT       = sh.MAX_PERSISTANT;
		var MAX_POWERUPS         = sh.MAX_POWERUPS;
		var MAX_WEAPONS          = sh.MAX_WEAPONS;
		var MAX_PS_EVENTS        = sh.MAX_PS_EVENTS;

		var CVF                  = sh.CVF;
		var BUTTON               = sh.BUTTON;
		var TR                   = sh.TR;
		var SURF                 = sh.SURF;
		var CONTENTS             = sh.CONTENTS;

		var ERR                  = com.ERR;

		var PM                   = bg.PM;
		var PMF                  = bg.PMF;
		var WS                   = bg.WS;
		var IT                   = bg.IT;
		var MASK                 = bg.MASK;
		var STAT                 = bg.STAT;
		var WP                   = bg.WP;
		var PW                   = bg.PW;
		var TEAM                 = bg.TEAM;
		var PERS                 = bg.PERS;
		var ET                   = bg.ET;
		var EF                   = bg.EF;
		var EV                   = bg.EV;
		var ANIM                 = bg.ANIM;
		var MOD                  = bg.MOD;

		{{ include gm-defines.js }}
		{{ include gm-main.js }}
		{{ include gm-active.js }}
		{{ include gm-client.js }}
		{{ include gm-combat.js }}
		{{ include gm-entities.js }}
		{{ include gm-items.js }}
		{{ include gm-misc.js }}
		{{ include gm-missile.js }}
		{{ include gm-trigger.js }}
		{{ include gm-weapons.js }}
		{{ include entities/gm-info_notnull.js }}
		{{ include entities/gm-info_player_deathmatch.js }}
		{{ include entities/gm-misc_teleporter_dest.js }}
		{{ include entities/gm-target_position.js }}
		{{ include entities/gm-target_push.js }}
		{{ include entities/gm-trigger_hurt.js }}
		{{ include entities/gm-trigger_push.js }}
		{{ include entities/gm-trigger_teleport.js }}

		return {
			SVF:                  SVF,
			
			Init:                 Init,
			Shutdown:             Shutdown,
			Frame:                Frame,
			ClientConnect:        ClientConnect,
			ClientBegin:          ClientBegin,
			ClientThink:          ClientThink,
			ClientDisconnect:     ClientDisconnect,
			GetClientPlayerstate: GetClientPlayerstate
		};
	}

	return {
		CreateInstance: function (imp) {
			return new Game(imp);
		}
	};
});