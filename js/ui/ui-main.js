var uil;
var $viewportUI;
var $ptr;

var map = {
	'hud': HudView,
	'scoreboard': ScoreboardView,
	'ingame': IngameMenu,
	'singleplayer': SinglePlayerMenu,
	'multiplayer': MultiPlayerMenu,
	'settings': SettingsMenu
};

/**
 * Init
 */
function Init() {	
	var uiContext = sys.GetUIContext();

	uil = new UILocals();

	document.addEventListener('fullscreenchange', ScaleUI);
	window.addEventListener('resize', ScaleUI);

	//
	$viewportUI = $(uiContext.handle);
	ScaleUI();

	// Embed our CSS.
	var $style = $('<style>', { 'type': 'text/css'}).append(viewsCss);
	$style.appendTo('head');

	// Create pointer element.
	$ptr = $('<span>', { 'class': 'pointer' });
	$viewportUI.append($ptr);
}

/**
 * KeyPressEvent
 */
function KeyPressEvent(keyName) {
	if (keyName === 'mouse0') {
		UpdateFocusedElement();
		$(uil.focusEl).trigger('click');
		return;
	}

	// Forward key press events to our focused element.
	if (uil.focusEl) {
		$(uil.focusEl).trigger('keypress', [ keyName ]);
	}
}

/**
 * MouseMoveEvent
 */
function MouseMoveEvent(dx, dy) {
	if (uil.mouseCallback) {
		uil.mouseCallback(dx, dy);
		return;
	}

	uil.mx += dx;
	uil.my += dy;

	// Clamp to viewport width/height.
	uil.mx = Math.max(0, Math.min(uil.mx, uil.vw));
	uil.my = Math.max(0, Math.min(uil.my, uil.vh));

	// Update pointer element.
	$ptr.css({ 'top': uil.my + 'px', 'left': uil.mx + 'px' });

	// Simulate browser by adding/removing hover classes.
	if (uil.activeMenu) {
		UpdateHoverElements();
	}
}

/**
 * GetAllElementsAtPoint
 *
 * Returns a list of ALL elements of a view that contain the specified point.
 */
function GetAllElementsAtPoint(view, x, y) {
	var el = document.elementFromPoint(x, y);

	if (!el) {
		return null;
	}

	if (!$.contains(view.el, el)) {
		return [el];
	}

	var $matches = $(el).parentsUntil(view.el, function () {
		var $parent = $(this);
		var offset = $parent.offset();
		var range = {
			x: [offset.left, offset.left + $parent.outerWidth()],
			y: [offset.top, offset.top + $parent.outerHeight()]
		};
		return (x >= range.x[0] && x <= range.x[1]) && (y >= range.y[0] && y <= range.y[1]);
	});

	// Make sure to add the origin, lowest element as the first index
	// in the array, as we rely on that later on for triggering events.
	var matches = $matches.toArray();
	matches.splice(0, 0, el);

	return matches;
}

/**
 * RegisterView
 */
function RegisterView(name) {
	var view = uil.views[name] = new map[name]({
		sys: sys,
		com: com,
		cl: cl,
		ui: {
			SetActiveMenu:       SetActiveMenu,
			CloseActiveMenu:     CloseActiveMenu,
			FindImage:           FindImage,
			ProcessTextInput:    ProcessTextInput,
			ProcessKeyBindInput: ProcessKeyBindInput
		}
	});

	$viewportUI.append(view.$el);

	HideView(view);

	return view;
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
 * SetActiveMenu
 */
function SetActiveMenu(name) {
	$viewportUI.addClass('active');
	uil.activeMenu = GetView(name);
	cl.CaptureInput(KeyPressEvent, MouseMoveEvent);
}

/**
 * CloseActiveMenu
 */
function CloseActiveMenu() {
	$viewportUI.removeClass('active');
	uil.activeMenu = null;
	cl.CaptureInput(null, null);

	ClearHoverElements();
	ClearFocusedElement();
}

/**
 * SetHoverElements
 */
function UpdateHoverElements() {
	var els = GetAllElementsAtPoint(uil.activeMenu, uil.mx, uil.my);

	// Trigger mouseleave events.
	if (uil.hoverEls) {
		for (var i = 0; i < uil.hoverEls.length; i++) {
			var oldel = uil.hoverEls[i];

			if (!els || els.indexOf(oldel) === -1) {
				$(oldel).removeClass('hover');
				$(oldel).trigger('mouseleave');
			}
		}
	}

	// Trigger mouseenter events.
	if (els) {
		for (var i = 0; i < els.length; i++) {
			var newel = els[i];

			if (!uil.hoverEls || uil.hoverEls.indexOf(newel) === -1) {
				$(newel).addClass('hover');
				$(newel).trigger('mouseenter');
			}
		}
	}

	uil.hoverEls = els;
}

/**
 * ClearHoverElement
 */
function ClearHoverElements() {
	if (uil.hoverEls) {
		$(uil.hoverEls).removeClass('hover');
	}

	uil.hoverEls = [];
}

/**
 * SetFocusedElement
 */
function UpdateFocusedElement() {
	var el = uil.hoverEls && uil.hoverEls.length > 0 ?
		uil.hoverEls[0] :
		null;

	// Nothing to do.
	if (uil.focusEl === el) {
		return;
	}

	ClearFocusedElement();

	uil.focusEl = el;
	$(el).addClass('focus');
}

/**
 * ClearHoveredElement
 */
function ClearFocusedElement() {
	$(uil.focusEl).trigger('blur');
	$(uil.focusEl).removeClass('focus');
	uil.focusEl = null;
}

/**
 * Render
 *
 * Show/hide/update all views.
 */
function Render() {
	var views = uil.views;

	// Add active menu to render list.
	if (uil.activeMenu) {
		RenderView(uil.activeMenu);
	}

	for (var name in views) {
		if (!views.hasOwnProperty(name)) {
			continue;
		}

		var view = views[name];

		// Hide the view if it's not active this frame.
		if (view.visFrame !== uil.frameCount) {
			HideView(view);
			continue;
		}

		// If the view was successfully shown, let's make sure it has the
		// most up to date font sizes as it may have not been visible on
		// the last resize.
		if (ShowView(view)) {
			UpdateFontSize(view);
		}
	}

	uil.frameCount++;
}

/**
 * RenderView
 */
function RenderView(view) {
	// Update visFrame so the main render can show active views.
	view.visFrame = uil.frameCount;
}

/**
 * HideView
 */
function HideView(view) {
	if (typeof(view.visible) === 'undefined' || view.visible) {
		view.$el.hide();
		view.visible = false;
		return true;
	}

	return false;
}

/**
 * ShowView
 */
function ShowView(view) {
	if (!view.visible) {
		view.$el.show();
		view.visible = true;
		return true;
	}

	return false;
}

/**
 * ScaleUI
 * 
 * Update cached viewport sizes as well as font-sizes for all views.
 */
function ScaleUI() {
	uil.vw = $viewportUI.width();
	uil.vh = $viewportUI.height();

	UpdateAllFontSizes();
}

/**
 * UpdateAllFontSizes
 */
function UpdateAllFontSizes() {
	var views = uil.views;

	for (var name in views) {
		if (!views.hasOwnProperty(name)) {
			continue;
		}

		UpdateFontSize(views[name]);
	}
}

/**
 * UpdateFontSizes
 *
 * Update base font-size of view to be 1/100th of the viewport size.
 * This allows all of our text elements to scale properly with the window.
 */
function UpdateFontSize(view) {
	view.$el.css('font-size', (uil.vw / 100) + 'px');
}