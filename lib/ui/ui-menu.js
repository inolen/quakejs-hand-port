var $ptr;

/**
 * InitMenus
 */
function InitMenus() {
	// Create pointer element.
	$ptr = $('<span>', { 'class': 'pointer' });
	$viewportUI.append($ptr);

	// Any blur event that's bubbled up should cause a focus clear.
	$viewportUI.on('qk_blur', function () {
		ClearFocusedElement(false);
	});
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
	if (_.isString(view)) {
		view = GetView(view);
	}

	if (!uil.activeMenus.length) {
		$viewportUI.addClass('active');
		CL.CaptureInput(KeyPressEvent, MouseMoveEvent);
	}

	uil.activeMenus.push(view);

	view.opened();
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

	view.closed();
}

/**
 * PopAllMenus
 */
function PopAllMenus() {
	while (uil.activeMenus.length) {
		PopMenu();
	}
}

/**********************************************************
 *
 * Input handling
 *
 * We don't rely on the browser for input events, we instead
 * trap input from the client, and somewhat emulate browser
 * input events because well, it works and to makes writing
 * views more familiar.
 *
 **********************************************************/

/**
 * KeyPressEvent
 */
function KeyPressEvent(keyName) {
	var focusedThisFrame = false;

	if (keyName === 'mouse0') {
		var el = uil.hoverEls && uil.hoverEls.length > 0 ? uil.hoverEls[0] : null;
		focusedThisFrame = FocusElement(el);
	}

	if (uil.focusEl) {
		// Simulate click events for mouse0.
		if (keyName === 'mouse0') {
			var offset = $ptr.offset();
			$(uil.focusEl).trigger(new QkClickEvent(offset.left, offset.top));
		}

		// Forward key press events to our focused element if it
		// wasn't just focused (we don't want to send bad mouse0
		// keypress events)
		if (!focusedThisFrame) {
			$(uil.focusEl).trigger(new QkKeyPressEvent(keyName));
		}
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
 * UpdateHoverElements
 */
function UpdateHoverElements() {
	var i;
	var activeMenu = PeekMenu();
	if (!activeMenu) {
		error('Calling UpdateHoverElements with no active menu');
		return;
	}

	var els = GetAllElementsAtPoint(activeMenu, uil.mx, uil.my);

	// Trigger mouseleave events.
	if (uil.hoverEls) {
		for (i = 0; i < uil.hoverEls.length; i++) {
			var oldel = uil.hoverEls[i];

			if (!els || els.indexOf(oldel) === -1) {
				$(oldel).removeClass('hover');
				$(oldel).trigger('qk_mouseleave');
			}
		}
	}

	// Trigger mouseenter events.
	if (els) {
		for (i = 0; i < els.length; i++) {
			var newel = els[i];

			if (!uil.hoverEls || uil.hoverEls.indexOf(newel) === -1) {
				$(newel).addClass('hover');
				$(newel).trigger('qk_mouseenter');
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
 * FocusElement
 */
function FocusElement(el) {
	// Nothing to do.
	if (uil.focusEl === el) {
		return false;
	}

	ClearFocusedElement(true);

	uil.focusEl = el;
	$(el).addClass('focus');
	$(el).trigger(new QkFocusEvent());

	return true;
}

/**
 * ClearFocusedElement
 */
function ClearFocusedElement(triggerBlur) {
	if (triggerBlur) {
		$(uil.focusEl).trigger(new QkBlurEvent());
	}

	$(uil.focusEl).removeClass('focus');
	uil.focusEl = null;
}