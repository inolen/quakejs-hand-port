var activeKeys = {};
var lastPageX = 0;
var lastPageY = 0;
var forwardKey, leftKey, backKey, rightKey;

function InputInit() {
	// Initialize system bindings.
	var viewportFrame = document.getElementById('viewport-frame');
	document.addEventListener('keydown', function (ev) { SysKeyDownEvent(ev); });
	document.addEventListener('keyup', function (ev) { SysKeyUpEvent(ev); });
	viewportFrame.addEventListener('mousedown', function (ev) { SysMouseDownEvent(ev); });
	viewportFrame.addEventListener('mouseup', function (ev) { SysMouseUpEvent(ev); });
	viewportFrame.addEventListener('mousemove', function (ev) { SysMouseMoveEvent(ev); });

	com.CmdAdd('+forward', function (key) { forwardKey = key; });
	com.CmdAdd('+left', function (key) { leftKey = key; });
	com.CmdAdd('+back', function (key) { backKey = key; });
	com.CmdAdd('+right', function (key) { rightKey = key; });
	Bind('w', '+forward');
	Bind('a', '+left');
	Bind('s', '+back');
	Bind('d', '+right');
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
	cmd.serverTime = cla.serverTime;

	return cmd;
}

function KeyMove(cmd) {
	var movespeed = 127;
	var forward = 0, side = 0, up = 0;

	if (rightKey) side += movespeed * GetKeyState(rightKey);
	if (leftKey) side -= movespeed * GetKeyState(leftKey);

	//up += movespeed * KeyState();
	//up -= movespeed * KeyState();

	if (forwardKey) forward += movespeed * GetKeyState(forwardKey);
	if (backKey) forward -= movespeed * GetKeyState(backKey);

	cmd.forwardmove = forward;
	cmd.rightmove = side;
	cmd.upmove = up;
}

function MouseMove(cmd) {
	var oldAngles = cla.viewangles;

	cla.viewangles[YAW] -= cla.mouseX * 0.022;
	cla.viewangles[PITCH] += cla.mouseY * 0.022;

	if (cla.viewangles[PITCH] - oldAngles[PITCH] > 90) {
		cla.viewangles[PITCH] = oldAngles[PITCH] + 90;
	} else if (oldAngles[PITCH] - cla.viewangles[PITCH] > 90) {
		cla.viewangles[PITCH] = oldAngles[PITCH] - 90;
	}

	// reset
	cla.mouseX = 0;
	cla.mouseY = 0;

	cmd.angles.push(cla.viewangles[0]);
	cmd.angles.push(cla.viewangles[1]);
	cmd.angles.push(cla.viewangles[2]);
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
	key.downtime = Date().now;
	ExecBinding(key);
}

function KeyUpEvent(keyName) {
	var key = GetKey(keyName);
	key.active = false; // Partial frame summing
	key.partial += Date().now - key.downtime;
	ExecBinding(key);
}

function MouseMoveEvent(dx, dy) {
	cla.mouseX += dx;
	cla.mouseY += dy;
}

/**
 * System keyboard/mouse event handling.
 */
function SysKeyDownEvent(ev) {
	var keyName = GetKeyNameForKeyCode(ev.keyCode);
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
		msec += frameTime - key.downtime;
	}

	key.downtime = frameTime;

	var val = msec / frameDelta;
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