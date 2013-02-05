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
	return activeMenus.length ? activeMenus[activeMenus.length-1] : null;
}

/**
 * PushMenu
 */
function PushMenu(view) {
	if (_.isString(view)) {
		view = GetView(view);
	}

	if (!activeMenus.length) {
		$viewportUI.addClass('active');
		CL.CaptureInput(KeyPressEvent, MouseMoveEvent);
	}

	activeMenus.push(view);
}

/**
 * PopMenu
 */
function PopMenu() {
	var view = activeMenus.pop();
	if (!view) {
		return;  // someone got antsy
	}

	ClearHoverElements();
	ClearFocusedElement(true);

	if (!activeMenus.length) {
		$viewportUI.removeClass('active');
		CL.CaptureInput(null, null);
	}
}

/**
 * PopAllMenus
 */
function PopAllMenus() {
	while (activeMenus.length) {
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
		var el = hoverEls && hoverEls.length > 0 ? hoverEls[0] : null;
		focusedThisFrame = FocusElement(el);
	}

	if (focusEl) {
		// Simulate click events for mouse0.
		if (keyName === 'mouse0') {
			var offset = $ptr.offset();
			$(focusEl).trigger(new QkClickEvent(offset.left, offset.top));
		}

		// Forward key press events to our focused element if it
		// wasn't just focused (we don't want to send bad mouse0
		// keypress events)
		if (!focusedThisFrame) {
			$(focusEl).trigger(new QkKeyPressEvent(keyName));
		}
	}
}

/**
 * MouseMoveEvent
 */
function MouseMoveEvent(dx, dy) {
	if (mouseCallback) {
		mouseCallback(dx, dy);
		return;
	}

	mx += dx;
	my += dy;

	// Clamp to viewport width/height.
	mx = Math.max(0, Math.min(mx, vw));
	my = Math.max(0, Math.min(my, vh));

	// Update pointer element.
	$ptr.css({ 'top': my + 'px', 'left': mx + 'px' });

	// Simulate browser by adding/removing hover classes.
	UpdateHoverElements();
}

/**
 * GetAllElementsAtPoint
 *
 * Returns a list of ALL elements of a view that contain the specified point.
 */
function GetAllElementsAtPoint(container, x, y) {
	var el = document.elementFromPoint(x, y);

	if (!el) {
		return null;
	}

	if (!$.contains(container, el)) {
		return [el];
	}

	var $matches = $(el).parentsUntil(container, function () {
		var $parent = $(this);
		var offset = $parent.offset();
		var range = {
			x: [offset.left, offset.left + $parent.outerWidth()],
			y: [offset.top, offset.top + $parent.outerHeight()]
		};
		return (x >= range.x[0] && x <= range.x[1]) && (y >= range.y[0] && y <= range.y[1]);
	});

	// Make sure to add the original, bottom-most element as the first index
	// in the array, as we rely on that later on for triggering events.
	var matches = [el];
	$matches.each(function() {
		matches.push(this);
	});

	return matches;
}

/**
 * UpdateHoverElements
 */
function UpdateHoverElements() {
	var els = GetAllElementsAtPoint($viewportUI, mx, my);

	// Trigger mouseleave events.
	if (hoverEls) {
		for (var i = 0; i < hoverEls.length; i++) {
			var oldel = hoverEls[i];

			if (!els || els.indexOf(oldel) === -1) {
				$(oldel).removeClass('hover');
				$(oldel).trigger('qk_mouseleave');
			}
		}
	}

	// Trigger mouseenter events.
	if (els) {
		for (var i = 0; i < els.length; i++) {
			var newel = els[i];

			if (!hoverEls || hoverEls.indexOf(newel) === -1) {
				$(newel).addClass('hover');
				$(newel).trigger('qk_mouseenter');
			}
		}
	}

	hoverEls = els;
}

/**
 * ClearHoverElement
 */
function ClearHoverElements() {
	if (hoverEls) {
		$(hoverEls).removeClass('hover');
	}

	hoverEls = [];
}

/**
 * FocusElement
 */
function FocusElement(el) {
	// If el is a jQuery object, get the inner DOM node.
	if (el instanceof $) {
		el = el.get(0);
	}

	if (focusEl === el) {
		return false;
	}

	ClearFocusedElement(true);

	focusEl = el;
	$(el).addClass('focus');
	$(el).trigger(new QkFocusEvent());

	return true;
}

/**
 * ClearFocusedElement
 */
function ClearFocusedElement(triggerBlur) {
	var el = focusEl;
	if (!el) {
		return;
	}

	$(focusEl).removeClass('focus');
	focusEl = null;

	// Clear focusEl before triggering the event so
	// we don't get in a cycle of multiple clear/blur/clear/blur
	// event when child elements trap blur and inaverdantly trigger
	// this again.
	if (triggerBlur) {
		$(el).trigger(new QkBlurEvent());
	}
}