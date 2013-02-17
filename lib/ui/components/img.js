define(function (require) {

var ko = require('knockout');

return function (UI) {

/**
 * Async image component
 *
 * Load default image into elements decorated with image handle attributes,
 * followed by the real image once it's done loading.
 */
var AsyncImage = function (element, initialValue) {
	var setImageData = function (data) {
		element.style.backgroundRepeat = 'none';
		element.style.backgroundSize = 'contain';
		element.style.backgroundImage = 'url(\'' + data + '\')';
	};

	if (!isNaN(initialValue)) {
		var img = UI.FindImageByHandle(initialValue);
		setImageData(img.data);
	} else {
		var defaultImage = UI.FindImageByHandle(0);
		setImageData(defaultImage.data);

		UI.RegisterImage(initialValue, function (hImage) {
			var img = UI.FindImageByHandle(hImage);
			setImageData(img.data);
		});
	}
};

ko.bindingHandlers.img = {
	update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);

		AsyncImage(element, valueUnwrapped);
	}
};

};

});