/*global vec3: true, mat4: true */

define('game/bg',
['glmatrix', 'common/qmath', 'common/sh'],
function (glmatrix, QMath, sh) {
	var ENTITYNUM_NONE       = sh.ENTITYNUM_NONE;
	var ENTITYNUM_WORLD      = sh.ENTITYNUM_WORLD;
	var ENTITYNUM_MAX_NORMAL = sh.ENTITYNUM_MAX_NORMAL;
	var MAX_STATS            = sh.MAX_STATS;
	var MAX_PERSISTANT       = sh.MAX_PERSISTANT;
	var MAX_POWERUPS         = sh.MAX_POWERUPS;
	var MAX_WEAPONS          = sh.MAX_WEAPONS;
	var MAX_PS_EVENTS        = sh.MAX_PS_EVENTS;

	var CVF      = sh.CVF;
	var BUTTON   = sh.BUTTON;
	var TR       = sh.TR;
	var SURF     = sh.SURF;
	var CONTENTS = sh.CONTENTS;

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