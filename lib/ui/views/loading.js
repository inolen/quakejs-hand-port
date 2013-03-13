define(function (require) {

var ko = require('knockout');

return function (UI) {

function LoadingViewModel() {
	var self = this;

	self.visible = ko.observable(false);

	self.mapname = ko.observable(null);
	self.address = ko.observable(null);
	self.progress = ko.observable(0);
}

return LoadingViewModel;

};

});