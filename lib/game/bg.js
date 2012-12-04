/*global vec3: true, mat4: true */

define('game/bg',
['glmatrix', 'common/qmath', 'common/sh'],
function (glmatrix, QMath, sh) {
	// Use the following namespaces.
	var using = _.extend({},
		sh.constants,
		sh.enums
	);
	for (var key in using) {
		if (using.hasOwnProperty(key)) {
			eval('var ' + key + ' = using[key];');
		}
	}

	{{ include bg-defines.js }}
	{{ include bg-misc.js }}
	{{ include bg-pmove.js }}
	{{ include bg-itemdefs.js }}
	
	return {
		constants: {
			GIB_HEALTH:             GIB_HEALTH,
			ARMOR_PROTECTION:       ARMOR_PROTECTION,
			RANK_TIED_FLAG:         RANK_TIED_FLAG,
			DEFAULT_SHOTGUN_SPREAD: DEFAULT_SHOTGUN_SPREAD,
			DEFAULT_SHOTGUN_COUNT:  DEFAULT_SHOTGUN_COUNT,

			ANIM_TOGGLEBIT:         ANIM_TOGGLEBIT,

			EV_EVENT_BIT1:          EV_EVENT_BIT1,
			EV_EVENT_BIT2:          EV_EVENT_BIT2,
			EV_EVENT_BITS:          EV_EVENT_BITS,
			EVENT_VALID_MSEC:       EVENT_VALID_MSEC
		},

		enums: {
			PM:   PM,
			PMF:  PMF,
			GT:   GT,
			WS:   WS,
			IT:   IT,
			MASK: MASK,
			STAT: STAT,
			WP:   WP,
			PW:   PW,
			TEAM: TEAM,
			PERS: PERS,
			ET:   ET,
			EF:   EF,
			EV:   EV,
			ANIM: ANIM,
			MOD:  MOD,
		},

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
