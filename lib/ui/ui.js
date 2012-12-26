define('ui/ui',
['underscore', 'jquery', 'backbone', 'common/sh'],
function (_, $, Backbone, sh) {
	function UserInterface(imp) {
		var sys = imp.sys;
		var com = imp.com;
		var cl  = imp.cl;
		var snd = imp.snd;

		var ERR = com.ERR;

		var viewsCss = '{{ include css/views.css }}';
		var normalizeCss = '{{ include css/normalize.css }}';

		{{ include ui-defines.js }}
		{{ include ui-components.js }}
		{{ include ui-main.js }}
		{{ include ui-image.js }}
		{{ include ui-menu.js }}
		{{ include ui-view.js }}

		{{ include views/HudView.js }}
		{{ include views/LoadingView.js }}
		{{ include views/MainMenu.js }}
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