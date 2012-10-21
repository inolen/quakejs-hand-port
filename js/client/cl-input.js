var activeKeys = {};
var forwardKey, leftKey, backKey, rightKey, upKey;

/**
 * InitInput
 */
function InitInput() {
	com.AddCmd('+forward', function (key) { forwardKey = key; });
	com.AddCmd('+left', function (key) { leftKey = key; });
	com.AddCmd('+back', function (key) { backKey = key; });
	com.AddCmd('+right', function (key) { rightKey = key; });
	com.AddCmd('+jump', function (key) { upKey = key; });

	// TODO move to config file
	Bind('w', '+forward');
	Bind('a', '+left');
	Bind('s', '+back');
	Bind('d', '+right');
	Bind('space', '+jump');
	Bind('tab', '+scores');
}

/**
 * CaptureInput
 *
 * Enables another module to capture the client's input.
 */
function CaptureInput(keyCallback, mouseMoveCallback) {
	cl.keyCallback = keyCallback;
	cl.mouseMoveCallback = mouseMoveCallback;
}

/**********************************************************
 *
 * Abstracted key/mouse event handling.
 *
 **********************************************************/

/**
 * GetKey
 */
function GetKey(keyName) {
	var key = keys[keyName];

	if (!key) {
		key = keys[keyName] = new KeyState();
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
		if (!cl.keyCallback) {
			ui.SetActiveMenu('ingame');
		} else {
			ui.CloseActiveMenu();
		}
		return;
	}

	// Distribute the key down event to the apropriate handler.
	if (cl.keyCallback) {
		cl.keyCallback(keyName);
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
	if (!cl.keyCallback) {
		key.partial += time - key.downtime; // Partial frame summing.
	}

	key.active = false;
	ExecBinding(key);
}

/**
 * MouseMoveEvent
 */
function MouseMoveEvent(time, dx, dy) {
	if (cl.mouseMoveCallback) {
		cl.mouseMoveCallback(dx, dy);
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

/**********************************************************
 *
 * Key bindings
 *
 **********************************************************/

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
 * Bind
 */
function Bind(keyName, cmd) {
	var key = GetKey(keyName);
	key.binding = cmd;
}

/**
 * Unbind
 */
function Unbind(keyName, cmd) {
	delete key.binding;
}