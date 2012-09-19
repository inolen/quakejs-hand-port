var activeKeys = {};
var lastPageX = 0;
var lastPageY = 0;
var forwardKey, leftKey, backKey, rightKey;
var kbLocals = {
	'us': {
		'backspace': 8,
		'tab': 9,
		'enter': 13,
		'shift': 16,
		'ctrl': 17,
		'alt': 18,
		'pause': 19, 'break': 19,
		'capslock': 20,
		'escape': 27, 'esc': 27,
		'space': 32, 'spacebar': 32,
		'pageup': 33,
		'pagedown': 34,
		'end': 35,
		'home': 36,
		'left': 37,
		'up': 38,
		'right': 39,
		'down': 40,
		'insert': 45,
		'delete': 46,
		'0': 48, '1': 49, '2': 50, '3': 51, '4': 52, '5': 53, '6': 54, '7': 55, '8': 56, '9': 57,
		'a': 65, 'b': 66, 'c': 67, 'd': 68, 'e': 69, 'f': 70, 'g': 71, 'h': 72, 'i': 73, 'j': 74, 'k': 75, 'l': 76, 'm': 77, 'n': 78, 'o': 79, 'p': 80, 'q': 81, 'r': 82, 's': 83, 't': 84, 'u': 85, 'v': 86, 'w': 87, 'x': 88, 'y': 89, 'z': 90,
		'meta': 91, 'command': 91, 'windows': 91, 'win': 91,
		'_91': 92,
		'select': 93,
		'num0': 96, 'num1': 97, 'num2': 98, 'num3': 99, 'num4': 100, 'num5': 101, 'num6': 102, 'num7': 103, 'num8': 104, 'num9': 105,
		'multiply': 106,
		'add': 107,
		'subtract': 109,
		'decimal': 110,
		'divide': 111,
		'f1': 112, 'f2': 113, 'f3': 114, 'f4': 115, 'f5': 116, 'f6': 117, 'f7': 118, 'f8': 119, 'f9': 120, 'f10': 121, 'f11': 122, 'f12': 123,
		'numlock': 144, 'num': 144,
		'scrolllock': 145, 'scroll': 145,
		'semicolon': 186,
		'equal': 187, 'equalsign': 187,
		'comma': 188,
		'dash': 189,
		'period': 190,
		'slash': 191, 'forwardslash': 191,
		'graveaccent': 192,
		'openbracket': 219,
		'backslash': 220,
		'closebracket': 221,
		'singlequote': 222
	}
};

/**
 * Key helpers
 */
function GetKey(keyName) {
	return keys[keyName] || (keys[keyName] = Object.create(KeyState));
}

function GetKeyNameForKeyCode(keyCode) {
	var local = kbLocals['us'];

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
 * Process current input variables into userComamnd_t struct for transmission to server.
 */
function SendCommand() {
	var cmd = CreateCommand();
	NetSend(ClcOps.clc_move, cmd);
}

function CreateCommand() {
	var cmd = Object.create(UserCmd);
	KeyMove(cmd);
	MouseMove(cmd);
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

	cla.viewangles[1] += cla.mouseX * 0.0022;
	while (cla.viewangles[1] < 0)
			cla.viewangles[1] += Math.PI*2;
	while (cla.viewangles[1] >= Math.PI*2)
			cla.viewangles[1] -= Math.PI*2;

	cla.viewangles[0] += cla.mouseY * 0.0022;
	while (cla.viewangles[0] < -Math.PI*0.5)
			cla.viewangles[0] = -Math.PI*0.5;
	while (cla.viewangles[0] > Math.PI*0.5)
			cla.viewangles[0] = Math.PI*0.5;

	// reset
	cla.mouseX = 0;
	cla.mouseY = 0;

	cmd.angles = cla.viewangles;
}

/**
 * Key bindings
 */
function ExecBinding(key) {
	var cmdToExec = key.binding;

	if (!cmdToExec) return;
	if (!key.active && cmdToExec.charAt(0) === '+') cmdToExec = '-' + cmdToExec.substr(1);

	var callback = CmdGet(cmdToExec);
	if (callback) callback.call(this, key);
}

function Bind(keyName, cmd) {
	var key = GetKey(keyName);
	key.binding = cmd;
}

function Unbind(keyName, cmd) {
	delete key.binding;
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

function InputInit() {
	// Initialize system bindings.
	var viewportFrame = document.getElementById('viewport-frame');
	document.addEventListener('keydown', function (ev) { SysKeyDownEvent(ev); });
	document.addEventListener('keyup', function (ev) { SysKeyUpEvent(ev); });
	viewportFrame.addEventListener('mousedown', function (ev) { SysMouseDownEvent(ev); });
	viewportFrame.addEventListener('mouseup', function (ev) { SysMouseUpEvent(ev); });
	viewportFrame.addEventListener('mousemove', function (ev) { SysMouseMoveEvent(ev); });

	CmdAdd('+forward', function (key) { forwardKey = key; });
	CmdAdd('+left', function (key) { leftKey = key; });
	CmdAdd('+back', function (key) { backKey = key; });
	CmdAdd('+right', function (key) { rightKey = key; });
	Bind('w', '+forward');
	Bind('a', '+left');
	Bind('s', '+back');
	Bind('d', '+right');
}