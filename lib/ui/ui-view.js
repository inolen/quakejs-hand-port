/**
 * InitViews
 */
function InitViews() {
	// Create pointer element.
	var frag = document.createElement('span');
	frag.setAttribute('class', 'pointer');
	uil.ptr = uil.viewport.appendChild(frag);
}

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
	view.el = uil.viewport.appendChild(tmpl.firstChild);

	// Hide by default.
	HideView(view);

	// Apply viewmodel bindings.
	ko.applyBindings(model, view.el);

	if (model.init) {
		model.init(view.el);
	}

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

	var view = uil.views[idx];

	if (view.model.destroy) {
		view.model.destroy(view.el);
	}

	uil.views.splice(idx, 1);
	view.el.parentNode.removeChild(view.el);
}

/**
 * RenderView
 *
 * Render the view for a single frame.
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

/**********************************************************
 *
 * Menus
 *
 * Menus are views that are persistent and initialize
 * input capture upon creation.
 *
 **********************************************************/

/**
 * PeekMenu
 */
function PeekMenu() {
	return uil.persistentViews.length ? uil.persistentViews[uil.persistentViews.length-1] : null;
}

/**
 * PushMenu
 *
 * Push view to persistent stack.
 */
function PushMenu(view) {
	if (!uil.persistentViews.length) {
		StartInputCapture();
	}

	uil.persistentViews.push(view);
}

/**
 * PopMenu
 */
function PopMenu() {
	var view = uil.persistentViews.pop();
	if (!view) {
		return;  // someone got antsy
	}

	RemoveView(view);

	ClearHoverElements();
	ClearFocusedElement(true);

	if (!uil.persistentViews.length) {
		StopInputCapture();
	}
}

/**
 * PopAllMenus
 */
function PopAllMenus() {
	while (uil.persistentViews.length) {
		PopMenu();
	}
}

/**
 * StartInputCapture
 */
function StartInputCapture() {
	DOM.addClass(uil.viewport, 'active');
	CL.CaptureInput(KeyEvent, MouseMoveEvent);
}

/**
 * StopInputCapture
 */
function StopInputCapture() {
	DOM.removeClass(uil.viewport, 'active');
	CL.CaptureInput(null, null);
}