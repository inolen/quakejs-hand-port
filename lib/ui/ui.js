define('ui/ui',
['underscore', 'knockout', 'common/qshared', 'common/asset-cache', 'common/cvar'],
function (_, ko, QS, AssetCache, Cvar) {
	function UserInterface(imp) {
		var SYS = imp.SYS;
		var CL  = imp.CL;

		var cssIncludes = [ '{{ include css/views.css }}' ];

		{{ include ui-defines.js }}
		{{ include ui-components.js }}
		{{ include ui-main.js }}
		{{ include ui-image.js }}
		{{ include ui-view.js }}

		{{ include views/currentgame-menu.js }}
		{{ include views/default-view.js }}
		{{ include views/hud-view.js }}
		{{ include views/loading-view.js }}
		{{ include views/message-menu.js }}
		{{ include views/scoreboard-view.js }}
		{{ include views/settings-menu.js }}
		{{ include views/tab-menu.js }}

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
			TabMenuModel:         TabMenuModel,
		};
	}

	return UserInterface;
});