define(function (require) {

var ko = require('knockout');

return function (UI) {

function LoadingView() {
	var self = this;

	self.template = require('text!ui/templates/loading.tpl');

	self.visible = ko.observable(false);
	self.mapname = ko.observable(null);
	self.address = ko.observable(null);
	self.progress = ko.observable(0);
}

return LoadingView;

};

});