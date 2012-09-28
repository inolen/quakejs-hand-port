var activeKeys = {};
var lastPageX = 0;
var lastPageY = 0;
var forwardKey, leftKey, backKey, rightKey, upKey;

function InputInit() {
	document.addEventListener('keydown', function (ev) { SysKeyDownEvent(ev); });
	document.addEventListener('keyup', function (ev) { SysKeyUpEvent(ev); });
	canvas.addEventListener('mousedown', function (ev) { SysMouseDownEvent(ev); });
	canvas.addEventListener('mouseup', function (ev) { SysMouseUpEvent(ev); });
	canvas.addEventListener('mousemove', function (ev) { SysMouseMoveEvent(ev); });
	canvas.addEventListener('click', function(event) {
		canvas.requestPointerLock();
	}, false);

	com.CmdAdd('+forward', function (key) { forwardKey = key; });
	com.CmdAdd('+left', function (key) { leftKey = key; });
	com.CmdAdd('+back', function (key) { backKey = key; });
	com.CmdAdd('+right', function (key) { rightKey = key; });
	com.CmdAdd('+jump', function (key) { upKey = key; });

	Bind('w', '+forward');
	Bind('a', '+left');
	Bind('s', '+back');
	Bind('d', '+right');
	Bind('space', '+jump');
}

/**
 * Process current input variables into userComamnd_t struct for transmission to server.
 */
function SendCommand() {
	var cmd = CreateCommand();

	var clop = new Net.ClientOp();
	clop.type = Net.ClientOp.Type.move;
	clop.clop_move = cmd;

	NetSend(clop);
}

function CreateCommand() {
	var cmd = new Net.ClientOp_UserCmd();

	KeyMove(cmd);
	MouseMove(cmd);

	// send the current server time so the amount of movement
	// can be determined without allowing cheating
	cmd.serverTime = cl.serverTime;

	return cmd;
}

// TODO Move somewhere generic
function ClampChar(i) {
	if ( i < -128 ) {
		return -128;
	}
	if ( i > 127 ) {
		return 127;
	}
	return i;
}

function KeyMove(cmd) {
	var movespeed = 127;
	var forward = 0, side = 0, up = 0;

	if (rightKey) side += movespeed * GetKeyState(rightKey);
	if (leftKey) side -= movespeed * GetKeyState(leftKey);

	if (upKey) up += movespeed * GetKeyState(upKey);
	if (upKey) up -= movespeed * GetKeyState(upKey);

	if (forwardKey) forward += movespeed * GetKeyState(forwardKey);
	if (backKey) forward -= movespeed * GetKeyState(backKey);

	cmd.forwardmove = ClampChar(forward);
	cmd.rightmove = ClampChar(side);
	cmd.upmove = ClampChar(up);
}

function MouseMove(cmd) {
	var oldAngles = cl.viewangles;
	var sensitivity = com.CvarGet('cl_sensitivity');
	var mx = cl.mouseX * sensitivity;
	var my = cl.mouseY * sensitivity;

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

	cmd.angles.push(cl.viewangles[0]);
	cmd.angles.push(cl.viewangles[1]);
	cmd.angles.push(cl.viewangles[2]);
}

/**
 * Key helpers
 */
function GetKey(keyName) {
	return keys[keyName] || (keys[keyName] = Object.create(KeyState));
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

/**
 * Abstracted key/mouse event handling.
 */
function KeyDownEvent(keyName) {
	var key = GetKey(keyName);

	// Some browsers repeat keydown events, we don't want that.
	if (key.active) return;

	key.active = true;
	key.downtime = sys.GetMilliseconds();
	ExecBinding(key);
}

function KeyUpEvent(keyName) {
	var key = GetKey(keyName);
	key.active = false; // Partial frame summing
	key.partial += sys.GetMilliseconds() - key.downtime;
	ExecBinding(key);
}

function MouseMoveEvent(dx, dy) {
	cl.mouseX += dx;
	cl.mouseY += dy;
}

/**
 * System keyboard/mouse event handling.
 */
function SysKeyDownEvent(ev) {
	var keyName = GetKeyNameForKeyCode(ev.keyCode);

	// Special check for fullscreen.
	if (ev.altKey && keyName == 'enter') {
		canvas.requestFullscreen();
	}

	KeyDownEvent(keyName);
}

function SysKeyUpEvent(ev) {
	var keyName = GetKeyNameForKeyCode(ev.keyCode);
	KeyUpEvent(keyName);
}

function SysMouseDownEvent(ev) {
	var keyName = GetKeyNameForMouseButton(ev.button);
	KeyDownEvent(keyName);
}

function SysMouseUpEvent(ev) {
	var keyName = GetKeyNameForMouseButton(ev.button);
	KeyUpEvent(keyName);
}

function SysMouseMoveEvent(ev) {
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

	MouseMoveEvent(deltaX, deltaY);
}

/**
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
 * Key bindings
 */
function ExecBinding(key) {
	var cmdToExec = key.binding;

	if (!cmdToExec) return;
	if (!key.active && cmdToExec.charAt(0) === '+') cmdToExec = '-' + cmdToExec.substr(1);

	var callback = com.CmdGet(cmdToExec);
	if (callback) callback.call(this, key);
}

function Bind(keyName, cmd) {
	var key = GetKey(keyName);
	key.binding = cmd;
}

function Unbind(keyName, cmd) {
	delete key.binding;
}