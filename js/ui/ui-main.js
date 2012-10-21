var uil;
var $viewportUi;
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
	document.addEventListener('resize', UpdateCachedViewportDimensions, false);
	document.addEventListener('fullscreenchange', UpdateFontSizes, false);

	//
	$viewportUi = $(uiContext.handle);

	UpdateCachedViewportDimensions();
	// TODO figure out a way to call this after a successful render of a view
	UpdateFontSizes();

	// Embed our CSS.
	var $style = $('<style>', { 'type': 'text/css'}).append(viewsCss);
	$style.appendTo('head');

	// Create pointer element.
	$ptr = $('<span>', { 'class': 'pointer' });
	$viewportUi.append($ptr);
}

/**
 * KeyPressEvent
 */
function KeyPressEvent(keyName) {
	if (keyName === 'mouse0') {
		SetFocusedElement(uil.hover);
		$(uil.focused).click();
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
		sys: {
			ReadFile: sys.ReadFile
		},
		com: {
			ExecuteCmdText: com.ExecuteCmdText
		},
		ui: {
			SetActiveMenu: SetActiveMenu,
			CloseActiveMenu: CloseActiveMenu
		}
	});

	$viewportUi.append(view.$el);

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
	$viewportUi.addClass('active');
	uil.activeMenu = GetView(name);
	cl.CaptureInput(KeyPressEvent, MouseMoveEvent);
}

/**
 * CloseActiveMenu
 */
function CloseActiveMenu() {
	$viewportUi.removeClass('active');
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

	for (var name in views) {
		if (!views.hasOwnProperty(name)) {
			continue;
		}

		var view = views[name];

		// Hide the view if it's not active this frame (and it's not the
		// active menu).
		if (view.visFrame !== uil.frameCount && view !== uil.activeMenu) {
			HideView(view);
			continue;
		}

		ShowView(view);
	}

	uil.frameCount++;
}

/**
 * RenderView
 */
function RenderView(name, model) {
	var view = GetView(name);
	view.model = model;
	view.visFrame = uil.frameCount;
}

/**
 * UpdateCachedViewportDimensions
 */
function UpdateCachedViewportDimensions() {
	uil.vw = $viewportUi.width();
	uil.vh = $viewportUi.height();
}

/**
 * UpdateFontSizes
 *
 * Update base font-size of each child element to be 1/64th of the viewport size.
 * This allows all of our text elements to scale properly with the window.
 */
function UpdateFontSizes() {
	var children = $viewportUi[0].childNodes;

	for (var i = 0; i < children.length; i++) {
		var child = children[i];
		$(child).css('font-size', (uil.vw / 64) + 'px');
	}
}

/**
 * HideView
 */
function HideView(view) {
	view.$el.hide();
}

/**
 * ShowView
 */
function ShowView(view) {
	view.$el.show();
}