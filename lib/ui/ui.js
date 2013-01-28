define('ui/ui',
['underscore', 'jquery', 'backbone', 'common/qshared', 'common/asset-cache', 'common/cvar'],
function (_, $, Backbone, QS, AssetCache, Cvar) {
	function UserInterface(imp) {
		var SYS = imp.SYS;
		var COM = imp.COM;
		var CL  = imp.CL;

		var cssIncludes = [ '{{ include css/views.css }}' ];

		{{ include ui-defines.js }}
		{{ include ui-components.js }}
		{{ include ui-main.js }}
		{{ include ui-image.js }}
		{{ include ui-menu.js }}
		{{ include ui-view.js }}

		{{ include views/CurrentGamePartial.js }}
		{{ include views/HudView.js }}
		{{ include views/LoadingView.js }}
		{{ include views/MainMenu.js }}
		{{ include views/MessageMenu.js }}
		{{ include views/MultiPlayerPartial.js }}
		{{ include views/ScoreboardView.js }}
		{{ include views/SettingsPartial.js }}
		{{ include views/SinglePlayerPartial.js }}

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
			RegisterImage: RegisterImage
		};
	}

	return {
		CreateInstance: function (imp) {
			return new UserInterface(imp);
		}
	};
});