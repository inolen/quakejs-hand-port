var bindsModified = false;

/**
 * RegisterKeyCommands
 *
 * Called by COM to register bind commands before config load.
 */
function RegisterKeyCommands() {
	COM.AddCmd('bind',       CmdBind);
	COM.AddCmd('unbind',     CmdUnbind);
	COM.AddCmd('unbindall',  CmdUnbindAll);
}

/**
 * RegisterCommands
 */
function RegisterCommands() {
	COM.AddCmd('connect',    CmdConnect);
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
function CmdBind(keyName, cmd) {
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
		error('Bad server address', serverName);
		return;
	}

	// Disconnect from the current server.
	Disconnect(false);

	// If running a local server, kill it.
	if (SV.Running() && serverName !== 'localhost') {
		SV.Kill();
	}

	// Change our client connection state such that CheckForResend()
	// will fire immediately, initializing our server connection.
	clc.serverAddress = addr;
	clc.state = CA.CHALLENGING;
	clc.connectTime = -99999;
	clc.connectPacketCount = 0;
}

/**
 * CmdMessage
 */
function CmdMessage() {
	var message_model = new UI.MessageMenuModel();
	var message_view = UI.CreateView(message_model, UI.MessageMenuModel.template);
	UI.PushMenu(message_view);
}