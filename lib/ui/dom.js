define(function (require) {

var exports = {};

// Maintain references to bound event listeners.
var allListeners = {};

exports.hasClass = function (el, className) {
	var classNames = el.getAttribute('class');
	return classNames && classNames.indexOf(className) !== -1;
};

exports.addClass = function (el, className) {
	var classNames = el.getAttribute('class');
	var classes = classNames ? classNames.split(' ') : [];

	if (classes.indexOf(className) === -1) {
		classes.push(className);
	}

	el.setAttribute('class', classes.join(' '));
};

exports.removeClass = function (el, className) {
	var classNames = el.getAttribute('class');
	var classes = classNames ? classNames.split(' ') : [];

	var idx = classes.indexOf(className);
	if (idx !== -1) {
		classes.splice(idx, 1);
	}

	el.setAttribute('class', classes.join(' '));
};

exports.containsElement = function (parent, child) {
	if (!child) {
		return false;
	}

	var node = child.parentNode;

	while (node !== null) {
		if (node == parent) {
			return true;
		}

		node = node.parentNode;
	}

	return false;
};

exports.documentOffset = function (el) {
	var offset = { top: 0, left: 0 };

	do {
		if (!isNaN(el.offsetTop)) {
			offset.top += el.offsetTop;
		}

		if (!isNaN(el.offsetLeft)) {
			offset.left += el.offsetLeft;
		}
	} while ((el = el.offsetParent));

	return offset;
};


exports.getAllElementsAtPoint = function (container, x, y) {
	// Offset X / Y by container offset so they are in document space.
	var containerOffset = exports.documentOffset(container);
	x += containerOffset.left;
	y += containerOffset.top;

	// Get all the elements in the document at the current X / Y.
	var el = document.elementFromPoint(x, y);

	if (!el || !exports.containsElement(container, el)) {
		return null;
	}

	// Find all the parents of el that also reside at the X / Y offset.
	var matches = [el];

	var parent = el.parentNode;
	while (parent && parent !== container) {
		var offset = exports.documentOffset(parent);

		var range = {
			x: [offset.left, offset.left + parent.offsetWidth],
			y: [offset.top, offset.top + parent.offsetHeight]
		};

		if ((x >= range.x[0] && x <= range.x[1]) && (y >= range.y[0] && y <= range.y[1])) {
			matches.push(parent);
		}

		parent = parent.parentNode;
	}

	return matches;
};

exports.addEventListener = function (el, type, fn) {
	if (!allListeners[el]) {
		allListeners[el] = {};
	}

	if (!allListeners[el][type]) {
		allListeners[el][type] = [];
	}

	allListeners[el][type].push(fn);

	el.addEventListener(type, fn);
};

exports.removeEventListener = function (el, type, fn) {
	var listeners = allListeners[el];
	if (!listeners) {
		return;
	}

	var listenersForType = listeners[type];
	if (!listenersForType) {
		return;
	}

	// If no function is specified, remove them all.
	if (!fn) {
		for (var i = listenersForType.length - 1; i >= 0 ; i--) {
			el.removeEventListener(type, listenersForType[i]);
			listenersForType.splice(i, 1);
		}
	} else {
		el.removeEventListener(type, fn);

		var idx = listenersForType.indexOf(fn);
		if (idx !== -1) {
			listenersForType.splice(idx, 1);
		}
	}
};

return exports;

});