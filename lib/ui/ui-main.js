var uil;
var viewportUI;

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

	// Reset the UI container.
	viewportUI = SYS.GetUIContext();
	viewportUI.innerHTML = '';
	ScaleElements();

	// Embed our CSS.
	for (var i = 0; i < cssIncludes.length; i++) {
		var frag = document.createElement('style');
		frag.setAttribute('type', 'text/css');
		frag.innerHTML = cssIncludes[i];

		// Append to page.
		var style = document.getElementsByTagName('head')[0].appendChild(frag);

		// Store for cleanup.
		uil.styles.push(style);
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
		var style = uil.styles[i];
		style.parentNode.removeChild(style);
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

/**
 * ScaleElements
 *
 * Update cached viewport sizes as well as font-sizes for all views.
 */
function ScaleElements() {
	uil.vw = viewportUI.offsetWidth;
	uil.vh = viewportUI.offsetHeight;

	viewportUI.style.fontSize = (uil.vw / 100) + 'px';
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
		if (!ContainsElement(viewportUI, this)) {
			originalBlur.apply(this);
			return;
		}

		ClearFocusedElement(this);
	};

	HTMLElement.prototype.focus = function () {
		if (!ContainsElement(viewportUI, this)) {
			originalFocus.apply(this);
			return;
		}

		FocusElement(this);
	};

	// If a mousedown event has bubbled up, focus on the element.
	viewportUI.addEventListener('mousedown', DOMMouseDown);

	// Don't allow the events we simulate here to bubble back up to
	// the system level handlers, causing duplicate input.
	viewportUI.addEventListener('mousedown', DOMKillEvent);
	viewportUI.addEventListener('mouseup', DOMKillEvent);
	viewportUI.addEventListener('click', DOMKillEvent);
	viewportUI.addEventListener('keypress', DOMKillEvent);
}

/**
 * RemoveDOMHooks
 */
function RemoveDOMHooks() {
	HTMLElement.prototype.blur = originalBlur;
	HTMLElement.prototype.focus = originalFocus;

	viewportUI.removeEventListener('mousedown', DOMMouseDown);
	viewportUI.removeEventListener('mousedown', DOMKillEvent);
	viewportUI.removeEventListener('mouseup', DOMKillEvent);
	viewportUI.removeEventListener('click', DOMKillEvent);
	viewportUI.removeEventListener('keypress', DOMKillEvent);
}

/**
 * DOMMouseDown
 */
function DOMMouseDown(ev) {
	if (!ContainsElement(viewportUI, ev.relatedTarget)) {
		return;
	}

	ev.relatedTarget.focus();
}

/**
 * DOMKillEvent
 */
function DOMKillEvent(ev) {
	if (!ContainsElement(viewportUI, ev.relatedTarget)) {
		return;
	}

	ev.preventDefault();
	ev.stopPropagation();
}

/**
 * KeyEvent
 */
function KeyEvent(keyName, down) {
	// Simulate mousedown / mouseup / click events for mouse keys.
	if (uil.hoverEls && keyName.indexOf('mouse') === 0) {
		var bottomMost = uil.hoverEls[0];
		var offset = DocumentOffset(bottomMost);
		var button = parseInt(keyName.substr(5), 10);
		var opts = {
			relatedTarget: bottomMost,
			bubbles: true,
			cancelable: true,
			screenX: uil.mx,
			screenY: uil.my,
			clientX: uil.mx - offset.left,
			clientY: uil.my - offset.top,
			button: button
		};

		var eventName = down ? 'mousedown' : 'mouseup';
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
	ptr.style.top = uil.my + 'px';
	ptr.style.left = uil.mx + 'px';

	// Simulate browser by adding/removing hover classes.
	UpdateHoverElements();
}

/**
 * GetAllElementsAtPoint
 *
 * Returns a list of ALL elements of a view that contain the specified point.
 */
function GetAllElementsAtPoint(x, y) {
	var container = viewportUI;

	// Offset X / Y by container offset so they are in document space.
	var containerOffset = DocumentOffset(container);
	x += containerOffset.left;
	y += containerOffset.top;

	// Get all the elements in the document at the current X / Y.
	var el = document.elementFromPoint(x, y);

	if (!el) {
		return null;
	}

	// Find all the parents of el that also reside at the X / Y offset.
	var matches = [el];

	var parent = el.parentNode;
	while (parent && parent !== container) {
		var offset = DocumentOffset(parent);

		var range = {
			x: [offset.left, offset.left + parent.offsetWidth],
			y: [offset.top, offset.top + parent.offsetHeight]
		};

		if ((x >= range.x[0] && x <= range.x[1]) && (y >= range.y[0] && y <= range.y[1])) {
			matches.push(parent);
		}

		parent = parent.parentNode;
	}

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
				RemoveClass(oldel, 'hover');

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
				AddClass(newel, 'hover');

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
	if (!uil.hoverEls) {
		return;
	}

	for (var i = 0; i < uil.hoverEls.length; i++) {
		RemoveClass(uil.hoverEls[i], 'hover');
	}

	uil.hoverEls = null;
}

/**
 * FocusElement
 */
function FocusElement(el) {
	if (uil.focusEl === el) {
		return;
	}

	ClearFocusedElement(true);

	if (!el) {
		return;
	}

	uil.focusEl = el;
	AddClass(uil.focusEl, 'focus');

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

	RemoveClass(uil.focusEl, 'focus');
	uil.focusEl = null;

	// Clear uil.focusEl before triggering the event so
	// we don't get in a cycle of multiple clear/blur/clear/blur
	// event when child elements trap blur and inaverdantly trigger
	// this again.
	var ev = document.createEvent('Event');
	ev.initEvent('blur', false, false);
	el.dispatchEvent(ev);
}

/**********************************************************
 *
 * DOM helpers
 *
 **********************************************************/

/**
 * HasClass
 */
function HasClass(el, className) {
	var classNames = el.getAttribute('class');
	return classNames && classNames.indexOf(className) !== -1;
}

/**
 * AddClass
 */
function AddClass(el, className) {
	var classNames = el.getAttribute('class');
	var classes = classNames ? classNames.split(' ') : [];

	if (classes.indexOf(className) === -1) {
		classes.push(className);
	}

	el.setAttribute('class', classes.join(' '));
}

/**
 * RemoveClass
 */
function RemoveClass(el, className) {
	var classNames = el.getAttribute('class');
	var classes = classNames ? classNames.split(' ') : [];

	var idx = classes.indexOf(className);
	if (idx !== -1) {
		classes.splice(idx, 1);
	}

	el.setAttribute('class', classes.join(' '));
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
 * DocumentOffset
 */
function DocumentOffset(el) {
	var offset = { top: 0, left: 0 };

	do {
		if (!isNaN(el.offsetTop)) {
			offset.top += el.offsetTop;
		}

		if (!isNaN(el.offsetLeft)) {
			offset.left += el.offsetLeft;
		}
	} while (el = el.offsetParent);

	return offset;
}

/**
 * AddEventListener
 */
var allListeners = {};

function AddEventListener(el, type, fn) {
	if (!allListeners[el]) {
		allListeners[el] = {};
	}

	if (!allListeners[el][type]) {
		allListeners[el][type] = [];
	}

	allListeners[el][type].push(fn);

	el.addEventListener(type, fn);
}

/**
 * RemoveEventListener
 *
 * If not fn is specified, remove all listeners of type.
 */
function RemoveEventListener(el, type, fn) {
	var listeners = allListeners[el];
	if (!listeners) {
		return;
	}

	var listenersForType = listeners[type];
	if (!listenersForType) {
		return;
	}

	if (!fn) {
		for (var i = listenersForType.length - 1; i >= 0 ; i--) {
			el.removeEventListener(type, listenersForType[i]);
			listenersForType.splice(i, 1);
		}
	} else {
		el.removeEventListener(type, fn);

		var idx = listenersForType.indexOf(fn);
		if (idx !== -1) {
			listenersForType.splice(idx, 1);
		}
	}
}