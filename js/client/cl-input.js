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
 * KeyMove
 */
function KeyMove(cmd) {
	var movespeed = 127;
	var forward = 0, side = 0, up = 0;

	if (forwardKey) forward += movespeed * GetKeyState(forwardKey);
	if (backKey) forward -= movespeed * GetKeyState(backKey);

	if (rightKey) side += movespeed * GetKeyState(rightKey);
	if (leftKey) side -= movespeed * GetKeyState(leftKey);

	if (upKey) { var foobar = GetKeyState(upKey); up += movespeed * foobar; }
	//if (upKey) up -= movespeed * GetKeyState(upKey);

	cmd.forwardmove = ClampChar(forward);
	cmd.rightmove = ClampChar(side);
	cmd.upmove = up;
}

/**
 * MouseMove
 */
function MouseMove(cmd) {
	var oldAngles = vec3.create(cl.viewangles);
	var mx = cl.mouseX * cl_sensitivity();
	var my = cl.mouseY * cl_sensitivity();

	cl.viewangles[YAW] -= mx * 0.022;
	cl.viewangles[PITCH] += my * 0.022;

	if (cl.viewangles[PITCH] - oldAngles[PITCH] > 90) {
		cl.viewangles[PITCH] = oldAngles[PITCH] + 90;
	} else if (oldAngles[PITCH] - cl.viewangles[PITCH] > 90) {
		cl.viewangles[PITCH] = oldAngles[PITCH] - 90;
	}

	// reset
	cl.mouseX = 0;
	cl.mouseY = 0;

	cmd.angles[0] = AngleToShort(cl.viewangles[0]);
	cmd.angles[1] = AngleToShort(cl.viewangles[1]);
	cmd.angles[2] = AngleToShort(cl.viewangles[2]);
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
	return keys[keyName] || (keys[keyName] = new KeyState());
}

/**
 * KeyDownEvent
 */
function KeyDownEvent(time, keyName) {
	var key = GetKey(keyName);

	// Some browsers repeat keydown events, we don't want that.
	if (key.active) return;

	key.active = true;
	key.downtime = time;
	ExecBinding(key);
}

/**
 * KeyUpEvent
 */
function KeyUpEvent(time, keyName) {
	var key = GetKey(keyName);
	key.active = false;
	// Partial frame summing.
	key.partial += time - key.downtime;
	ExecBinding(key);
}

/**
 * MouseMoveEvent
 */
function MouseMoveEvent(time, dx, dy) {
	cl.mouseX += dx;
	cl.mouseY += dy;
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