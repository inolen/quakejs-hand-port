define(function (require) {

var ko = require('vendor/knockout');

function LoadingModel() {
	var self = this;

	self.address = ko.observable(null);
	self.message = ko.observable(null);
}

return LoadingModel;

});