/**
 * InputInit
 */
function InputInit() {
	viewport.addEventListener('keydown', KeyDownEvent);
	viewport.addEventListener('keyup', KeyUpEvent);
	viewport.addEventListener('mousedown', MouseDownEvent);
	viewport.addEventListener('mouseup', MouseUpEvent);
	viewport.addEventListener('mousemove', MouseMoveEvent);
}

/**
 * GetKeyNameForKeyCode
 */
function GetKeyNameForKeyCode(keyCode) {
	var local = KbLocals['us'];

	for (var key in local) {
		if (!local.hasOwnProperty(key)) continue;
		if (local[key] == keyCode) return key;
	}
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

	var keyName = GetKeyNameForKeyCode(ev.keyCode);

	// Special check for fullscreen.
	if (ev.altKey && keyName == 'enter') {
		viewportFrame.requestFullscreen();
	}

	com.QueueEvent({ type: com.EventTypes.KEYDOWN, keyName: keyName });
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

	com.QueueEvent({ type: com.EventTypes.KEYUP, keyName: keyName });
}

/**
 * MouseDownEvent
 */
function MouseDownEvent(ev) {
	var keyName = GetKeyNameForMouseButton(ev.button);

	if (!document.pointerLockElement && ev.button === 0) {
		viewport.requestPointerLock();
	}

	com.QueueEvent({ type: com.EventTypes.KEYDOWN, keyName: keyName });
}

/**
 * MouseUpEvent
 */
function MouseUpEvent(ev) {
	var keyName = GetKeyNameForMouseButton(ev.button);

	com.QueueEvent({ type: com.EventTypes.KEYUP, keyName: keyName });
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

	com.QueueEvent({ type: com.EventTypes.MOUSEMOVE, deltaX: deltaX, deltaY: deltaY });
}