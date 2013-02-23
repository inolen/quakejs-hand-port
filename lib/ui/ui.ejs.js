define(function (require) {
	var _                       = require('underscore');
	var ko                      = require('knockout');
	var QS                      = require('common/qshared');
	var AssetCache              = require('common/asset-cache');
	var Cvar                    = require('common/cvar');
	var DOM                     = require('ui/dom');
	var css                     = require('text!ui/css/views.css');
	var CurrentGameMenuTemplate = require('text!ui/templates/currentgame.tpl');
	var DefaultViewTemplate     = require('text!ui/templates/default.tpl');
	var HudViewTemplate         = require('text!ui/templates/hud.tpl');
	var LoadingViewTemplate     = require('text!ui/templates/loading.tpl');
	var MessageMenuTemplate     = require('text!ui/templates/message.tpl');
	var ScoreboardViewTemplate  = require('text!ui/templates/scoreboard.tpl');
	var SettingsMenuTemplate    = require('text!ui/templates/settings.tpl');
	var TabMenuTemplate         = require('text!ui/templates/tab.tpl');

	function UserInterface(imp) {
		var CurrentGameMenuModel = require('ui/views/currentgame')(GetPrivateExports());
		var DefaultViewModel     = require('ui/views/default')(GetPrivateExports());
		var HudViewModel         = require('ui/views/hud')(GetPrivateExports());
		var LoadingViewModel     = require('ui/views/loading')(GetPrivateExports());
		var MessageMenuModel     = require('ui/views/message')(GetPrivateExports());
		var ScoreboardViewModel  = require('ui/views/scoreboard')(GetPrivateExports());
		var SettingsMenuModel    = require('ui/views/settings')(GetPrivateExports());
		var TabMenuModel         = require('ui/views/tab')(GetPrivateExports());

		var hasfocus             = require('ui/components/hasfocus')(GetPrivateExports());
		var img                  = require('ui/components/img')(GetPrivateExports());
		var keyinput             = require('ui/components/keyinput')(GetPrivateExports());
		var radioinput           = require('ui/components/radioinput')(GetPrivateExports());
		var rangeinput           = require('ui/components/rangeinput')(GetPrivateExports());
		var tab                  = require('ui/components/tab')(GetPrivateExports());
		var textinput            = require('ui/components/textinput')(GetPrivateExports());

		<% include ui-defines.js %>
		<% include ui-main.js %>
		<% include ui-image.js %>
		<% include ui-view.js %>

		return GetPublicExports();
	}

	return UserInterface;
});