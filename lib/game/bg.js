/*global vec3: true, mat4: true */

define('game/bg',
['glmatrix', 'common/qmath', 'common/qshared'],
function (glmatrix, QMath, QShared) {
	function BothGame(imp) {
		var com = imp.com;

		var ENTITYNUM_NONE      = QShared.ENTITYNUM_NONE;
		var ENTITYNUM_WORLD     = QShared.ENTITYNUM_WORLD;
		var MAX_POWERUPS        = QShared.MAX_POWERUPS;
		var MAX_PS_EVENTS       = QShared.MAX_PS_EVENTS;
		var PMOVEFRAMECOUNTBITS = QShared.PMOVEFRAMECOUNTBITS;

		var BUTTON              = QShared.BUTTON;
		var TR                  = QShared.TR;
		var SURF                = QShared.SURF;
		var CONTENTS            = QShared.CONTENTS;
		var ERR                 = com.ERR;

		{{ include bg-defines.js }}
		{{ include bg-main.js }}
		{{ include bg-misc.js }}
		{{ include bg-pmove.js }}
		{{ include bg-itemdefs.js }}

		return {
			// constants
			DEFAULT_GRAVITY:        DEFAULT_GRAVITY,
			GIB_HEALTH:             GIB_HEALTH,
			ARMOR_PROTECTION:       ARMOR_PROTECTION,
			RANK_TIED_FLAG:         RANK_TIED_FLAG,
			DEFAULT_SHOTGUN_SPREAD: DEFAULT_SHOTGUN_SPREAD,
			DEFAULT_SHOTGUN_COUNT:  DEFAULT_SHOTGUN_COUNT,
			LIGHTNING_RANGE:        LIGHTNING_RANGE,
			SCORE_NOT_PRESENT:      SCORE_NOT_PRESENT,
			DEFAULT_VIEWHEIGHT:     DEFAULT_VIEWHEIGHT,
			CROUCH_VIEWHEIGHT:      CROUCH_VIEWHEIGHT,

			CS_FLAGSTATUS:          CS_FLAGSTATUS,

			ANIM_TOGGLEBIT:         ANIM_TOGGLEBIT,

			EV_EVENT_BIT1:          EV_EVENT_BIT1,
			EV_EVENT_BIT2:          EV_EVENT_BIT2,
			EV_EVENT_BITS:          EV_EVENT_BITS,
			EVENT_VALID_MSEC:       EVENT_VALID_MSEC,

			// enums
			PM:           PM,
			PMF:          PMF,
			GT:           GT,
			WS:           WS,
			IT:           IT,
			MASK:         MASK,
			STAT:         STAT,
			WP:           WP,
			PW:           PW,
			TEAM:         TEAM,
			SPECTATOR:    SPECTATOR,
			PERS:         PERS,
			PLAYEREVENTS: PLAYEREVENTS,
			ET:           ET,
			EF:           EF,
			EV:           EV,
			GTS:          GTS,
			ANIM:         ANIM,
			MOD:          MOD,

			// types
			PmoveInfo:                        PmoveInfo,
			Animation:                        Animation,

			// funcs
			ItemList:                         itemList,
			Pmove:                            Pmove,
			UpdateViewAngles:                 UpdateViewAngles,
			AddPredictableEventToPlayerstate: AddPredictableEventToPlayerstate,
			PlayerStateToEntityState:         PlayerStateToEntityState,
			EvaluateTrajectory:               EvaluateTrajectory,
			EvaluateTrajectoryDelta:          EvaluateTrajectoryDelta,
			TouchJumpPad:                     TouchJumpPad,
			CanItemBeGrabbed:                 CanItemBeGrabbed,
			PlayerTouchesItem:                PlayerTouchesItem
		};
	}

	return {
		CreateInstance: function (imp) {
			return new BothGame(imp);
		}
	};
});
