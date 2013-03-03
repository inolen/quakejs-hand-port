define(function (require) {

var ko = require('knockout');

return function (UI) {

/**
 * Custom hasfocus supporting our internal focusing.
 */
ko.bindingHandlers.pretty = {
	init: function () {
		return { 'controlsDescendantBindings': true };
	},
	update: function (element, valueAccessor) {
		var value = ko.utils.unwrapObservable(valueAccessor()); // force boolean to compare with last value
		ko.utils.setHtml(element, UI.PrettyPrint(value));
	}
};

};

});