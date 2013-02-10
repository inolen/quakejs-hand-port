var $ptr;

/**
 * CreateView
 */
function CreateView(model, template) {
	// Create DOM node from template.
	var tmpl = document.createElement('div');
	tmpl.innerHTML = template;

	// Push to master views list.
	var view = new UIView();
	view.model = model;
	view.el = $viewportUI[0].appendChild(tmpl.firstChild);

	// Apply viewmodel bindings.
	ko.applyBindings(model, view.el);

	// Hide by default.
	HideView(view);

	uil.views.push(view);

	return view;
}

/**
 * RemoveView
 */
function RemoveView(view) {
	var idx = uil.views.indexOf(view);
	if (idx === -1) {
		return;
	}

	uil.views.splice(idx, 1);
	view.el.parentNode.removeChild(view.el);
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
	view.model.visible(true);
}

/**
 * HideView
 */
function HideView(view) {
	view.model.visible(false);
}

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

	RemoveView(view);

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