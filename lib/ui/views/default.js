define(function (require) {

var ko = require('knockout');

return function (UI) {

var DefaultMenu = function () {
	this.template = require('text!ui/templates/default.tpl');
};

return DefaultMenu;

};

});