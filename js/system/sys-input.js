function InputInit() {
	document.addEventListener('keydown', KeyDownEvent);
	document.addEventListener('keyup', KeyUpEvent);
	viewport.addEventListener('mousedown', MouseDownEvent);
	viewport.addEventListener('mouseup', MouseUpEvent);
	viewport.addEventListener('mousemove', MouseMoveEvent);
}

function GetKeyNameForKeyCode(keyCode) {
	var local = KbLocals['us'];

	for (var key in local) {
		if (!local.hasOwnProperty(key)) continue;
		if (local[key] == keyCode) return key;
	}
}

function GetKeyNameForMouseButton(button) {
	return 'mouse' + button;
}

function KeyDownEvent(ev) {
	var keyName = GetKeyNameForKeyCode(ev.keyCode);

	// Special check for fullscreen.
	if (ev.altKey && keyName == 'enter') {
		viewportFrame.requestFullscreen();
	}

	com.QueueEvent({ type: InputEventTypes.KEYDOWN, keyName: keyName });
}

function KeyUpEvent(ev) {
	var keyName = GetKeyNameForKeyCode(ev.keyCode);

	com.QueueEvent({ type: InputEventTypes.KEYUP, keyName: keyName });
}

function MouseDownEvent(ev) {
	var keyName = GetKeyNameForMouseButton(ev.button);

	if (!document.pointerLockElement) {
		viewport.requestPointerLock();
	}

	com.QueueEvent({ type: InputEventTypes.KEYDOWN, keyName: keyName });
}

function MouseUpEvent(ev) {
	var keyName = GetKeyNameForMouseButton(ev.button);

	com.QueueEvent({ type: InputEventTypes.KEYUP, keyName: keyName });
}

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

	com.QueueEvent({ type: InputEventTypes.MOUSEMOVE, deltaX: deltaX, deltaY: deltaY });
}