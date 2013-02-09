var LoadingViewTemplate = '{{ include ../templates/loading-view.tpl }}';

function LoadingViewModel() {
	var self = this;

	self.visible = ko.observable(false);

	self.mapName = ko.observable('unknown');
	self.progress = ko.observable(0);
}