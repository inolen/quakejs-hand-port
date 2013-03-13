var View = {
	close: function () {
		UI.RemoveView(this);
	}
};

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
 * GetView
 */
function GetView(type) {
	for (var i = 0; i < uil.views.length; i++) {
		if (uil.views[i] instanceof type) {
			return uil.views[i];
		}
	}

	var view = new type();

	if (!view.template) {
		error('No template for view');
	}

	// Create DOM node from template.
	var tmpl = document.createElement('div');
	tmpl.innerHTML = view.template;

	// Attach el to view
	view.el = uil.viewport.appendChild(tmpl.firstChild);

	// // Hide by default.
	// HideView(view);

	// Apply viewmodel bindings.
	ko.applyBindings(view, view.el);

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

	view.el.parentNode.removeChild(view.el);

	uil.views.splice(idx, 1);

	// TODO move to setactivemenu
	ClearHoverElements();
	ClearFocusedElement(true);

	if (!uil.views.length) {
		StopInputCapture();
	}
}

/**
 * ClearViews
 */
function ClearViews() {
	SetActiveMenu(null);

	for (var i = uil.views.length-1; i >= 0; i--) {
		RemoveView(uil.views[i]);
	}
}

/**
 * SetActiveMenu
 */
function SetActiveMenu(view) {
	// Clear the old menu.
	if (uil.activeMenu) {
		RemoveView(uil.activeMenu);
		uil.activeMenu = null;
	}

	//
	if (!view) {
		return;
	}

	// Create the menu.
	uil.activeMenu = view;

	StartInputCapture();
}

/**
 * GetActiveMenu
 */
function GetActiveMenu() {
	return uil.activeMenu;
}

/**
 * StartInputCapture
 */
function StartInputCapture() {
	DOM.addClass(uil.viewport, 'active');
	CL.CaptureInput({
		keydown: KeyDownEvent,
		keyup: KeyUpEvent,
		keypress: KeyPressEvent,
		mousemove: MouseMoveEvent
	});
}

/**
 * StopInputCapture
 */
function StopInputCapture() {
	DOM.removeClass(uil.viewport, 'active');
	CL.CaptureInput({});  // passing empty object will null out all callbacks
}