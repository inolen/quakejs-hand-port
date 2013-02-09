var MainMenuModel = function () {
	var self = this;

	self.visible = ko.observable(false);
};

MainMenuModel.template = '{{ include ../templates/main-menu.tpl }}';