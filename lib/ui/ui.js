define(function (require) {
	var _          = require('underscore');
	var ko         = require('knockout');
	var AssetCache = require('common/asset-cache');
	var QS         = require('common/qshared');
	var Cvar       = require('common/cvar');

	function UserInterface(imp) {
		var SYS = imp.SYS;
		var CL  = imp.CL;

		var cssIncludes = [require('text!ui/css/views.css')];

		include('ui/ui-defines');
		include('ui/ui-components');
		include('ui/ui-main');
		include('ui/ui-image');
		include('ui/ui-view');

		include('ui/views/currentgame-menu');
		include('ui/views/default-view');
		include('ui/views/hud-view');
		include('ui/views/loading-view');
		include('ui/views/message-menu');
		include('ui/views/scoreboard-view');
		include('ui/views/settings-menu');
		include('ui/views/tab-menu');

		return {
			Init:                 Init,
			Shutdown:             Shutdown,
			Render:               Render,
			CreateView:           CreateView,
			RenderView:           RenderView,
			PeekMenu:             PeekMenu,
			PushMenu:             PushMenu,
			PopMenu:              PopMenu,
			PopAllMenus:          PopAllMenus,
			RegisterImage:        RegisterImage,

			CurrentGameMenuModel: CurrentGameMenuModel,
			DefaultViewModel:     DefaultViewModel,
			HudViewModel:         HudViewModel,
			LoadingViewModel:     LoadingViewModel,
			MessageMenuModel:     MessageMenuModel,
			ScoreboardViewModel:  ScoreboardViewModel,
			SettingsMenuModel:    SettingsMenuModel,
			TabMenuModel:         TabMenuModel
		};
	}

	return UserInterface;
});