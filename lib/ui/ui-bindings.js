/**
 * Custom hasfocus supporting our internal focusing.
 */
ko.bindingHandlers.hasfocus = {
	init: function(element, valueAccessor, allBindingsAccessor) {
		var handleElementFocusChange = function () {
			var modelValue = valueAccessor();
			var isFocused = (FocusElement() === element);
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

/**
 * Async image binding.
 *
 * Load default image into elements decorated with image handle attributes,
 * followed by the real image once it's done loading.
 */
ko.bindingHandlers.img = {
	update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);

		var setImageData = function (data) {
			element.style.backgroundRepeat = 'none';
			element.style.backgroundSize = 'contain';
			element.style.backgroundImage = 'url(\'' + data + '\')';
		};

		// Convert string values into default options.
		var path, handle;

		if (typeof(valueUnwrapped) === 'string') {
			path = valueUnwrapped;
		} else if (!isNaN(valueUnwrapped)) {
			handle = valueUnwrapped;
		}

		if (handle !== undefined) {
			var img = FindImageByHandle(handle);
			setImageData(img.data);
		} else {
			var defaultImage = FindImageByHandle(0);
			setImageData(defaultImage.data);

			RegisterImage(path, function (hImage) {
				var img = FindImageByHandle(hImage);
				setImageData(img.data);
			});
		}
	}
};

/**
 * Provide a prettyprint formatter.
 */
ko.bindingHandlers.pretty = {
	init: function () {
		return { 'controlsDescendantBindings': true };
	},
	update: function (element, valueAccessor) {
		var value = ko.utils.unwrapObservable(valueAccessor()); // force boolean to compare with last value
		ko.utils.setHtml(element, PrettyPrint(value));
	}
};

/**********************************************************
 *
 * Control wrappers
 *
 **********************************************************/
ko.bindingHandlers.keyinput = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var input = new KeyInput(element, valueUnwrapped);
	}
};

ko.bindingHandlers.radioinput = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var input = new RadioInput(element, valueUnwrapped);
	}
};

ko.bindingHandlers.rangeinput = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var input = new RangeInput(element, valueUnwrapped);
	}
};

ko.bindingHandlers.tab = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var input = new Tab(element, valueUnwrapped);
	}
};

ko.bindingHandlers.textinput = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var input = new TextInput(element, valueUnwrapped);
	}
};