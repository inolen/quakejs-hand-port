var keys = {};

/**
 * CaptureInput
 *
 * Enables another module to capture the client's input.
 */
function CaptureInput(callbacks) {
	cls.keyDownCallback = callbacks.keydown;
	cls.keyUpCallback = callbacks.keyup;
	cls.keyPressCallback = callbacks.keypress;
	cls.mouseMoveCallback = callbacks.mousemove;
}

/**
 * GetKey
 */
function GetKey(keyName) {
	// Force lower-case.
	keyName = keyName.toLowerCase();

	var key = keys[keyName];

	if (!key) {
		key = keys[keyName] = new KeyState();
		key.chr = keyName;
	}

	return key;
}

/**
 * GetKeyNamesForCmd
 */
function GetKeyNamesForCmd(cmd) {
	var keyNames = [];

	for (var keyName in keys) {
		if (!keys.hasOwnProperty(keyName)) {
			continue;
		}

		var key = keys[keyName];
		if (key.binding === cmd) {
			keyNames.push(keyName);
		}
	}

	return keyNames;
}

/**
 * KeyDownEvent
 */
function KeyDownEvent(ev) {
	var key = GetKey(ev.key);

	// Some browsers repeat keydown events, we don't want that.
	if (key.active) {
		return;
	}

	// Store the last key off (used by movement key handlers).
	cls.lastKey = key;

	if (ev.key === '`') {
		if (clc.state == CA.ACTIVE) {
			if (ev.shiftKey) {
				ToggleConsole();
			} else {
				CG.ToggleGameMenu();
			}
		}

		return;
	}

	// Distribute the key down event to the apropriate handler.
	if (cls.keyDownCallback) {
		cls.keyDownCallback(ev);
	} else {
		key.downtime = ev.time;
		key.active = true;
		key.wasPressed = true;

		ExecBinding(key, true);
	}
}

/**
 * KeyUpEvent
 */
function KeyUpEvent(ev) {
	var key = GetKey(ev.key);

	if (cls.keyUpCallback) {
		cls.keyUpCallback(ev);
	}

	// We want to allow keyup events to trigger for keys that were
	// pressed before the keyCallback was set. However, after
	// they've triggered once don't trigger again.
	if (!key.active) {
		return;
	}

	key.partial += ev.time - key.downtime; // Partial frame summing.
	key.active = false;
	ExecBinding(key, false);
}

/**
 * KeyPressEvent
 *
 * Normal keyboard characters, already shifted / capslocked / etc.
 */
function KeyPressEvent(ev) {
	if (ev.char === '`' || ev.char === '~') {
		return;
	}

	if (cls.keyPressCallback) {
		cls.keyPressCallback(ev);
	}
}

/**
 * MouseMoveEvent
 */
function MouseMoveEvent(ev) {
	if (cls.mouseMoveCallback) {
		cls.mouseMoveCallback(ev);
	} else {
		cl.mouseX[cl.mouseIndex] += ev.deltaX;
		cl.mouseY[cl.mouseIndex] += ev.deltaY;
	}
}

/**
 * GetKeyState
 *
 * Returns the fraction of the frame the input was down.
 */
function GetKeyState(key) {
	var msec = key.partial;
	key.partial = 0;

	if (key.active) {
		msec += COM.frameTime - key.downtime;
	}

	key.downtime = COM.frameTime;

	var val = msec / cls.frameDelta;
	if (val < 0) val = 0;
	if (val > 1) val = 1;
	return val;
}

/**
 * ExecBinding
 */
function ExecBinding(key, pressed) {
	var binding = key.binding;

	if (!binding) {
		return;
	}

	if (!pressed) {
		if (binding.charAt(0) === '+') {
			binding = '-' + binding.substr(1);
		} else {
			// Don't execute non +/- cmds on KeyUp.
			return;
		}
	}

	COM.ExecuteBuffer(binding);
}

/**
 * WriteBindings
 */
function WriteBindings(str) {
	for (var keyName in keys) {
		if (!keys.hasOwnProperty(keyName)) {
			continue;
		}

		var key = GetKey(keyName);

		if (key.binding) {
			str += 'bind ' + keyName + ' \"' + key.binding + '\"\n';
		}
	}

	return str;
}