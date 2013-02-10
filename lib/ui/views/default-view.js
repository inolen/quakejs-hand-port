var DefaultViewModel = function () {
	this.visible = ko.observable(false);
};

DefaultViewModel.template = '{{ include ../templates/default-view.tpl }}';