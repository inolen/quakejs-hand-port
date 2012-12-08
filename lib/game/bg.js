/*global vec3: true, mat4: true */

define('game/bg',
['glmatrix', 'common/qmath', 'common/sh'],
function (glmatrix, QMath, sh) {
	var ENTITYNUM_NONE      = sh.ENTITYNUM_NONE;
	var MAX_POWERUPS        = sh.MAX_POWERUPS;
	var MAX_PS_EVENTS       = sh.MAX_PS_EVENTS;
	var PMOVEFRAMECOUNTBITS = sh.PMOVEFRAMECOUNTBITS;

	var BUTTON              = sh.BUTTON;
	var TR                  = sh.TR;
	var SURF                = sh.SURF;
	var CONTENTS            = sh.CONTENTS;

	{{ include bg-defines.js }}
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
		DEFAULT_VIEWHEIGHT:     DEFAULT_VIEWHEIGHT,
		CROUCH_VIEWHEIGHT:      CROUCH_VIEWHEIGHT,

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
		PERS:         PERS,
		PLAYEREVENTS: PLAYEREVENTS,
		ET:           ET,
		EF:           EF,
		EV:           EV,
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
});
