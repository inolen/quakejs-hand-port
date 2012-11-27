define('ui/ui',
['underscore', 'jquery', 'backbone', 'common/sh'],
function (_, $, Backbone, sh) {
	function UserInterface(imp) {
		var sys = imp.sys;
		var com = imp.com;
		var cl  = imp.cl;
		var snd = imp.snd;
		
		{{ include ui-defines.js }}
		{{ include ui-components.js }}
		{{ include ui-main.js }}
		{{ include ui-image.js }}
		{{ include ui-menu.js }}
		{{ include ui-view.js }}

		{{ include views/ConnectView.js }}
		{{ include views/HudView.js }}
		{{ include views/IngameMenu.js }}
		{{ include views/MainMenu.js }}
		{{ include views/MultiPlayerMenu.js }}
		{{ include views/ScoreboardView.js }}
		{{ include views/SettingsMenu.js }}
		{{ include views/SinglePlayerMenu.js }}

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