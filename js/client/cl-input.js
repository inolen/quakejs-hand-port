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
 * KeyDownEvent
 */
function KeyDownEvent(time, keyName) {
	var key = GetKey(keyName);

	// Some browsers repeat keydown events, we don't want that.
	if (key.active) return;

	if (keyName === 'graveaccent') {
		if (!cls.keyCallback) {
			ui.SetActiveMenu('ingame');
		} else {
			ui.CloseActiveMenu();
		}
		return;
	}

	// Distribute the key down event to the apropriate handler.
	if (cls.keyCallback) {
		cls.keyCallback(keyName);
	} else {
		key.downtime = time;
		key.active = true;

		ExecBinding(key);
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
	ExecBinding(key);
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
		msec += cls.frameTime - key.downtime;
	}

	key.downtime = cls.frameTime;

	var val = msec / cls.frameDelta;
	if (val < 0) val = 0;
	if (val > 1) val = 1;
	return val;
}

/**
 * ExecBinding
 */
function ExecBinding(key) {
	var cmdToExec = key.binding;

	if (!cmdToExec) return;
	if (!key.active && cmdToExec.charAt(0) === '+') cmdToExec = '-' + cmdToExec.substr(1);

	var callback = com.GetCmd(cmdToExec);
	if (callback) callback.call(this, key);
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
			str += 'bind ' + keyName + ' ' + key.binding + '\n';
		}
	}

	return str;
}