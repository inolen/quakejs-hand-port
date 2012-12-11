/**
 * CaptureInput
 *
 * Enables another module to capture the client's input.
 */
function CaptureInput(keyCallback, mouseMoveCallback) {
	cls.keyCallback = keyCallback;
	cls.mouseMoveCallback = mouseMoveCallback;
}

/**
 * GetKey
 */
function GetKey(keyName) {
	var key = cls.keys[keyName];

	if (!key) {
		key = cls.keys[keyName] = new KeyState();
		key.chr = keyName;
	}

	return key;
}

/**
 * GetKeyNamesForCmd
 */
function GetKeyNamesForCmd(cmd) {
	var keys = [];
	
	for (var keyName in cls.keys) {
		if (!cls.keys.hasOwnProperty(keyName)) {
			continue;
		}

		var key = cls.keys[keyName];
		if (key.binding === cmd) {
			keys.push(keyName);
		}
	}

	return keys;
}

/**
 * KeyDownEvent
 */
function KeyDownEvent(time, keyName) {
	var key = GetKey(keyName);

	// Some browsers repeat keydown events, we don't want that.
	if (key.active) {
		return;
	}

	// Store the last key off (used by movement key handlers).
	cls.lastKey = key;

	if (keyName === '`' && clc.state == CA.ACTIVE) {
		if (!cls.keyCallback) {
			ui.PushMenu('ingame');
		} else {
			ui.PopAllMenus();
		}
		return;
	}

	// Distribute the key down event to the apropriate handler.
	if (cls.keyCallback) {
		cls.keyCallback(keyName);
	} else {
		key.downtime = time;
		key.active = true;
		key.wasPressed = true;

		ExecBinding(key, true);
	}
}

/**
 * KeyUpEvent
 */
function KeyUpEvent(time, keyName) {
	var key = GetKey(keyName);

	// Disable if the key input is now being captured.
	// Otherwise KeyState will return small values when queried.
	if (!cls.keyCallback) {
		key.partial += time - key.downtime; // Partial frame summing.
	}

	key.active = false;
	ExecBinding(key, false);
}

/**
 * MouseMoveEvent
 */
function MouseMoveEvent(time, dx, dy) {
	if (cls.mouseMoveCallback) {
		cls.mouseMoveCallback(dx, dy);
	} else {
		cl.mouseX += dx;
		cl.mouseY += dy;
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
		msec += com.frameTime - key.downtime;
	}

	key.downtime = com.frameTime;

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

	com.ExecuteBuffer(binding);
}

/**
 * WriteBindings
 */
function WriteBindings(str) {
	for (var keyName in cls.keys) {
		if (!cls.keys.hasOwnProperty(keyName)) {
			continue;
		}

		var key = GetKey(keyName);

		if (key.binding) {
			str += 'bind ' + keyName + ' \"' + key.binding + '\"\n';
		}
	}

	return str;
}