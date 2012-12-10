/*global mat4: true, vec3: true */

define('game/gm',
['underscore', 'glmatrix', 'common/qmath', 'common/sh', 'game/bg'],
function (_, glmatrix, QMath, sh, bg_mod) {
	function Game(imp) {
		var sys = imp.sys;
		var com = imp.com;
		var sv  = imp.sv;

		var bg  = bg_mod.CreateInstance(BGExports());

		var MAX_CLIENTS            = sh.MAX_CLIENTS;
		var MAX_GENTITIES          = sh.MAX_GENTITIES;
		var MAX_PERSISTANT         = sh.MAX_PERSISTANT;
		var MAX_POWERUPS           = sh.MAX_POWERUPS;
		var MAX_PS_EVENTS          = sh.MAX_PS_EVENTS;
		var ENTITYNUM_NONE         = sh.ENTITYNUM_NONE;
		var ENTITYNUM_WORLD        = sh.ENTITYNUM_WORLD;
		var ENTITYNUM_MAX_NORMAL   = sh.ENTITYNUM_MAX_NORMAL;
		var GIB_HEALTH             = bg.GIB_HEALTH;
		var ARMOR_PROTECTION       = bg.ARMOR_PROTECTION;
		var RANK_TIED_FLAG         = bg.RANK_TIED_FLAG;
		var DEFAULT_SHOTGUN_SPREAD = bg.DEFAULT_SHOTGUN_SPREAD;
		var DEFAULT_SHOTGUN_COUNT  = bg.DEFAULT_SHOTGUN_COUNT;
		var LIGHTNING_RANGE        = bg.LIGHTNING_RANGE;
		var ANIM_TOGGLEBIT         = bg.ANIM_TOGGLEBIT;
		var EV_EVENT_BIT1          = bg.EV_EVENT_BIT1;
		var EV_EVENT_BIT2          = bg.EV_EVENT_BIT2;
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

		{{ include gm-defines.js }}
		{{ include gm-main.js }}
		{{ include gm-active.js }}
		{{ include gm-client.js }}
		{{ include gm-clientcmds.js }}
		{{ include gm-combat.js }}
		{{ include gm-entities.js }}
		{{ include gm-items.js }}
		{{ include gm-misc.js }}
		{{ include gm-missile.js }}
		{{ include gm-mover.js }}
		{{ include gm-session.js }}
		{{ include gm-team.js }}
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
			ClientCommand:        ClientCommand,
			GetClientPlayerstate: GetClientPlayerstate
		};
	}

	return {
		CreateInstance: function (imp) {
			return new Game(imp);
		}
	};
});
