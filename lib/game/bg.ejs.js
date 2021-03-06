/*global vec3: true, mat4: true */

define(function (require) {
	var glmatrix = require('vendor/gl-matrix');
	var QMath    = require('common/qmath');
	var QS       = require('common/qshared');
	var SURF     = require('common/surfaceflags');

	function BothGame(imp) {
		var error = imp.error;

		<% include bg-defines.js %>
		<% include bg-misc.js %>
		<% include bg-pmove.js %>
		<% include bg-itemdefs.js %>

		return {
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

			PM:                     PM,
			PMF:                    PMF,
			GT:                     GT,
			GS:                     GS,
			WS:                     WS,
			IT:                     IT,
			MASK:                   MASK,
			STAT:                   STAT,
			WP:                     WP,
			PW:                     PW,
			TEAM:                   TEAM,
			SPECTATOR:              SPECTATOR,
			PERS:                   PERS,
			PLAYEREVENTS:           PLAYEREVENTS,
			ET:                     ET,
			EF:                     EF,
			EV:                     EV,
			GTS:                    GTS,
			ANIM:                   ANIM,
			MOD:                    MOD,

			// types
			GametypeNames:                    GametypeNames,
			TeamNames:                        TeamNames,
			PmoveInfo:                        PmoveInfo,
			Animation:                        Animation,

			// funcs
			ItemList:                         itemList,
			FindItem:                         FindItem,
			FindItemForWeapon:                FindItemForWeapon,
			FindItemForPowerup:               FindItemForPowerup,
			FindItemForHoldable:              FindItemForHoldable,
			Pmove:                            Pmove,
			UpdateViewAngles:                 UpdateViewAngles,
			AddPredictableEventToPlayerstate: AddPredictableEventToPlayerstate,
			PlayerStateToEntityState:         PlayerStateToEntityState,
			EvaluateTrajectory:               EvaluateTrajectory,
			EvaluateTrajectoryDelta:          EvaluateTrajectoryDelta,
			TouchJumpPad:                     TouchJumpPad,
			CanItemBeGrabbed:                 CanItemBeGrabbed,
			PlayerTouchesItem:                PlayerTouchesItem,
			GetWaterLevel:                    GetWaterLevel
		};
	}

	return BothGame;
});
