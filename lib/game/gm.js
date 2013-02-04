/*global mat4: true, vec3: true */

define('game/gm',
['underscore', 'glmatrix', 'common/qmath', 'common/qshared', 'common/cvar', 'game/bg'],
function (_, glmatrix, QMath, QShared, Cvar, BG) {
	function Game(imp) {
		var sys = imp.sys;
		var com = imp.com;
		var sv  = imp.sv;

		var bg  = BG.CreateInstance(BGExports());

		var MAX_CLIENTS            = QShared.MAX_CLIENTS;
		var MAX_GENTITIES          = QShared.MAX_GENTITIES;
		var MAX_PERSISTANT         = QShared.MAX_PERSISTANT;
		var MAX_POWERUPS           = QShared.MAX_POWERUPS;
		var MAX_PS_EVENTS          = QShared.MAX_PS_EVENTS;
		var ARENANUM_NONE          = QShared.ARENANUM_NONE;
		var ENTITYNUM_NONE         = QShared.ENTITYNUM_NONE;
		var ENTITYNUM_WORLD        = QShared.ENTITYNUM_WORLD;
		var ENTITYNUM_MAX_NORMAL   = QShared.ENTITYNUM_MAX_NORMAL;
		var GIB_HEALTH             = bg.GIB_HEALTH;
		var ARMOR_PROTECTION       = bg.ARMOR_PROTECTION;
		var RANK_TIED_FLAG         = bg.RANK_TIED_FLAG;
		var DEFAULT_SHOTGUN_SPREAD = bg.DEFAULT_SHOTGUN_SPREAD;
		var DEFAULT_SHOTGUN_COUNT  = bg.DEFAULT_SHOTGUN_COUNT;
		var LIGHTNING_RANGE        = bg.LIGHTNING_RANGE;
		var SCORE_NOT_PRESENT      = bg.SCORE_NOT_PRESENT;
		var ANIM_TOGGLEBIT         = bg.ANIM_TOGGLEBIT;
		var EV_EVENT_BIT1          = bg.EV_EVENT_BIT1;
		var EV_EVENT_BIT2          = bg.EV_EVENT_BIT2;
		var EV_EVENT_BITS          = bg.EV_EVENT_BITS;
		var EVENT_VALID_MSEC       = bg.EVENT_VALID_MSEC;

		var CVAR                   = QShared.CVAR;
		var BUTTON                 = QShared.BUTTON;
		var TR                     = QShared.TR;
		var SURF                   = QShared.SURF;
		var CONTENTS               = QShared.CONTENTS;
		var FLAG                   = QShared.FLAG;
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
		var SPECTATOR              = bg.SPECTATOR;
		var PERS                   = bg.PERS;
		var PLAYEREVENTS           = bg.PLAYEREVENTS;
		var ET                     = bg.ET;
		var EF                     = bg.EF;
		var EV                     = bg.EV;
		var GTS                    = bg.GTS;
		var ANIM                   = bg.ANIM;
		var MOD                    = bg.MOD;

		var GametypeNames          = bg.GametypeNames;

		{{ include gm-defines.js }}
		{{ include gm-main.js }}
		{{ include gm-arena.js }}
		{{ include gm-client.js }}
		{{ include gm-clientcmds.js }}
		{{ include gm-combat.js }}
		{{ include gm-cvar.js }}
		{{ include gm-entities.js }}
		{{ include gm-items.js }}
		{{ include gm-missile.js }}
		{{ include gm-mover.js }}
		{{ include gm-session.js }}
		{{ include gm-team.js }}
		{{ include gm-trigger.js }}
		{{ include gm-weapons.js }}
		{{ include entities/gm-func_bobbing.js }}
		{{ include entities/gm-func_button.js }}
		{{ include entities/gm-func_door.js }}
		{{ include entities/gm-func_static.js }}
		{{ include entities/gm-func_train.js }}
		{{ include entities/gm-info_notnull.js }}
		{{ include entities/gm-info_player_deathmatch.js }}
		{{ include entities/gm-info_player_intermission.js }}
		{{ include entities/gm-misc_portal_camera.js }}
		{{ include entities/gm-misc_portal_surface.js }}
		{{ include entities/gm-misc_teleporter_dest.js }}
		{{ include entities/gm-path_corner.js }}
		{{ include entities/gm-target_position.js }}
		{{ include entities/gm-target_push.js }}
		{{ include entities/gm-target_teleporter.js }}
		{{ include entities/gm-team_ctf_blueplayer.js }}
		{{ include entities/gm-team_ctf_bluespawn.js }}
		{{ include entities/gm-team_ctf_redplayer.js }}
		{{ include entities/gm-team_ctf_redspawn.js }}
		{{ include entities/gm-trigger_hurt.js }}
		{{ include entities/gm-trigger_multiple.js }}
		{{ include entities/gm-trigger_push.js }}
		{{ include entities/gm-trigger_teleport.js }}
		{{ include entities/gm-worldspawn.js }}

		return {
			SVF:                  SVF,

			Init:                  Init,
			Shutdown:              Shutdown,
			Frame:                 Frame,
			ClientConnect:         ClientConnect,
			ClientUserinfoChanged: ClientUserinfoChanged,
			ClientBegin:           ClientBegin,
			ClientThink:           ClientThink,
			ClientDisconnect:      ClientDisconnect,
			ClientCommand:         ClientCommand,
			GetClientPlayerstate:  GetClientPlayerstate
		};
	}

	return {
		CreateInstance: function (imp) {
			return new Game(imp);
		}
	};
});
