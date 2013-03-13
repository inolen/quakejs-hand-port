define(function (require) {
	var _               = require('underscore');
	var ko              = require('knockout');
	var QS              = require('common/qshared');
	var AssetCache      = require('common/asset-cache');
	var Cvar            = require('common/cvar');
	var DOM             = require('ui/dom');

	var KeyInput        = require('ui/controls/keyinput');
	var RadioInput      = require('ui/controls/radioinput');
	var RangeInput      = require('ui/controls/rangeinput');
	var Tab             = require('ui/controls/tab');
	var TextInput       = require('ui/controls/textinput');

	var css = [
		require('text!ui/css/normalize.css'),
		require('text!ui/css/views.css')
	];

	function UserInterface(imp) {
		var CurrentGameMenu = require('ui/views/currentgame')(GetPrivateExports());
		var DefaultMenu     = require('ui/views/default')(GetPrivateExports());
		var HudView         = require('ui/views/hud')(GetPrivateExports());
		var IngameMenu      = require('ui/views/ingame')(GetPrivateExports());
		var LoadingView     = require('ui/views/loading')(GetPrivateExports());
		var MessageMenu     = require('ui/views/message')(GetPrivateExports());
		var ScoreboardView  = require('ui/views/scoreboard')(GetPrivateExports());
		var SettingsMenu    = require('ui/views/settings')(GetPrivateExports());

		<% include ui-defines.js %>
		<% include ui-main.js %>
		<% include ui-bindings.js %>
		<% include ui-image.js %>
		<% include ui-view.js %>

		return GetPublicExports();
	}

	return UserInterface;
});