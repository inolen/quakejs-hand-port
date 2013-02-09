var $ptr;

/**
 * UIView
 *
 * This is the default Backbone view with the render
 * function shimmed to make the view integrate with our UI.
 */
var UIView = Backbone.View.extend({
	_postRender: function () {
		RegisterComponents(this.$el);
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
		case 'loading':      return LoadingView;
		case 'scoreboard':   return ScoreboardView;
		case 'main':         return MainMenu;
		case 'ingame':       return IngameMenu;
		case 'settings':     return SettingsMenu;
		case 'message':      return MessageMenu;
		default:             throw Error('Unsupported view');
	}
}

/**
 * GetView
 */
function GetView(name) {
	var view = uil.views[name];
	if (!view) {
		view = RegisterView(name);
	}

	return view;
}

/**
 * RegisterView
 */
function RegisterView(name) {


	var view;

	if (name === 'hud') {
		view = uil.views[name] = new HudViewModel();
		$viewportUI.append(HudViewTemplate);
		ko.applyBindings(view, document.getElementById('hud'));
	} else if (name === 'loading') {
		view = uil.views[name] = new LoadingViewModel();
		$viewportUI.append(LoadingViewTemplate);
		ko.applyBindings(view, document.getElementById('loading'));
	} else {
		var ctor = GetViewConstructor(name);

		// Create the element for the view and append
		// to the container.
		var $el = $('<div />', { id: name })
			.appendTo($viewportUI);

		// Create the view with the new element.
		view = uil.views[name] = new ctor({ el: $el });
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
	view.open();
}

/**
 * HideView
 */
function HideView(view) {
	view.close();
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
	if (_.isString(view)) {
		view = GetView(view);
	}

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