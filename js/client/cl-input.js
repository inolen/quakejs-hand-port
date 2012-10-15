var activeKeys = {};
var forwardKey, leftKey, backKey, rightKey, upKey;

function InitInput() {
	com.AddCmd('+forward', function (key) { forwardKey = key; });
	com.AddCmd('+left', function (key) { leftKey = key; });
	com.AddCmd('+back', function (key) { backKey = key; });
	com.AddCmd('+right', function (key) { rightKey = key; });
	com.AddCmd('+jump', function (key) { upKey = key; });

	Bind('w', '+forward');
	Bind('a', '+left');
	Bind('s', '+back');
	Bind('d', '+right');
	Bind('space', '+jump');
}

/**
 * Process current input variables into userCommand_t
 * struct for transmission to server.
 */

function SendCommand() {
	// Don't send any message if not connected.
	if (clc.state < ConnectionState.CONNECTED) {
		return;
	}

	CreateNewCommands();
	WritePacket();
}

function CreateNewCommands() {
	// No need to create usercmds until we have a gamestate.
	if (clc.state < ConnectionState.PRIMED) {
		return;
	}

	cl.cmdNumber++;
	cl.cmds[cl.cmdNumber & CMD_MASK] = CreateCommand();
}

function CreateCommand() {
	var cmd = new UserCmd();

	KeyMove(cmd);
	MouseMove(cmd);

	// Send the current server time so the amount of movement
	// can be determined without allowing cheating.
	cmd.serverTime = cl.serverTime;

	return cmd;
}

/**
 * WritePacket
 *
 * Create and send the command packet to the server,
 * including both the reliable commands and the usercmds.
 * 
 * During normal gameplay, a client packet will contain
 * something like:
 *
 * 4    serverid
 * 4    sequence number
 * 4    acknowledged sequence number
 * <optional reliable commands>
 * 1    clc_move or clc_moveNoDelta
 * 1    command count
 * <count * usercmds>
 */
function WritePacket() {
	var msg = new ByteBuffer(MAX_MSGLEN, ByteBuffer.LITTLE_ENDIAN);
	var serverid = parseInt(cl.gameState['sv_serverid']);

	msg.writeInt(serverid);
	// Write the last message we received, which can
	// be used for delta compression, and is also used
	// to tell if we dropped a gamestate
	msg.writeInt(clc.serverMessageSequence);
	// Write the last reliable message we received.
	msg.writeInt(clc.serverCommandSequence);

	// Write any unacknowledged client commands.
	for (var i = clc.reliableAcknowledge + 1; i <= clc.reliableSequence; i++) {
		msg.writeUnsignedByte(ClientMessage.clientCommand);
		msg.writeInt(i);
		msg.writeCString(clc.reliableCommands[i % MAX_RELIABLE_COMMANDS]);
	}

	// Write only the latest client command for now
	// since we're rocking TCP.
	var cmd = cl.cmds[cl.cmdNumber & CMD_MASK];

	msg.writeUnsignedByte(ClientMessage.moveNoDelta);
	msg.writeUnsignedInt(cmd.serverTime);
	msg.writeFloat(cmd.angles[0]);
	msg.writeFloat(cmd.angles[1]);
	msg.writeFloat(cmd.angles[2]);
	msg.writeByte(cmd.forwardmove);
	msg.writeByte(cmd.rightmove);
	msg.writeByte(cmd.upmove);

	com.NetchanSend(clc.netchan, msg.buffer, msg.index);
}

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

function MouseMove(cmd) {
	var oldAngles = cl.viewangles;
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

	cmd.angles[0] = cl.viewangles[0];
	cmd.angles[1] = cl.viewangles[1];
	cmd.angles[2] = cl.viewangles[2];
}

/**
 * Key helpers
 */
function GetKey(keyName) {
	return keys[keyName] || (keys[keyName] = new KeyState());
}

/**
 * Abstracted key/mouse event handling.
 */
function KeyDownEvent(time, keyName) {
	var key = GetKey(keyName);

	// Some browsers repeat keydown events, we don't want that.
	if (key.active) return;

	key.active = true;
	key.downtime = time;
	ExecBinding(key);
}

function KeyUpEvent(time, keyName) {
	var key = GetKey(keyName);
	key.active = false;
	// Partial frame summing.
	key.partial += time - key.downtime;
	ExecBinding(key);
}

function MouseMoveEvent(time, dx, dy) {
	cl.mouseX += dx;
	cl.mouseY += dy;
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

	var callback = com.GetCmd(cmdToExec);
	if (callback) callback.call(this, key);
}

function Bind(keyName, cmd) {
	var key = GetKey(keyName);
	key.binding = cmd;
}

function Unbind(keyName, cmd) {
	delete key.binding;
}