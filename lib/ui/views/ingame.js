define(function (require) {

var ko = require('knockout');

return function (UI) {

var CurrentGameView = require('ui/views/currentgame')(UI);
var SettingsView = require('ui/views/settings')(UI);

var currentGameTemplate = require('text!ui/templates/currentgame.tpl');
var settingsTemplate = require('text!ui/templates/settings.tpl');

function TabModel(title, model, template) {
	var self = this;

	self.title = title;
	self.id = ko.computed(function () {
		return self.title.toLowerCase().replace(/\s+/, '-');
	});
	self.model = model;
	self.template = template;
}

function IngameMenu() {
	var self = this;

	self.title = ko.observable('unknown');
	self.template = require('text!ui/templates/ingame.tpl');

	self.currentgame = new CurrentGameView();
	self.settings = new SettingsView();

	self.tabs = [
		new TabModel('Current Game', self.currentgame, currentGameTemplate),
		new TabModel('Settings', self.settings, settingsTemplate)
	];

	self.bindTab = function (elements, tabModel) {
		var pane;

		for (var i = 0; i < elements.length; i++) {
			if (elements[i] instanceof HTMLElement) {
				pane = elements[i];
				break;
			}
		}

		if (!pane) {
			return;
		}

		pane.innerHTML = '<div>' + tabModel.template + '</div>';
		ko.applyBindings(tabModel.model, pane.firstChild);
	};
}

return IngameMenu;

};

});