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

	// Special check for fullscreen.
	if (ev.altKey && ev.key == 'Enter') {
		viewportFrame.requestFullScreen();
	}

	COM.QueueEvent(COM.SE.KEYDOWN, {
		key:      ev.key,
		altKey:   ev.altKey,
		ctrlKey:  ev.ctrlKey,
		metaKey:  ev.metaKey,
		shiftKey: ev.shiftKey
	});

	if (ev.char) {
		COM.QueueEvent(COM.SE.CHAR, {
			char: ev.char
		});
	}
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

	COM.QueueEvent(COM.SE.KEYUP, {
		key:      ev.key,
		altKey:   ev.altKey,
		ctrlKey:  ev.ctrlKey,
		metaKey:  ev.metaKey,
		shiftKey: ev.shiftKey
	});
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

	COM.QueueEvent(COM.SE.KEYDOWN, { key: keyName });
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

	COM.QueueEvent(COM.SE.KEYUP, { key: keyName });
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

	COM.QueueEvent(COM.SE.MOUSE, { deltaX: deltaX, deltaY: deltaY });
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

	COM.QueueEvent(COM.SE.KEYDOWN, { key: keyName });
	COM.QueueEvent(COM.SE.KEYUP, { key: keyName });
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