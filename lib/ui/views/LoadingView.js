var LoadingViewTemplate = '{{ include ../templates/LoadingView.tpl }}';

function LoadingViewModel() {
	var self = this;

	self.visible = ko.observable(false);

	self.mapName = ko.observable('unknown');
	self.progress = ko.observable(0);

	self.open = function () {
		self.visible(true);
	};

	self.close = function () {
		self.visible(false);
	};
}