define(function (require) {
	var _                   = require('vendor/underscore');
	var ko                  = require('vendor/knockout');
	var QS                  = require('common/qshared');
	var AssetCache          = require('common/asset-cache');
	var Cvar                = require('common/cvar');
	var DOM                 = require('ui/dom');

	var KeyInput            = require('ui/components/keyinput');
	var RadioInput          = require('ui/components/radioinput');
	var RangeInput          = require('ui/components/rangeinput');
	var Tab                 = require('ui/components/tab');
	var Scrollable          = require('ui/components/scrollable');
	var TextInput           = require('ui/components/textinput');

	var ConnectingTemplate  = require('text!ui/templates/connecting.tpl');
	var ConsoleTemplate     = require('text!ui/templates/console.tpl');
	var CurrentGameTemplate = require('text!ui/templates/currentgame.tpl');
	var DefaultTemplate     = require('text!ui/templates/default.tpl');
	var HudTemplate         = require('text!ui/templates/hud.tpl');
	var LoadingTemplate     = require('text!ui/templates/loading.tpl');
	var MessageTemplate     = require('text!ui/templates/message.tpl');
	var ScoreboardTemplate  = require('text!ui/templates/scoreboard.tpl');
	var SettingsTemplate    = require('text!ui/templates/settings.tpl');
	var TabTemplate         = require('text!ui/templates/tab.tpl');

	var ConnectingModel     = require('ui/views/connecting');
	var ConsoleModel        = require('ui/views/console');
	var CurrentGameModel    = require('ui/views/currentgame');
	var DefaultModel        = require('ui/views/default');
	var HudModel            = require('ui/views/hud');
	var LoadingModel        = require('ui/views/loading');
	var MessageModel        = require('ui/views/message');
	var ScoreboardModel     = require('ui/views/scoreboard');
	var SettingsModel       = require('ui/views/settings');
	var TabModel            = require('ui/views/tab');

	var css = [
		require('text!ui/css/normalize.css'),
		require('text!ui/css/fonts.css'),
		require('text!ui/css/views.css'),
	];

	function UserInterface(imp) {
		<% include ui-defines.js %>
		<% include ui-main.js %>
		<% include ui-bindings.js %>
		<% include ui-image.js %>
		<% include ui-view.js %>

		return GetPublicExports();
	}

	return UserInterface;
});