define(function (require) {

var ko = require('knockout');

return function (UI) {

/**
 * Async image component
 *
 * Load default image into elements decorated with image handle attributes,
 * followed by the real image once it's done loading.
 */
var AsyncImage = function (element, opts) {
	opts.size = opts.size || 'contain';

	var setImageData = function (data) {
		element.style.backgroundRepeat = 'none';
		element.style.backgroundSize = opts.size;
		element.style.backgroundImage = 'url(\'' + data + '\')';
	};

	if (opts.handle) {
		var img = UI.FindImageByHandle(opts.handle);
		setImageData(img.data);
	} else {
		var defaultImage = UI.FindImageByHandle(0);
		setImageData(defaultImage.data);

		UI.RegisterImage(opts.path, function (hImage) {
			var img = UI.FindImageByHandle(hImage);
			setImageData(img.data);
		});
	}
};

ko.bindingHandlers.img = {
	update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);

		// Convert string values into default options.
		if (typeof(valueUnwrapped) === 'string') {
			valueUnwrapped = {
				path: valueUnwrapped
			};
		} else if (!isNaN(valueUnwrapped)) {
			valueUnwrapped = {
				handle: valueUnwrapped
			};
		}

		AsyncImage(element, valueUnwrapped);
	}
};

};

});