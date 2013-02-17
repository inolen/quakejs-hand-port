define(function (require) {

var ko = require('knockout');

return function (UI) {

function LoadingViewModel() {
	var self = this;

	self.visible = ko.observable(false);

	self.mapName = ko.observable('unknown');
	self.progress = ko.observable(0);
}

return LoadingViewModel;

};

});