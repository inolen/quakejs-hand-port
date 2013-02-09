var $ptr;

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
	var view = uil.views[type] = new type();

	// Create DOM node from template.
	var tmpl = document.createElement('div');
	tmpl.innerHTML = type.template;

	// Apply viewmodel bindings.
	ko.applyBindings(view, tmpl.firstChild);

	// Append to the DOM.
	$viewportUI[0].appendChild(tmpl.firstChild);

	// Hide by default.
	HideView(view);

	return view;
}

/**
 * RenderView
 */
function RenderView(view) {
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

	$viewportUI.css('font-size', (uil.vw / 100) + 'px');
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