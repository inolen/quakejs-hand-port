/*global vec3: true, mat4: true */

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