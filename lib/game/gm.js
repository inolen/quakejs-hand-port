/*global vec3: true, mat4: true */

define('game/gm',
['underscore', 'glmatrix', 'common/sh', 'common/qmath', 'game/bg'],
function (_, glmatrix, sh, qm, bg) {
	function Game(com, sv) {
		{{ include ../common/sh-public.js }}
		{{ include ../game/bg-public.js }}

		{{ include gm-public.js }}
		{{ include gm-local.js }}
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
		CreateInstance: function (com, sv) {
			return new Game(com, sv);
		}
	};
});