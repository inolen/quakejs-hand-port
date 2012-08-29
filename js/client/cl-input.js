(function(q3w) {
	q3w.Cl_InitInput = function () {
		q3w.Cl_AddCommand('+forward', function (key) { q3w.forwardKey = key; });
		q3w.Cl_AddCommand('+left', function (key) { q3w.leftKey = key; });
		q3w.Cl_AddCommand('+back', function (key) { q3w.backKey = key; });
		q3w.Cl_AddCommand('+right', function (key) { q3w.rightKey = key; });
		q3w.Cl_Bind('w', '+forward');
		q3w.Cl_Bind('a', '+left');
		q3w.Cl_Bind('s', '+back');
		q3w.Cl_Bind('d', '+right');
	};

	/**
	 * Process current input variables into userComamnd_t struct for transmission to server.
	 */
	q3w.Cl_SendCommand = function () {
		this.Cl_GetCommand();
	};

	q3w.Cl_GetCommand = function () {
		var cmd = Object.create(q3w.usercmd_t);
		this.Cl_MouseMove(cmd);
	};

	q3w.CL_KeyMove = function (cmd) {
		var movespeed = 127;
		var forward = 0, side = 0, up = 0;

		side += movespeed * q3w.CL_KeyState(q3w.rightKey);
		side -= movespeed * q3w.CL_KeyState(q3w.leftKey);

		//up += movespeed * CL_KeyState();
		//up -= movespeed * CL_KeyState();

		forward += movespeed * CL_KeyState(q3w.forwardKey);
		forward -= movespeed * CL_KeyState(q3w.backKey);

		cmd.forwardmove = forward;
		cmd.rightmove = side;
		cmd.upmove = up;
	}
	q3w.Cl_MouseMove = function (cmd) {
		var cl = this.cl,
			oldAngles = cl.viewangles;

		cl.viewangles[1] += cl.mouseX * 0.0022;
		while (cl.viewangles[1] < 0)
				cl.viewangles[1] += Math.PI*2;
		while (cl.viewangles[1] >= Math.PI*2)
				cl.viewangles[1] -= Math.PI*2;

		cl.viewangles[0] += cl.mouseY * 0.0022;
		while (cl.viewangles[0] < -Math.PI*0.5)
				cl.viewangles[0] = -Math.PI*0.5;
		while (cl.viewangles[0] > Math.PI*0.5)
				cl.viewangles[0] = Math.PI*0.5;

		// reset
		cl.mouseX = 0;
		cl.mouseY = 0;

		cmd.angles = cl.viewangles;
	};

	/**
	 * Commands
	 */
	q3w.Cl_AddCommand = function (cmd, callback) {
		q3w.commands[cmd] = callback;
	};

	/**
	 * Key helpers
	 */
	function GetKey(keyName) {
		var keys = q3w.keys;
		return keys[keyName] || (keys[keyName] = Object.create(q3w.keyState_t));
	}

	/**
	 * Key bindings
	 */
	q3w.Cl_ExecBinding = function (key) {
		var cmdToExec = key.binding;

		if (!cmdToExec) return;
		if (!key.active && cmdToExec.charAt(0) === '+') cmdToExec = '-' + cmdToExec.substr(1);

		var callback = q3w.commands[cmdToExec];
		if (callback) callback.call(this, key);
	};

	q3w.Cl_Bind = function (keyName, cmd) {
		var key = GetKey(keyName);
		key.binding = cmd;
	};

	q3w.Cl_Unbind = function (keyName, cmd) {
		delete key.binding;
	}

	/**
	 * Responses to input layer events.
	 */
	q3w.Cl_KeyDownEvent = function (ev) {
		var key = GetKey(ev.keyName);
		key.active = true;
		key.downtime = ev.time;
		q3w.Cl_ExecBinding(key);
	};

	q3w.Cl_KeyUpEvent = function (ev) {
		var key = GetKey(ev.keyName);
		key.active = false; // Partial frame summing
		key.partial += ev.time - key.downtime;
		q3w.Cl_ExecBinding(key);
	};

	q3w.Cl_MouseMoveEvent = function (ev) {
		var cl = this.cl;
		cl.mouseX += ev.deltaX;
		cl.mouseY += ev.deltaY;
	};

	/**
	 * Returns the fraction of the frame the input was down.
	 */
	q3w.Cl_GetKeyState = function (key) {
		var msec = key.partial;
		key.partial = 0;

		if (key.active) {
			msec += q3w.frameTime - key.downtime;
		}

		key.downtime = q3w.frameTime;

		var val = msec / q3w.frameDelta;
		if (val < 0) val = 0;
		if (val > 1) val = 1;
		return val;
	};
})(window.q3w = window.q3w || {});