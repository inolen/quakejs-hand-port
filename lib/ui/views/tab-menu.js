function TabModel(title, model, template) {
	var self = this;

	self.title = title;
	self.id = ko.computed(function () {
		return self.title.toLowerCase().replace(/\s+/, '-');
	});
	self.model = model;
	self.template = template;
}

function TabMenuModel() {
	var self = this;

	self.visible = ko.observable(false);

	self.title = ko.observable('unknown');
	self.tabs = ko.observableArray([]);

	self.addTab = function (title, model, template) {
		self.tabs.push(new TabModel(title, model, template));
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

TabMenuModel.template = '{{ include ../templates/tab-menu.tpl }}';