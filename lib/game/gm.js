/*global MAX_CLIENTS: true, MAX_GENTITIES: true, MAX_PERSISTANT: true, MAX_POWERUPS: true, MAX_PS_EVENTS: true,
         ENTITYNUM_MAX_NORMAL: true, ENTITYNUM_NONE: true, ENTITYNUM_WORLD: true, LIGHTNING_RANGE: true,
         DEFAULT_SHOTGUN_COUNT: true, DEFAULT_SHOTGUN_SPREAD: true,
         EV_EVENT_BITS: true, EV_EVENT_BIT1: true, EV_EVENT_BIT2: true, EVENT_VALID_MSEC: true,
         CONTENTS: true, CVF: true, ERR: true, SURF: true, TR: true,
         PM: true, PMF: true, GT: true, WS: true, IT: true, MASK: true, STAT: true, WP: true, PW: true,
         TEAM: true, PERS: true, PLAYEREVENTS: true, ET: true, EF: true, EV: true, ANIM: true, MOD: true,
         mat4: true, vec3: true */

define('game/gm',
['underscore', 'glmatrix', 'common/qmath', 'common/sh', 'game/bg'],
function (_, glmatrix, QMath, sh, bg) {
	function Game(imp) {
		var sys = imp.sys;
		var com = imp.com;
		var sv  = imp.sv;

		// Use the following namespaces.
		var using = _.extend({},
			sh.constants,
			sh.enums,
			com.enums,
			bg.constants,
			bg.enums
		);
		for (var key in using) {
			if (using.hasOwnProperty(key)) {
				eval('var ' + key + ' = using[key];');
			}
		}

		{{ include gm-defines.js }}
		{{ include gm-main.js }}
		{{ include gm-active.js }}
		{{ include gm-client.js }}
		{{ include gm-combat.js }}
		{{ include gm-entities.js }}
		{{ include gm-items.js }}
		{{ include gm-misc.js }}
		{{ include gm-missile.js }}
		{{ include gm-mover.js }}
		{{ include gm-session.js }}
		{{ include gm-trigger.js }}
		{{ include gm-weapons.js }}
		{{ include entities/gm-func_door.js }}
		{{ include entities/gm-func_static.js }}
		{{ include entities/gm-func_train.js }}
		{{ include entities/gm-info_notnull.js }}
		{{ include entities/gm-info_player_deathmatch.js }}
		{{ include entities/gm-info_player_intermission.js }}
		{{ include entities/gm-misc_teleporter_dest.js }}
		{{ include entities/gm-path_corner.js }}
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
