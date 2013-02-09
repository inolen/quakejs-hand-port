var uil;
var $viewportUI;

/**
 * log
 */
function log() {
	CL.Log.apply(this, arguments);
}

/**
 * error
 */
function error(str) {
	CL.Error(str);
}

/**
 * Init
 */
function Init(callback) {
	uil = new UILocals();

	log('Initializing');

	document.addEventListener('fullscreenchange', ScaleElements);
	window.addEventListener('resize', ScaleElements);

	//
	var context = SYS.GetUIContext();
	$viewportUI = $(context);

	// Reset the UI container.
	$viewportUI.empty();
	ScaleElements();

	// Embed our CSS.
	for (var i = 0; i < cssIncludes.length; i++) {
		var $style = $('<style>', { 'type': 'text/css'}).append(cssIncludes[i]);

		// Append to page.
		$style.appendTo('head');

		// Store for cleanup.
		uil.styles.push($style);
	}

	//
	InitImages();
	InitMenus();

	RegisterDOMHooks();

	callback();
}

/**
 * Shutdown
 */
function Shutdown() {
	log('Shutdown');

	RemoveDOMHooks();

	// Clean up and clear input handlers.
	PopAllMenus();

	// Remove our CSS.
	for (var i = 0; i < uil.styles.length; i++) {
		var $style = uil.styles[i];
		$style.remove();
	}

	// TODO Kill any pending image deferreds.
}

/**
 * Render
 *
 * Show/hide/update all views.
 */

function Render() {
	var views = uil.views;

	// Add active menu to view render list.
	var activeMenu = PeekMenu();
	if (activeMenu) {
		RenderView(activeMenu);
	}

	// Render any other views the client has requested.
	for (var name in views) {
		if (!views.hasOwnProperty(name)) {
			continue;
		}

		var view = views[name];

		// Hide the view if it's not active this frame.
		if (view.visFrame !== uil.frameCount) {
			HideView(view);
			continue;
		}

		ShowView(view);
	}

	uil.frameCount++;
}


/**********************************************************
 *
 * Input handling
 *
 * We don't rely on the browser for input events, we instead
 * trap input from the client, and emulate the DOM.
 *
 **********************************************************/

/**
 * RegisterDOMHooks
 */
var originalBlur = HTMLElement.prototype.blur;
var originalFocus = HTMLElement.prototype.focus;

function RegisterDOMHooks() {
	HTMLElement.prototype.blur = function () {
		if (!ContainsElement($viewportUI[0], this)) {
			originalBlur.apply(this);
			return;
		}

		ClearFocusedElement(this);
	};

	HTMLElement.prototype.focus = function () {
		if (!ContainsElement($viewportUI[0], this)) {
			originalFocus.apply(this);
			return;
		}

		FocusElement(this);
	};

	// If a mousedown event has bubbled up, focus on the element.
	$viewportUI.on('mousedown', function (ev) {
		if (!ContainsElement($viewportUI[0], ev.relatedTarget)) {
			return;
		}

		ev.relatedTarget.focus();
	});

	// Don't allow the events we simulate here to bubble back up to
	// the system level handlers, causing duplicate input.
	$viewportUI.on('mousedown mouseup click keypress', function (ev) {
		if (!ContainsElement($viewportUI[0], ev.relatedTarget)) {
			return;
		}

		ev.preventDefault();
		ev.stopPropagation();
	});
}

/**
 * RemoveDOMHooks
 */
function RemoveDOMHooks() {
	HTMLElement.prototype.blur = originalBlur;
	HTMLElement.prototype.focus = originalFocus;

	$viewportUI.off('mousedown');
}

/**
 * ContainsElement
 */
function ContainsElement(parent, child) {
	if (!child) {
		return false;
	}

	var node = child.parentNode;

	while (node != null) {
		if (node == parent) {
			return true;
		}

		node = node.parentNode;
	}

	return false;
}

/**
 * KeyEvent
 */
function KeyEvent(keyName, down) {
	// Simulate mousedown / mouseup / click events for mouse keys.
	if (uil.hoverEls && keyName.indexOf('mouse') === 0) {
		var offset = $ptr.offset();
		var bottomMost = uil.hoverEls[0];
		var button = parseInt(keyName.substr(5), 10);
		var opts = {
			relatedTarget: bottomMost,
			bubbles: true,
			cancelable: true,
			screenX: offset.left,
			screenY: offset.top,
			button: button
		};

		var eventName;

		if (down) {
			eventName = 'mousedown';
		} else {
			eventName = 'mouseup';
		}

		bottomMost.dispatchEvent(new MouseEvent(eventName, opts));

		// Trigger a click event after mouseup.
		if (!down) {
			bottomMost.dispatchEvent(new MouseEvent('click', opts));
		}

		return;
	}

	if (uil.focusEl && down) {
		var ev;

		// FIXME It's lame to do browser-specific hacks here.
		if (typeof(KeyboardEvent) === 'function') {  // chrome
			ev = new KeyboardEvent('keypress', {
				relatedTarget: uil.focusEl,
				bubbles: true,
				cancelable: true
			});
		} else {  // firefox
			ev = document.createEvent('KeyboardEvent');
			ev.initKeyEvent('keypress', true, true, null, false, false, false, false, 0, 0);
		}

		ev.key = keyName;

		uil.focusEl.dispatchEvent(ev);
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
function GetAllElementsAtPoint(x, y) {
	var container = $viewportUI;

	// Offset X / Y by container offset so they are in document space.
	var containerOffset = container.offset();
	x += containerOffset.left;
	y += containerOffset.top;

	// Get all the elements in the document at the current X / Y.
	var el = document.elementFromPoint(x, y);

	if (!el) {
		return null;
	}

	// Find all the parents of el that also reside at the X / Y offset.
	var $matches = $(el).parentsUntil(container, function () {
		var offset = $(this).offset();
		var range = {
			x: [offset.left, offset.left + this.offsetWidth],
			y: [offset.top, offset.top + this.offsetHeight]
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
	var els = GetAllElementsAtPoint(uil.mx, uil.my);

	// Trigger mouseleave events.
	if (uil.hoverEls) {
		for (var i = 0; i < uil.hoverEls.length; i++) {
			var oldel = uil.hoverEls[i];

			if (!els || els.indexOf(oldel) === -1) {
				$(oldel).removeClass('hover');

				oldel.dispatchEvent(new MouseEvent('mouseleave', {
					relatedTarget: oldel,
					bubbles: true,
					cancelable: true
				}));
			}
		}
	}

	// Trigger mouseenter events.
	if (els) {
		for (var i = 0; i < els.length; i++) {
			var newel = els[i];

			if (!uil.hoverEls || uil.hoverEls.indexOf(newel) === -1) {
				$(newel).addClass('hover');
				newel.dispatchEvent(new MouseEvent('mouseenter', {
					relatedTarget: newel,
					bubbles: true,
					cancelable: true
				}));
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

	uil.hoverEls = null;
}

/**
 * FocusElement
 */
function FocusElement(el) {
	// If el is a jQuery object, get the inner DOM node.
	if (el instanceof $) {
		el = el.get(0);
	}

	if (uil.focusEl === el) {
		return;
	}

	ClearFocusedElement(true);

	if (!el) {
		return;
	}

	uil.focusEl = el;
	$(el).addClass('focus');

	var ev = document.createEvent('Event');
	ev.initEvent('focus', false, false);
	el.dispatchEvent(ev);
}

/**
 * ClearFocusedElement
 */
function ClearFocusedElement(triggerBlur) {
	var el = uil.focusEl;
	if (!el) {
		return;
	}

	$(uil.focusEl).removeClass('focus');
	uil.focusEl = null;

	// Clear uil.focusEl before triggering the event so
	// we don't get in a cycle of multiple clear/blur/clear/blur
	// event when child elements trap blur and inaverdantly trigger
	// this again.
	var ev = document.createEvent('Event');
	ev.initEvent('blur', false, false);
	el.dispatchEvent(ev);
}