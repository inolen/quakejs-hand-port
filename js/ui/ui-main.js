var uil;
var $viewportUi;
var $ptr;

var map = {
	'hud': HudView,
	'scoreboard': ScoreboardView,
	'ingame': IngameMenu,
	'singleplayer': SinglePlayerMenu
};

/**
 * Init
 */
function Init() {	
	var uiContext = sys.GetUIRenderContext();

	uil = new UILocals();

	//
	document.addEventListener('fullscreenchange', UpdateFontSizes, false);

	//
	$viewportUi = $(uiContext.handle);

	// Embed our CSS.
	var $style = $('<style>', { 'type': 'text/css'}).append(viewsCss);
	$style.appendTo('head');

	// Create pointer element.
	$ptr = $('<div>', { 'class': 'pointer' });
	$viewportUi.append($ptr);
}

/**
 * KeyPressEvent
 */
function KeyPressEvent(keyName) {
	// Clicking anywhere should clear anything capturing input.
	if (keyName === 'mouse0') {
		CaptureInput(null, null);
	}

	if (uil.keyCallback) {
		uil.keyCallback(keyName);
		return;
	}

	if (keyName === 'mouse0') {
		// Trigger click events.
		var el = document.elementFromPoint(mx, my);
		$(el).click();
	}
}

/**
 * MouseMoveEvent
 */
var lastHovered = null;
var mx = 0;
var my = 0;

function MouseMoveEvent(dx, dy) {
	if (uil.mouseCallback) {
		uil.mouseCallback(dx, dy);
		return;
	}

	var vw = $viewportUi.width();
	var vh = $viewportUi.height();

	mx += dx;
	my += dy;

	if (mx < 0) {
		mx = 0;
	} else if (mx > vw) {
		mx = vw;
	}

	if (my < 0) {
		my = 0;
	} else if (my > vh) {
		my = vh;
	}

	$ptr.css({
		'top': my + 'px',
		'left': mx + 'px'
	});

	var el = document.elementFromPoint(mx, my);

	if (lastHovered && lastHovered !== el) {
		$(lastHovered).removeClass('hover');
		lastHovered = null;
	}

	if (el && $.contains(uil.activeMenu.el, el)) {
		$(el).addClass('hover');
		lastHovered = el;
	}
}

/**
 * RegisterView
 */
function RegisterView(name) {
	var view = uil.views[name] = new map[name]({
		sys: {
			ReadFile: sys.ReadFile
		},
		ui: {
			CaptureInput: CaptureInput,
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
}

/**
 * CaptureInput
 */
function CaptureInput(keyCallback, mouseCallback) {
	uil.keyCallback = keyCallback;
	uil.mouseCallback = mouseCallback;
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
			return;
		}

		view.render();

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
 * UpdateFontSizes
 *
 * Update base font-size of each child element to be 1/64th of the viewport size.
 * This allows all of our text elements to scale properly with the window.
 */
function UpdateFontSizes() {
	var width = $viewportUi.width();
	var children = $viewportUi[0].childNodes;

	for (var i = 0; i < children.length; i++) {
		var child = children[i];
		$(child).css('font-size', (width / 64) + 'px');
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