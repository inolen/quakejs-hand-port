define(function (require) {

var DOM = require('ui/dom');

/**
 * Tab component
 */
var Tab = function (element, selected) {
	var self = this;

	self.el = element;
	self.container = element;
	do {
		self.container = self.container.parentNode;
	} while (self.container && self.container.tagName.toLowerCase() !== 'ul');

	DOM.removeEventListener(self.el, 'click');
	DOM.addEventListener(self.el, 'click', function (ev) {
		self.show(ev);
		return false;
	});

	if (selected) {
		// Wait 1 frame for the entire template to render.
		setTimeout(function () {
			self.el.click();
		}, 0);
	}
};

Tab.prototype.show = function (ev) {
	var tab = ev.target;
	var tabId = tab.getAttribute('href');
	tabId = tabId.replace('#', '');

	// Don't activate if we're already the active tab.
	if (DOM.hasClass(tab.parentNode, 'active')) {
		return;
	}

	var content = document.getElementById(tabId);
	if (!content) {
		UI.Log('Couldn\'t find content for tab id', tabId);
		return;
	}

	this.activate(tab.parentNode);
	this.activate(content);
};

Tab.prototype.activate = function (element) {
	var old = element.parentNode.getElementsByClassName('active');

	for (var i = 0; i < old.length; i++) {
		// Ignore if not our sibling.
		if (old[i].parentNode !== element.parentNode) {
			continue;
		}

		DOM.removeClass(old[i], 'active');
	}

	DOM.addClass(element, 'active');
};

return Tab;

});