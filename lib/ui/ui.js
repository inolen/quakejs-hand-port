define('ui/ui',
['underscore', 'jquery', 'backbone', 'knockout', 'common/qshared', 'common/asset-cache', 'common/cvar'],
function (_, $, Backbone, ko, QS, AssetCache, Cvar) {
	function UserInterface(imp) {
		var SYS = imp.SYS;
		var CL  = imp.CL;

		var cssIncludes = [ '{{ include css/views.css }}' ];

		{{ include ui-defines.js }}
		{{ include ui-components.js }}
		{{ include ui-main.js }}
		{{ include ui-image.js }}
		{{ include ui-view.js }}

		{{ include views/ingame-menu.js }}
		{{ include views/hud-view.js }}
		{{ include views/loading-view.js }}
		{{ include views/main-menu.js }}
		{{ include views/message-menu.js }}
		{{ include views/scoreboard-view.js }}
		{{ include views/settings-menu.js }}

		return {
			Init:          Init,
			Shutdown:      Shutdown,
			GetView:       GetView,
			PeekMenu:      PeekMenu,
			PushMenu:      PushMenu,
			PopMenu:       PopMenu,
			PopAllMenus:   PopAllMenus,
			RenderView:    RenderView,
			Render:        Render,
			RegisterImage: RegisterImage,

			IngameMenuModel:     IngameMenuModel,
			HudViewModel:        HudViewModel,
			LoadingViewModel:    LoadingViewModel,
			// MainMenuModel:       MainMenuModel,
			MessageMenuModel:    MessageMenuModel,
			// ScoreboardViewModel: ScoreboardViewModel,
			// SettingsMenuModel:   SettingsMenuModel

		};
	}

	return UserInterface;
});