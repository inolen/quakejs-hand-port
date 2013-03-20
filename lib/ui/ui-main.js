var SYS = imp.SYS;
var CL  = imp.CL;
var uil;

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
	log('Initializing UI');

	uil = new UILocals();

	document.addEventListener('fullscreenchange', ScaleElements);
	window.addEventListener('resize', ScaleElements);

	// Reset the UI container.
	uil.viewport = SYS.GetUIContext();
	uil.viewport.innerHTML = '';
	ScaleElements();

	// Embed our CSS.
	for (var i = 0; i < css.length; i++) {
		var frag = document.createElement('style');
		frag.setAttribute('type', 'text/css');
		frag.innerHTML = css[i];

		var style = document.getElementsByTagName('head')[0].appendChild(frag);
		uil.styles.push(style);
	}

	//
	InitImages();
	InitViews();

	RegisterDOMHooks();

	callback(null);
}

/**
 * Shutdown
 */
function Shutdown(callback) {
	log('Shutdown UI');

	RemoveDOMHooks();

	ClearViews();

	uil.viewport.innerHTML = '';

	// Remove our CSS.
	for (var i = 0; i < uil.styles.length; i++) {
		var style = uil.styles[i];
		style.parentNode.removeChild(style);
	}

	// TODO Kill any pending image deferreds.

	callback(null);
}

/**
 * ScaleElements
 *
 * Update cached viewport sizes as well as font-sizes for all views
 * on window resize.
 */
function ScaleElements() {
	uil.vw = uil.viewport.offsetWidth;
	uil.vh = uil.viewport.offsetHeight;

	uil.viewport.style.fontSize = (uil.vw / 100) + 'px';
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
		if (!DOM.containsElement(uil.viewport, this)) {
			originalBlur.apply(this);
			return;
		}

		ClearFocusedElement();
	};

	HTMLElement.prototype.focus = function () {
		if (!DOM.containsElement(uil.viewport, this)) {
			originalFocus.apply(this);
			return;
		}

		FocusElement(this);
	};

	// If a mousedown event has bubbled up, focus on the element.
	uil.viewport.addEventListener('mousedown', MouseDownEvent);

	// Don't allow the events we simulate here to bubble back up to
	// the system level handlers, causing duplicate input.
	uil.viewport.addEventListener('mousedown', KillEvent);
	uil.viewport.addEventListener('mouseup', KillEvent);
	uil.viewport.addEventListener('wheel', KillEvent);
	uil.viewport.addEventListener('click', KillEvent);
	uil.viewport.addEventListener('keydown', KillEvent);
	uil.viewport.addEventListener('keyup', KillEvent);
	uil.viewport.addEventListener('keypress', KillEvent);
}

/**
 * RemoveDOMHooks
 */
function RemoveDOMHooks() {
	HTMLElement.prototype.blur = originalBlur;
	HTMLElement.prototype.focus = originalFocus;

	uil.viewport.removeEventListener('mousedown', MouseDownEvent);

	uil.viewport.removeEventListener('mousedown', KillEvent);
	uil.viewport.removeEventListener('mouseup', KillEvent);
	uil.viewport.removeEventListener('wheel', KillEvent);
	uil.viewport.removeEventListener('click', KillEvent);
	uil.viewport.removeEventListener('keydown', KillEvent);
	uil.viewport.removeEventListener('keyup', KillEvent);
	uil.viewport.removeEventListener('keypress', KillEvent);
}

/**
 * KillEvent
 */
function KillEvent(ev) {
	ev.preventDefault();
	ev.stopPropagation();
}

/**
 * MouseDownEvent
 */
function MouseDownEvent(ev) {
	ev.target.focus();
}

/**
 * PopMenuEvent
 */
function PopMenuEvent(ev) {
	PopMenu();
}

/**
 * KeyDownEvent
 */
function KeyDownEvent(ev) {
	var keyName = ev.key;

	// Simulate mouse events for mouse keys.
	if (uil.hoverEls) {
		var bottomMost = uil.hoverEls[0];

		if (keyName.indexOf('mouse') === 0) {
			var offset = DOM.documentOffset(bottomMost);
			var screenX = uil.mx;
			var screenY = uil.my;
			var clientX = uil.mx - offset.left;
			var clientY = uil.my - offset.top;
			var button = parseInt(keyName.substr(5), 10);

			// Trigger mouseup / mouse down event.
			var ev = document.createEvent('MouseEvent');
			ev.initMouseEvent('mousedown',
				true, true, window, 0, screenX, screenY, clientX, clientY,
				0, 0, 0, 0, button, bottomMost);
			bottomMost.dispatchEvent(ev);

			// Trigger a click event after mouseup.
			ev = document.createEvent('MouseEvent');
			ev.initMouseEvent('click',
				true, true, window, 0, screenX, screenY, clientX, clientY,
				0, 0, 0, 0, button, bottomMost);
			bottomMost.dispatchEvent(ev);
			return;
		}
		else if (keyName.indexOf('mwheel') === 0) {
			var delta = keyName === 'mwheeldown' ? 1 : -1
			// Pass both wheelDeltaY (WebKit) and deltaY (Gecko)
			var ev = new WheelEvent('wheel', {
				bubbles: true,
				wheelDeltaY: delta,
				deltaY: delta
			});
			bottomMost.dispatchEvent(ev);
			return;
		}
	}

	if (uil.focusEl) {
		var kbev = new KeyboardEvent('keydown', {
			bubbles: true,
			key: ev.key,
			altKey: ev.altKey,
			ctrlKey: ev.ctrlKey,
			metaKey: ev.metaKey,
			shiftKey: ev.shiftKey
		});

		uil.focusEl.dispatchEvent(kbev);
	}
}

/**
 * KeyUpEvent
 */
function KeyUpEvent(ev) {
	var keyName = ev.key;

	// Simulate mouseup events for mouse keys.
	if (uil.hoverEls && keyName.indexOf('mouse') === 0) {
		var bottomMost = uil.hoverEls[0];

		var offset = DOM.documentOffset(bottomMost);
		var screenX = uil.mx;
		var screenY = uil.my;
		var clientX = uil.mx - offset.left;
		var clientY = uil.my - offset.top;
		var button = parseInt(keyName.substr(5), 10);

		// Trigger mouseup / mouse down event.
		var ev = document.createEvent('MouseEvent');
		ev.initMouseEvent('mouseup',
			true, true, window, 0, screenX, screenY, clientX, clientY,
			0, 0, 0, 0, button, bottomMost);
		bottomMost.dispatchEvent(ev);

		return;
	}

	if (uil.focusEl) {
		var kbev = new KeyboardEvent('keyup', {
			bubbles: true,
			key: ev.key,
			altKey: ev.altKey,
			ctrlKey: ev.ctrlKey,
			metaKey: ev.metaKey,
			shiftKey: ev.shiftKey
		});

		uil.focusEl.dispatchEvent(kbev);
	}
}

/**
 * KeyPressEvent
 */
function KeyPressEvent(ev) {
	if (uil.focusEl) {
		var kbev = new KeyboardEvent('keypress', {
			bubbles: true,
			char: ev.char
		});

		uil.focusEl.dispatchEvent(kbev);
	}
}

/**
 * MouseMoveEvent
 */
function MouseMoveEvent(ev) {
	var dx = ev.deltaX;
	var dy = ev.deltaY;

	uil.mx += dx;
	uil.my += dy;

	// Clamp to viewport width/height.
	uil.mx = Math.max(0, Math.min(uil.mx, uil.vw));
	uil.my = Math.max(0, Math.min(uil.my, uil.vh));

	// Update pointer element.
	uil.ptr.style.top = uil.my + 'px';
	uil.ptr.style.left = uil.mx + 'px';

	// Simulate browser by adding/removing hover classes.
	UpdateHoverElements();
}

/**
 * UpdateHoverElements
 */
function UpdateHoverElements() {
	var els = DOM.getAllElementsAtPoint(uil.viewport, uil.mx, uil.my);

	// Trigger mouseleave events.
	if (uil.hoverEls) {
		for (var i = 0; i < uil.hoverEls.length; i++) {
			var oldel = uil.hoverEls[i];

			if (!els || els.indexOf(oldel) === -1) {
				DOM.removeClass(oldel, 'hover');

				var ev = document.createEvent('MouseEvent');
				ev.initMouseEvent('mouseleave',
					true, true, window, 0, 0, 0, 0, 0,
					0, 0, 0, 0, 0, oldel);
				oldel.dispatchEvent(ev);
			}
		}
	}

	// Trigger mouseenter events.
	if (els) {
		for (var i = 0; i < els.length; i++) {
			var newel = els[i];

			if (!uil.hoverEls || uil.hoverEls.indexOf(newel) === -1) {
				DOM.addClass(newel, 'hover');

				var ev = document.createEvent('MouseEvent');
				ev.initMouseEvent('mouseenter',
					true, true, window, 0, 0, 0, 0, 0,
					0, 0, 0, 0, 0, newel);
				newel.dispatchEvent(ev);
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
		DOM.removeClass(uil.hoverEls[i], 'hover');
	}

	uil.hoverEls = null;
}

/**
 * FocusElement
 */
function FocusElement(el) {
	if (!arguments.length) {
		return el;
	}

	if (uil.focusEl === el) {
		return;
	}

	ClearFocusedElement();

	if (!el) {
		return;
	}

	uil.focusEl = el;

	DOM.addClass(uil.focusEl, 'focus');

	var ev = document.createEvent('Event');
	ev.initEvent('focus', false, false);
	el.dispatchEvent(ev);
}

/**
 * ClearFocusedElement
 */
function ClearFocusedElement() {
	var el = uil.focusEl;
	if (!el) {
		return;
	}

	DOM.removeClass(uil.focusEl, 'focus');
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
 * Util functions
 *
 **********************************************************/

/**
 * Colorize
 */
var colors = ['black', 'red', 'green', 'yellow', 'blue', 'cyan', 'pink', 'white'];

function Colorize(text) {
	return text.replace(/\^(\d)(.*?)(?=\^|$)/g, function (match, color, text) {
		return '<span class="' + colors[color] + '">' + text + '</span>';
	});
}

/**
 * PrettyPrint
 */
function PrettyPrint(text) {
	if (!text) {
		return text;
	}

	text = text.replace(/\n/g, '<br>');
	return Colorize(text);
}

/**
 * GetPublicExports
 */
function GetPublicExports() {
	return {
		Init:                Init,
		Shutdown:            Shutdown,
		CreateView:          CreateView,
		RemoveView:          RemoveView,
		ViewIsValid:         ViewIsValid,
		ClearViews:          ClearViews,
		RegisterImage:       RegisterImage,

		ConnectingModel:     ConnectingModel,
		ConnectingTemplate:  ConnectingTemplate,
		ConsoleModel:        ConsoleModel,
		ConsoleTemplate:     ConsoleTemplate,
		CurrentGameModel:    CurrentGameModel,
		CurrentGameTemplate: CurrentGameTemplate,
		DefaultModel:        DefaultModel,
		DefaultTemplate:     DefaultTemplate,
		HudModel:            HudModel,
		HudTemplate:         HudTemplate,
		LoadingModel:        LoadingModel,
		LoadingTemplate:     LoadingTemplate,
		MessageModel:        MessageModel,
		MessageTemplate:     MessageTemplate,
		ScoreboardModel:     ScoreboardModel,
		ScoreboardTemplate:  ScoreboardTemplate,
		SettingsModel:       SettingsModel,
		SettingsTemplate:    SettingsTemplate,
		TabModel:            TabModel,
		TabTemplate:         TabTemplate
	};
}