/**
 * InitInput
 */
function InitInput() {
	// Listen to input on the parent frame, that way input from
	// both the game and the UI will bubble up and be handled.
	viewportFrame.addEventListener('keydown', KeyDownEvent);
	viewportFrame.addEventListener('keyup', KeyUpEvent);
	viewportFrame.addEventListener('mousedown', MouseDownEvent);
	viewportFrame.addEventListener('mouseup', MouseUpEvent);
	viewportFrame.addEventListener('mousemove', MouseMoveEvent);
	viewportFrame.addEventListener('mousewheel', MouseWheelEvent);  // webkit
	viewportFrame.addEventListener('wheel', MouseWheelEvent);  // firefox
	viewportFrame.addEventListener('contextmenu', ContextMenuEvent);
}

/**
 * GetKeyNameForKeyCode
 */
function GetKeyNameForKeyCode(keyCode, shifted) {
	var local = KbLocals['us'];
	var chr = local['default'][keyCode];
	var shiftchr = local['shifted'][keyCode];

	if (shifted && shiftchr) {
		chr = shiftchr;
	}

	return chr;
}

/**
 * GetKeyNameForMouseButton
 */
function GetKeyNameForMouseButton(button) {
	return 'mouse' + button;
}

/**
 * KeyDownEvent
 */
function KeyDownEvent(ev) {
	// Don't allow default handlers to run if we've locked the pointer.
	if (document.pointerLockElement) {
		ev.preventDefault();
		ev.stopPropagation();
	}

	var keyName = GetKeyNameForKeyCode(ev.keyCode, ev.shiftKey);
	if (keyName === undefined) {
		return;
	}

	// Special check for fullscreen.
	if (ev.altKey && keyName == 'enter') {
		viewportFrame.requestFullScreen();
	}

	com.QueueEvent({ type: SE.KEY, pressed: true, keyName: keyName });
}

/**
 * KeyUpEvent
 */
function KeyUpEvent(ev) {
	// Don't allow default handlers to run if we've locked the pointer.
	if (document.pointerLockElement) {
		ev.preventDefault();
		ev.stopPropagation();
	}

	var keyName = GetKeyNameForKeyCode(ev.keyCode);

	com.QueueEvent({ type: SE.KEY, pressed: false, keyName: keyName });
}

/**
 * MouseDownEvent
 */
function MouseDownEvent(ev) {
	if (document.pointerLockElement) {
		ev.preventDefault();
		ev.stopPropagation();
	} else if (!document.pointerLockElement && ev.button === 0) {
		// Request the pointer lock.
		viewportFrame.requestPointerLock();

		// Enforce focus so we can capture keyboard input.
		viewportFrame.setAttribute('tabindex', '0');
		viewportFrame.focus();
		ev.preventDefault();
		ev.stopPropagation();
	}

	var keyName = GetKeyNameForMouseButton(ev.button);

	com.QueueEvent({ type: SE.KEY, pressed: true, keyName: keyName });
}

/**
 * MouseUpEvent
 */
function MouseUpEvent(ev) {
	if (document.pointerLockElement) {
		ev.preventDefault();
		ev.stopPropagation();
	}

	var keyName = GetKeyNameForMouseButton(ev.button);

	com.QueueEvent({ type: SE.KEY, pressed: false, keyName: keyName });
}

/**
 * MouseMoveEvent
 */
var lastPageX = 0;
var lastPageY = 0;
function MouseMoveEvent(ev) {
	var deltaX, deltaY;

	if (document.pointerLockElement) {
		deltaX = ev.movementX;
		deltaY = ev.movementY;
	} else {
		deltaX = ev.pageX - lastPageX;
		deltaY = ev.pageY - lastPageY;
		lastPageX = ev.pageX;
		lastPageY = ev.pageY;
	}

	com.QueueEvent({ type: SE.MOUSE, deltaX: deltaX, deltaY: deltaY });
}

/**
 * MouseWheelEvent
 */
function MouseWheelEvent(ev) {
	if (document.pointerLockElement) {
		ev.preventDefault();
		ev.stopPropagation();
	}

	var mousedown = ev.wheelDelta !== undefined ? ev.wheelDelta < 0 : ev.deltaY > 0;
	var keyName = mousedown ? 'mwheeldown' : 'mwheelup';

	com.QueueEvent({ type: SE.KEY, pressed: true, keyName: keyName });
	com.QueueEvent({ type: SE.KEY, pressed: false, keyName: keyName });
}

/**
 * ContextMenuEvent
 *
 * Firefox only, disable context menus when in fullscreen.
 */
function ContextMenuEvent(ev) {
	if (document.pointerLockElement) {
		ev.preventDefault();
		ev.stopPropagation();
	}
}