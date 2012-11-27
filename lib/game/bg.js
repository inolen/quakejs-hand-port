/*global vec3: true, mat4: true */

define('game/bg',
['glmatrix', 'common/sh', 'common/qmath'],
function (glmatrix, sh, QMath) {
	{{ include ../common/sh-public.js }}

	{{ include bg-defines.js }}
	{{ include bg-misc.js }}
	{{ include bg-pmove.js }}
	{{ include bg-itemdefs.js }}
	
	return {
		ARMOR_PROTECTION:       ARMOR_PROTECTION,
		DEFAULT_SHOTGUN_SPREAD: DEFAULT_SHOTGUN_SPREAD,
		DEFAULT_SHOTGUN_COUNT:  DEFAULT_SHOTGUN_COUNT,

		ANIM_TOGGLEBIT:         ANIM_TOGGLEBIT,

		EV_EVENT_BIT1:          EV_EVENT_BIT1,
		EV_EVENT_BIT2:          EV_EVENT_BIT2,
		EV_EVENT_BITS:          EV_EVENT_BITS,
		EVENT_VALID_MSEC:       EVENT_VALID_MSEC,

		PM:                     PM,
		PMF:                    PMF,
		WS:                     WS,
		IT:                     IT,
		MASK:                   MASK,
		STAT:                   STAT,
		WP:                     WP,
		PW:                     PW,
		TEAM:                   TEAM,
		PERS:                   PERS,
		ET:                     ET,
		EF:                     EF,
		EV:                     EV,
		ANIM:                   ANIM,
		MOD:                    MOD,

		PmoveInfo:                        PmoveInfo,
		Animation:                        Animation,

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