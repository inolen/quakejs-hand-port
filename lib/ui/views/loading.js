define(function (require) {

var ko = require('vendor/knockout');

function LoadingModel() {
	var self = this;

	self.mapname = ko.observable(null);
	self.address = ko.observable(null);
	self.progress = ko.observable(0);
}

return LoadingModel;

});