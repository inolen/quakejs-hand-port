/**
 * InputInit
 */
function InputInit() {
	// Listen to input on the parent frame, that way input from
	// both the game and the UI will bubble up and be handled.
	viewportFrame.addEventListener('keydown', KeyDownEvent);
	viewportFrame.addEventListener('keyup', KeyUpEvent);
	viewportFrame.addEventListener('mousedown', MouseDownEvent);
	viewportFrame.addEventListener('mouseup', MouseUpEvent);
	viewportFrame.addEventListener('mousewheel', MouseWheelEvent);
	viewportFrame.addEventListener('mousemove', MouseMoveEvent);
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
	}

	var keyName = GetKeyNameForKeyCode(ev.keyCode, ev.shiftKey);
	if (keyName === undefined) {
		return;
	}

	// Special check for fullscreen.
	if (ev.altKey && keyName == 'enter') {
		viewportFrame.requestFullscreen();
	}

	com.QueueEvent({ type: com.EventTypes.KEY, pressed: true, keyName: keyName });
}

/**
 * KeyUpEvent
 */
function KeyUpEvent(ev) {
	// Don't allow default handlers to run if we've locked the pointer.
	if (document.pointerLockElement) {
		ev.preventDefault();
	}

	var keyName = GetKeyNameForKeyCode(ev.keyCode);

	com.QueueEvent({ type: com.EventTypes.KEY, pressed: false, keyName: keyName });
}

/**
 * MouseDownEvent
 */
function MouseDownEvent(ev) {
	var keyName = GetKeyNameForMouseButton(ev.button);

	if (!document.pointerLockElement && ev.button === 0) {
		// Request the pointer lock.
		viewportFrame.requestPointerLock();

		// Enforce focus so we can capture keyboard input.
		viewportFrame.setAttribute('tabindex', '0');
		viewportFrame.focus();
		ev.preventDefault();
	}

	com.QueueEvent({ type: com.EventTypes.KEY, pressed: true, keyName: keyName });
}

/**
 * MouseUpEvent
 */
function MouseUpEvent(ev) {
	var keyName = GetKeyNameForMouseButton(ev.button);

	com.QueueEvent({ type: com.EventTypes.KEY, pressed: false, keyName: keyName });
}

/**
 * MouseWheelEvent
 */
function MouseWheelEvent(ev) {
	var keyName = ev.wheelDelta > 0 ? 'mwheelup' : 'mwheeldown';

	com.QueueEvent({ type: com.EventTypes.KEY, pressed: true, keyName: keyName });
	com.QueueEvent({ type: com.EventTypes.KEY, pressed: false, keyName: keyName });
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

	com.QueueEvent({ type: com.EventTypes.MOUSE, deltaX: deltaX, deltaY: deltaY });
}