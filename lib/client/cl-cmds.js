var bindsModified = false;

/**
 * RegisterKeyCommands
 *
 * Called by COM to register bind commands before config load.
 */
function RegisterKeyCommands() {
	COM.AddCmd('bind',      CmdBind);
	COM.AddCmd('unbind',    CmdUnbind);
	COM.AddCmd('unbindall', CmdUnbindAll);

	RegisterDefaultBinds();
}

/**
 * RegisterDefaultBinds
 */
function RegisterDefaultBinds() {
	CmdBind('mouse0', '+attack');
	CmdBind('mouse2', '+zoom');
	CmdBind('w', '+forward');
	CmdBind('a', '+left');
	CmdBind('s', '+back');
	CmdBind('d', '+right');
	CmdBind('spacebar', '+jump');
	CmdBind('ctrl', '+crouch');
	CmdBind('tab', '+scores');
	CmdBind('mwheelup', 'weapnext');
	CmdBind('mwheeldown', 'weapprev');
	CmdBind('t', 'message');
	CmdBind('1', 'weapon 1');
	CmdBind('2', 'weapon 2');
	CmdBind('3', 'weapon 3');
	CmdBind('4', 'weapon 4');
	CmdBind('5', 'weapon 5');
	CmdBind('6', 'weapon 6');
	CmdBind('7', 'weapon 7');
	CmdBind('8', 'weapon 8');
	CmdBind('9', 'weapon 9');
}

/**
 * RegisterCommands
 */
function RegisterCommands() {
	COM.AddCmd('connect',    CmdConnect);
	COM.AddCmd('disconnect', CmdDisconnect);
	COM.AddCmd('rcon',       CmdRcon);
	COM.AddCmd('message',    CmdMessage);
	COM.AddCmd('+attack',    function () { cls.inButtons[0] = cls.lastKey; });
	COM.AddCmd('-attack',    function () { });
	COM.AddCmd('+forward',   function () { cls.inForward    = cls.lastKey; });
	COM.AddCmd('-forward',   function () { });
	COM.AddCmd('+left',      function () { cls.inLeft       = cls.lastKey; });
	COM.AddCmd('-left',      function () { });
	COM.AddCmd('+back',      function () { cls.inBack       = cls.lastKey; });
	COM.AddCmd('-back',      function () { });
	COM.AddCmd('+right',     function () { cls.inRight      = cls.lastKey; });
	COM.AddCmd('-right',     function () { });
	COM.AddCmd('+jump',      function () { cls.inUp         = cls.lastKey; });
	COM.AddCmd('-jump',      function () { });
	COM.AddCmd('+crouch',    function () { cls.inDown        = cls.lastKey; });
	COM.AddCmd('-crouch',    function () { });
}

/**
 * BindsModified
 */
function BindsModified() {
	return bindsModified;
}

/**
 * ClearBindsModified
 */
function ClearBindsModified() {
	bindsModified = false;
}

/**
 * CmdBind
 */
function CmdBind(keyName) {
	// Pull and concat cmd from args.
	var values = Array.prototype.slice.call(arguments, 1);
	var cmd = values.join(' ');

	if (!cmd) {
		log('Invalid command name: \'' + cmd + '\'');
		return;
	}

	var key = GetKey(keyName);
	key.binding = cmd;

	bindsModified = true;
}

/**
 * CmdUnbind
 */
function CmdUnbind(keyName) {
	var key = GetKey(keyName);
	key.binding = null;

	bindsModified = true;
}

/**
 * CmdUnbindAll
 *
 * Unbind all keys. Optionally, unbind all keys for a specific command.
 */
function CmdUnbindAll(cmdName) {
	for (var keyName in keys) {
		if (!keys.hasOwnProperty(keyName)) {
			continue;
		}

		var key = keys[keyName];

		if (!cmdName || cmdName === key.binding) {
			key.binding = null;
		}
	}

	bindsModified = true;
}

/**
 * CmdConnect
 */
function CmdConnect(serverName) {
	var addr = COM.StringToAddr(serverName);
	if (!addr) {
		error('Failed to parse server address', serverName);
		return;
	}

	// Disconnect from the current server.
	Disconnect();

	// If running a local server, kill it.
	if (SV.Running() && serverName !== 'localhost') {
		SV.Kill();
	}

	// Change our client connection state such that CheckForResend()
	// will fire immediately, initializing our server connection.
	clc.serverAddress = addr;
	clc.state = CA.CONNECTING;
	clc.connectTime = -99999;
	clc.connectPacketCount = 0;
}

/**
 * CmdDisconnect
 */
function CmdDisconnect(serverName) {
	Disconnect();
}

/**
 * CmdRcon
 *
 * Send the rest of the command line over as
 * an unconnected command.
 */
function CmdRcon(password) {
	if (clc.state < CA.CONNECTED) {
		log('You must be connected to issue rcon commands.');
		return;
	}

	var values = Array.prototype.slice.call(arguments, 1);
	var cmd = values.join(' ');

	if (!password) {
		log('You must pass a password.');
		return;
	} else if (!cmd) {
		log('You must specify a command to pass.');
		return;
	}

	COM.NetOutOfBandPrint(clc.socket, 'rcon', [password, cmd]);
}

/**
 * CmdMessage
 */
function CmdMessage() {
	var message_model = new UI.MessageModel({
		ExecuteBuffer: COM.ExecuteBuffer
	});

	// Wait 1 frame so the keypress event directly following this doesn't hit the textbox.
	setTimeout(function () {
		UI.CreateView(message_model, UI.MessageTemplate, true);
	}, 0);
}