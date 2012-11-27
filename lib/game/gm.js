/*global vec3: true, mat4: true */

define('game/gm',
['underscore', 'glmatrix', 'common/sh', 'common/qmath', 'game/bg'],
function (_, glmatrix, sh, QMath, bg) {
	function Game(imp) {
		{{ include ../common/sh-public.js }}

		var sys = imp.sys;
		var com = imp.com;
		var sv  = imp.sv;

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
		var MOD   = bg.MOD;

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