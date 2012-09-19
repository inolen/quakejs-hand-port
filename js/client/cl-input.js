define('client/cl-input', [], function () {
	return function (re, bg) {
		var cl = this;
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
		var activeKeys = {};
		var lastPageX = 0;
		var lastPageY = 0;

		/**
		 * Key helpers
		 */
		function GetKey(keyName) {
			var keys = cl.keys;
			return keys[keyName] || (keys[keyName] = Object.create(cl.KeyState));
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
		function KeyDown(keyName) {
			var key = GetKey(keyName);

			// Some browsers repeat keydown events, we don't want that.
			if (key.active) return;

			key.active = true;
			key.downtime = Date().now;
			cl.ExecBinding(key);
		}

		function KeyUp(keyName) {
			var key = GetKey(keyName);
			key.active = false; // Partial frame summing
			key.partial += Date().now - key.downtime;
			cl.ExecBinding(key);
		}

		function MouseMove(dx, dy) {
			cl.cla.mouseX += dx;
			cl.cla.mouseY += dy;
		}

		/**
		 * System keyboard/mouse event handling.
		 */
		function SysKeyDownEvent(ev) {
			var keyName = GetKeyNameForKeyCode(ev.keyCode);
			KeyDown(keyName);
		}

		function SysKeyUpEvent(ev) {
			var keyName = GetKeyNameForKeyCode(ev.keyCode);
			KeyUp(keyName);
		}

		function SysMouseDownEvent(ev) {
			var keyName = GetKeyNameForMouseButton(ev.button);
			KeyDown(keyName);
		}

		function SysMouseUpEvent(ev) {
			var keyName = GetKeyNameForMouseButton(ev.button);
			KeyUp(keyName);
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

			MouseMove(deltaX, deltaY);
		}

		function InputInit() {
			// Initialize system bindings.
			var viewportFrame = document.getElementById('viewport-frame');
			document.addEventListener('keydown', function (ev) { SysKeyDownEvent(ev); });
			document.addEventListener('keyup', function (ev) { SysKeyUpEvent(ev); });
			viewportFrame.addEventListener('mousedown', function (ev) { SysMouseDownEvent(ev); });
			viewportFrame.addEventListener('mouseup', function (ev) { SysMouseUpEvent(ev); });
			viewportFrame.addEventListener('mousemove', function (ev) { SysMouseMoveEvent(ev); });

			cl.CmdAdd('+forward', function (key) { cl.forwardKey = key; });
			cl.CmdAdd('+left', function (key) { cl.leftKey = key; });
			cl.CmdAdd('+back', function (key) { cl.backKey = key; });
			cl.CmdAdd('+right', function (key) { cl.rightKey = key; });
			cl.Bind('w', '+forward');
			cl.Bind('a', '+left');
			cl.Bind('s', '+back');
			cl.Bind('d', '+right');
		}

		/**
		 * Process current input variables into userComamnd_t struct for transmission to server.
		 */
		function SendCommand() {
			var cmd = cl.CreateCommand();
			cl.NetSend(cl.ClcOps.clc_move, cmd);
		}

		function CreateCommand() {
			var cmd = Object.create(cl.UserCmd);
			cl.KeyMove(cmd);
			cl.MouseMove(cmd);
			return cmd;
		}

		function KeyMove(cmd) {
			var movespeed = 127;
			var forward = 0, side = 0, up = 0;

			if (cl.rightKey) side += movespeed * cl.GetKeyState(cl.rightKey);
			if (cl.leftKey) side -= movespeed * cl.GetKeyState(cl.leftKey);

			//up += movespeed * KeyState();
			//up -= movespeed * KeyState();

			if (cl.forwardKey) forward += movespeed * cl.GetKeyState(cl.forwardKey);
			if (cl.backKey) forward -= movespeed * cl.GetKeyState(cl.backKey);

			cmd.forwardmove = forward;
			cmd.rightmove = side;
			cmd.upmove = up;
		}

		function MouseMove(cmd) {
			var cla = cl.cla,
				oldAngles = cl.viewangles;

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

			var callback = cl.CmdGet(cmdToExec);
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
				msec += this.frameTime - key.downtime;
			}

			key.downtime = this.frameTime;

			var val = msec / this.frameDelta;
			if (val < 0) val = 0;
			if (val > 1) val = 1;
			return val;
		}

		return {
			InputInit: InputInit,
			SendCommand: SendCommand,
			CreateCommand: CreateCommand,
			KeyMove: KeyMove,
			MouseMove: MouseMove,
			ExecBinding: ExecBinding,
			Bind: Bind,
			Unbind: Unbind,
			GetKeyState: GetKeyState
		};
	};
});