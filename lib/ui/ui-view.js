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
function CreateView(model, template, captureInput) {
	var view = new UIView();

	view.captureInput = captureInput;

	// Create DOM node from template.
	var tmpl = document.createElement('div');
	tmpl.innerHTML = template;
	view.el = uil.viewport.appendChild(tmpl.firstChild);

	// Apply viewmodel bindings.
	ko.applyBindings(model, view.el);

	// Remove the view on close events.
	if (model.on) {
		model.on('close', function () {
			RemoveView(view);
		});
	}

	var wasCapturing = Capturing();

	uil.views.push(view);

	// Potentially start capturing input.
	if (!wasCapturing && Capturing()) {
		StartInputCapture();
	}

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

	view.removed = true;

	// Remove KO bindings.
	ko.cleanNode(view.el);

	// Remove from DOM.
	view.el.parentNode.removeChild(view.el);

	// Potentially stop capturing input.
	var wasCapturing = Capturing();

	uil.views.splice(idx, 1);

	if (wasCapturing && !Capturing()) {
		StopInputCapture();
	}

	// FIXME Only do this is the currently hovered / focused
	// elements are part of the view being removed?
	ClearHoverElements();
	ClearFocusedElement();
}

/**
 * ViewIsValid
 */
function ViewIsValid(view) {
	if (!view) {
		return false;
	}

	return !view.removed;
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
 * Capturing
 */
function Capturing() {
	for (var i = 0; i < uil.views.length; i++) {
		if (uil.views[i].captureInput) {
			return true;
		}
	}

	return false;
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