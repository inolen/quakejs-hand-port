define(function (require) {

var ko = require('vendor/knockout');
var EventEmitter = require('vendor/EventEmitter');

function Tab(title, model, template) {
	var self = this;

	self.title = title;
	self.id = ko.computed(function () {
		return self.title.toLowerCase().replace(/\s+/, '-');
	});
	self.model = model;
	self.template = template;
}

function TabModel() {
	var self = this;

	self.title = ko.observable('unknown');
	self.tabs = ko.observableArray([]);

	self.addTab = function (title, model, template) {
		// Persist the close event from sub-viewmodels.
		if (model.on) {
			model.on('close', function () {
				self.trigger('close');
			});
		}

		self.tabs.push(new Tab(title, model, template));
	};

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

TabModel.prototype = new EventEmitter();
TabModel.prototype.constructor = TabModel;

return TabModel;

});