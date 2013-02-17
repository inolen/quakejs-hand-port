define(function (require) {

var ko = require('knockout');

return function (UI) {

/**
 * Custom hasfocus supporting our internal focusing.
 */
ko.bindingHandlers['hasfocus'] = {
	init: function(element, valueAccessor, allBindingsAccessor) {
		var handleElementFocusChange = function () {
			var modelValue = valueAccessor();
			var isFocused = (UI.FocusElement() === element);
			ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'hasfocus', isFocused, true);
		};

		ko.utils.registerEventHandler(element, 'focus', handleElementFocusChange);
		ko.utils.registerEventHandler(element, 'blur',  handleElementFocusChange);
	},
	update: function(element, valueAccessor) {
		var value = !!ko.utils.unwrapObservable(valueAccessor()); // force boolean to compare with last value
		if (value) {
			element.focus();
		} else {
			element.blur();
		}
	}
};

};

});