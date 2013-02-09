var $ptr;

/**
 * UIView
 *
 * This is the default Backbone view with the render
 * function shimmed to make the view integrate with our UI.
 */
var UIView = Backbone.View.extend({
	_postRender: function () {
		UpdateFontSizes(this.$el);
	},
	open: function () {
		if (this.el.className.indexOf('visible') !== -1) {
			return;
		}
		this.el.className = 'visible';
		this.opened();
	},
	close: function () {
		if (this.el.className.indexOf('hidden') !== -1) {
			return;
		}
		this.el.className = 'hidden';
		this.closed();
	},
	render: function () {
		this.renderView();
		this._postRender();
	},
	// Stubs.
	opened: function () {
	},
	closed: function () {
	},
	renderView: function () {
	}
});

/**
 * GetViewConstructor
 */
function GetViewConstructor(name) {
	switch (name) {
		case 'scoreboard':   return ScoreboardView;
		case 'main':         return MainMenu;
		case 'settings':     return SettingsMenu;
		default:             throw Error('Unsupported view');
	}
}

/**
 * GetView
 */
function GetView(type) {
	var view = uil.views[type];

	if (!view) {
		view = RegisterView(type);
	}

	return view;
}

/**
 * RegisterView
 */
function RegisterView(type) {
	var view;

	if (_.isString(type)) {
		var ctor = GetViewConstructor(type);

		// Create the element for the view and append
		// to the container.
		var $el = $('<div />', { id: type })
			.appendTo($viewportUI);

		// Create the view with the new element.
		view = uil.views[type] = new ctor({ el: $el });
	} else {
		view = uil.views[type] = new type();

		// Create DOM node from template.
		var tmpl = document.createElement('div');
		tmpl.innerHTML = type.template;

		// Apply viewmodel bindings.
		ko.applyBindings(view, tmpl.firstChild);

		// Append to the DOM.
		$viewportUI[0].appendChild(tmpl.firstChild);
	}

	// Hide by default.
	HideView(view);

	return view;
}

/**
 * RenderView
 */
function RenderView(view) {
	if (_.isString(view)) {
		view = GetView(view);
	}

	// Update visFrame so the main render can show active views.
	view.visFrame = uil.frameCount;
}

/**
 * ShowView
 */
function ShowView(view) {
	if (view.open) {
		view.open();
	} else {
		view.visible(true);
	}
}

/**
 * HideView
 */
function HideView(view) {
	if (view.close) {
		view.close();
	} else {
		view.visible(false);
	}
}

/**
 * ScaleElements
 *
 * Update cached viewport sizes as well as font-sizes for all views.
 */
function ScaleElements() {
	uil.vw = $viewportUI.width();
	uil.vh = $viewportUI.height();

	var views = uil.views;

	for (var name in views) {
		if (!views.hasOwnProperty(name)) {
			continue;
		}

		if (!(views[name] instanceof HudViewModel)) {
			UpdateFontSizes(views[name].$el);
		}
	}
}

/**
 * UpdateFontSizes
 *
 * Update base font-size of view to be 1/100th of the viewport size.
 * This allows all of our text elements to scale properly with the window.
 */
function UpdateFontSizes($el) {
	$el.css('font-size', (uil.vw / 100) + 'px');
}

/**********************************************************
 *
 * Menus
 *
 **********************************************************/

/**
 * InitMenus
 */
function InitMenus() {
	// Create pointer element.
	$ptr = $('<span>', { 'class': 'pointer' });
	$viewportUI.append($ptr);
}

/**
 * PeekMenu
 */
function PeekMenu() {
	return uil.activeMenus.length ? uil.activeMenus[uil.activeMenus.length-1] : null;
}

/**
 * PushMenu
 */
function PushMenu(view) {
	if (!uil.activeMenus.length) {
		$viewportUI.addClass('active');
		CL.CaptureInput(KeyEvent, MouseMoveEvent);
	}

	uil.activeMenus.push(view);
}

/**
 * PopMenu
 */
function PopMenu() {
	var view = uil.activeMenus.pop();
	if (!view) {
		return;  // someone got antsy
	}

	ClearHoverElements();
	ClearFocusedElement(true);

	if (!uil.activeMenus.length) {
		$viewportUI.removeClass('active');
		CL.CaptureInput(null, null);
	}
}

/**
 * PopAllMenus
 */
function PopAllMenus() {
	while (uil.activeMenus.length) {
		PopMenu();
	}
}