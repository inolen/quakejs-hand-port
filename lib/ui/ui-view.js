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
	var view = new UIView();

	// Append remove fn to model.
	model.remove = function () {
		UI.RemoveView(view);
	};

	// Create DOM node from template.
	var tmpl = document.createElement('div');
	tmpl.innerHTML = template;
	view.el = uil.viewport.appendChild(tmpl.firstChild);

	// Hide by default.
	HideView(view);

	// Apply viewmodel bindings.
	ko.applyBindings(model, view.el);

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

	if (uil.activeMenu === view) {
		ClearHoverElements();
		ClearFocusedElement(true);

		StopInputCapture();

		uil.activeMenu = null;
	}
}

/**
 * ClearViews
 */
function ClearViews() {
	for (var i = uil.views.length-1; i >= 0; i--) {
		RemoveView(uil.views[i]);
	}
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
	view.el.style.display = 'block';
}

/**
 * HideView
 */
function HideView(view) {
	view.el.style.display = 'none';
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