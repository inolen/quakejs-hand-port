/*global vec3: true, mat4: true */

define('game/bg',
['glmatrix', 'common/sh', 'common/qmath'],
function (glmatrix, sh, qm) {
	{{ include ../common/sh-public.js }}

	{{ include bg-public.js }}
	{{ include bg-local.js }}
	{{ include bg-misc.js }}
	{{ include bg-pmove.js }}
	{{ include bg-itemdefs.js }}
	
	return {
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