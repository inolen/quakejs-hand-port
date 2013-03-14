define(function (require) {

var ko = require('knockout');

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
		// HACK - Since these menu models aren't initialized by
		// UI.CreateView the remove method is never assigned.
		// Perhaps this wouldn't be as ugly if remove was a more
		// formal member of say, a base ViewModel class.
		model.remove = function () {
			return self.remove();
		};

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

return TabModel;

});