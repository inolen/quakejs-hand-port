define(function (require) {

var ko = require('knockout');

return function (UI) {

var DefaultViewModel = function () {
	this.visible = ko.observable(false);
};

return DefaultViewModel;

};

});