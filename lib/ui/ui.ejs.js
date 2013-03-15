define(function (require) {
	var _                   = require('underscore');
	var ko                  = require('knockout');
	var QS                  = require('common/qshared');
	var AssetCache          = require('common/asset-cache');
	var Cvar                = require('common/cvar');
	var DOM                 = require('ui/dom');

	var KeyInput            = require('ui/controls/keyinput');
	var RadioInput          = require('ui/controls/radioinput');
	var RangeInput          = require('ui/controls/rangeinput');
	var Tab                 = require('ui/controls/tab');
	var TextInput           = require('ui/controls/textinput');

	var ConnectingTemplate  = require('text!ui/templates/connecting.tpl');
	var CurrentGameTemplate = require('text!ui/templates/currentgame.tpl');
	var DefaultTemplate     = require('text!ui/templates/default.tpl');
	var HudTemplate         = require('text!ui/templates/hud.tpl');
	var LoadingTemplate     = require('text!ui/templates/loading.tpl');
	var MessageTemplate     = require('text!ui/templates/message.tpl');
	var ScoreboardTemplate  = require('text!ui/templates/scoreboard.tpl');
	var SettingsTemplate    = require('text!ui/templates/settings.tpl');
	var TabTemplate         = require('text!ui/templates/tab.tpl');

	var ConnectingModel     = require('ui/views/connecting');
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