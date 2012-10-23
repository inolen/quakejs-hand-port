var uil;
var $viewportUI;
var $ptr;

var map = {
	'hud': HudView,
	'scoreboard': ScoreboardView,
	'ingame': IngameMenu,
	'singleplayer': SinglePlayerMenu,
	'settings': SettingsMenu
};

/**
 * Init
 */
function Init() {	
	var uiContext = sys.GetUIRenderContext();

	uil = new UILocals();

	//
	document.addEventListener('resize', ScaleUI, false);
	document.addEventListener('fullscreenchange', ScaleUI, false);

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
		SetFocusedElement(uil.hover);
		$(uil.focused).click();
		return;
	}

	// Forward key press events to our focused element.
	if (uil.focused) {
		if (keyName === 'enter') {
			ClearFocusedElement();
		} else {
			$(uil.focused).trigger('keypress', [ keyName ]);
		}
		return;
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

	var el = document.elementFromPoint(uil.mx, uil.my);

	// Simulate browser by adding/removing hover classes.
	SetHoverElement(el);
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

	ClearHoverElement();
	ClearFocusedElement();
}

/**
 * SetHoverElement
 */
function SetHoverElement(el) {
	// Nothing to do.
	if (uil.hover === el) {
		return;
	}

	ClearHoverElement();

	if (el && $.contains(uil.activeMenu.el, el)) {
		$(el).addClass('hover');
		uil.hover = el;
	}
}

/**
 * ClearHoverElement
 */
function ClearHoverElement() {
	if (uil.hover) {
		$(uil.hover).removeClass('hover');
		uil.hover = null;
	}
}

/**
 * SetFocusedElement
 */
function SetFocusedElement(el) {
	// Nothing to do.
	if (uil.focused === el) {
		return;
	}

	ClearFocusedElement();

	uil.focused = el;
	$(uil.focused).addClass('focus');
}

/**
 * ClearHoveredElement
 */
function ClearFocusedElement() {
	$(uil.focused).trigger('blur');
	$(uil.focused).removeClass('focus');
	uil.focused = null;
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
		RenderView(uil.activeMenu.id, uil.activeMenu.model);
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
function RenderView(name, model) {
	var view = GetView(name);

	// Update visFrame so the main render can show active views.
	view.visFrame = uil.frameCount;

	view.update(model);
}

/**
 * HideView
 */
function HideView(view) {
	if (view.$el.is(':visible')) {
		view.$el.hide();
		return true;
	}

	return false;
}

/**
 * ShowView
 */
function ShowView(view) {
	if (!view.$el.is(':visible')) {
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
 * Update base font-size of view to be 1/64th of the viewport size.
 * This allows all of our text elements to scale properly with the window.
 */
function UpdateFontSize(view) {
	view.$el.css('font-size', (uil.vw / 100) + 'px');
}