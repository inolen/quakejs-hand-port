var uil;
var $viewportUI;
var $ptr;

var map = {
	'connect':      ConnectView,
	'hud':          HudView,
	'scoreboard':   ScoreboardView,
	'ingame':       IngameMenu,
	'main':         MainMenu,
	'singleplayer': SinglePlayerMenu,
	'multiplayer':  MultiPlayerMenu,
	'settings':     SettingsMenu
};

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'UI:');
	Function.apply.call(console.log, console, args);
}

/**
 * Init
 */
function Init() {
	uil = new UILocals();

	document.addEventListener('fullscreenchange', ScaleUI);
	window.addEventListener('resize', ScaleUI);

	//
	var context = sys.GetUIContext();
	$viewportUI = $(context);
	ScaleUI();

	// Embed our CSS.
	var $style = $('<style>', { 'type': 'text/css'}).append(viewsCss);
	$style.appendTo('head');

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
function PushMenu(name) {
	if (!uil.activeMenus.length) {
		$viewportUI.addClass('active');
		cl.CaptureInput(KeyPressEvent, MouseMoveEvent);
	}

	uil.activeMenus.push(GetView(name));
}

/**
 * PopMenu
 */
function PopMenu() {
	uil.activeMenus.pop();
	
	ClearHoverElements();
	ClearFocusedElement();

	if (!uil.activeMenus.length) {
		$viewportUI.removeClass('active');
		cl.CaptureInput(null, null);
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
	var view = uil.views[name] = new map[name]({
		sys: sys,
		com: com,
		cl: cl,
		ui: {
			PushMenu:            PushMenu,
			PopMenu:             PopMenu,
			PopAllMenus:         PopAllMenus,
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
	UpdateHoverElements();
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
 * SetHoverElements
 */
function UpdateHoverElements() {
	var activeMenu = PeekMenu();
	var els = GetAllElementsAtPoint(activeMenu, uil.mx, uil.my);

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
	var activeMenu = PeekMenu();
	if (activeMenu) {
		RenderView(activeMenu);
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
			UpdateCenteredDialog(view);
			UpdateFontSize(view);
		}
	}

	uil.frameCount++;
}

/**
 * RenderView
 */
function RenderView(view) {
	if (view instanceof String) {
		view = RegisterView
	}

	// Update visFrame so the main render can show active views.
	view.visFrame = uil.frameCount;
}

/**
 * HideView
 */
function HideView(view) {
	var visible = view.el.style.display !== 'none';

	if (visible) {
		view.$el.hide();
		return true;
	}

	return false;
}

/**
 * ShowView
 */
function ShowView(view) {
	var visible = view.el.style.display !== 'none';

	if (!visible) {
		view.$el.show();
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

	UpdateCenteredDialogs();
	UpdateFontSizes();
}

/**
 * UpdateCenteredDialogs
 */
function UpdateCenteredDialogs() {
	var views = uil.views;

	for (var name in views) {
		if (!views.hasOwnProperty(name)) {
			continue;
		}

		UpdateCenteredDialog(views[name]);
	}
}

/**
 * UpdateCenteredDialog
 */
function UpdateCenteredDialog(view) {
	var $centered = view.$el.find('.dialog-abscenter');

	$centered.css({
		top: uil.vh / 2 - $centered.outerHeight() / 2,
		left: uil.vw / 2 - $centered.outerWidth() / 2
	});
}

/**
 * UpdateFontSizes
 */
function UpdateFontSizes() {
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