/*global mat4: true, vec3: true */

define('game/gm',
['underscore', 'glmatrix', 'common/qmath', 'common/qshared', 'common/cvar', 'game/bg'],
function (_, glmatrix, QMath, QS, Cvar, BothGame) {
	function Game(imp) {
		var SYS = imp.sys;
		var COM = imp.com;
		var SV  = imp.sv;

		var BG  = BothGame.CreateInstance(BGExports());

		var MAX_CLIENTS            = QS.MAX_CLIENTS;
		var MAX_GENTITIES          = QS.MAX_GENTITIES;
		var MAX_PERSISTANT         = QS.MAX_PERSISTANT;
		var MAX_POWERUPS           = QS.MAX_POWERUPS;
		var MAX_PS_EVENTS          = QS.MAX_PS_EVENTS;
		var ARENANUM_NONE          = QS.ARENANUM_NONE;
		var ENTITYNUM_NONE         = QS.ENTITYNUM_NONE;
		var ENTITYNUM_WORLD        = QS.ENTITYNUM_WORLD;
		var ENTITYNUM_MAX_NORMAL   = QS.ENTITYNUM_MAX_NORMAL;
		var GIB_HEALTH             = BG.GIB_HEALTH;
		var ARMOR_PROTECTION       = BG.ARMOR_PROTECTION;
		var RANK_TIED_FLAG         = BG.RANK_TIED_FLAG;
		var DEFAULT_SHOTGUN_SPREAD = BG.DEFAULT_SHOTGUN_SPREAD;
		var DEFAULT_SHOTGUN_COUNT  = BG.DEFAULT_SHOTGUN_COUNT;
		var LIGHTNING_RANGE        = BG.LIGHTNING_RANGE;
		var SCORE_NOT_PRESENT      = BG.SCORE_NOT_PRESENT;
		var ANIM_TOGGLEBIT         = BG.ANIM_TOGGLEBIT;
		var EV_EVENT_BIT1          = BG.EV_EVENT_BIT1;
		var EV_EVENT_BIT2          = BG.EV_EVENT_BIT2;
		var EV_EVENT_BITS          = BG.EV_EVENT_BITS;
		var EVENT_VALID_MSEC       = BG.EVENT_VALID_MSEC;

		var CVAR                   = QS.CVAR;
		var BUTTON                 = QS.BUTTON;
		var TR                     = QS.TR;
		var SURF                   = QS.SURF;
		var CONTENTS               = QS.CONTENTS;
		var FLAG                   = QS.FLAG;
		var PM                     = BG.PM;
		var PMF                    = BG.PMF;
		var GT                     = BG.GT;
		var WS                     = BG.WS;
		var IT                     = BG.IT;
		var MASK                   = BG.MASK;
		var STAT                   = BG.STAT;
		var WP                     = BG.WP;
		var PW                     = BG.PW;
		var TEAM                   = BG.TEAM;
		var SPECTATOR              = BG.SPECTATOR;
		var PERS                   = BG.PERS;
		var PLAYEREVENTS           = BG.PLAYEREVENTS;
		var ET                     = BG.ET;
		var EF                     = BG.EF;
		var EV                     = BG.EV;
		var GTS                    = BG.GTS;
		var ANIM                   = BG.ANIM;
		var MOD                    = BG.MOD;

		var GametypeNames          = BG.GametypeNames;

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
