/**
 * RegisterCommands
 */
function RegisterCommands() {
	com.AddCmd('bind',       CmdBind);
	com.AddCmd('unbind',     CmdUnbind);
	com.AddCmd('unbindall',  CmdUnbindAll);
	com.AddCmd('connect',    CmdConnect);
	com.AddCmd('message',    CmdMessage);
	com.AddCmd('+attack',    function () { cls.inButtons[0] = cls.lastKey; });
	com.AddCmd('-attack',    function () { });
	com.AddCmd('+forward',   function () { cls.inForward    = cls.lastKey; });
	com.AddCmd('-forward',   function () { });
	com.AddCmd('+left',      function () { cls.inLeft       = cls.lastKey; });
	com.AddCmd('-left',      function () { });
	com.AddCmd('+back',      function () { cls.inBack       = cls.lastKey; });
	com.AddCmd('-back',      function () { });
	com.AddCmd('+right',     function () { cls.inRight      = cls.lastKey; });
	com.AddCmd('-right',     function () { });
	com.AddCmd('+jump',      function () { cls.inUp         = cls.lastKey; });
	com.AddCmd('-jump',      function () { });
}

/**
 * CmdBind
 */
function CmdBind(keyName, cmd) {
	var key = GetKey(keyName);
	key.binding = cmd;

	// Consider this like modifying an archived cvar, so the
	// file write will be triggered at the next oportunity.
	com.cvarModifiedFlags |= CVF.ARCHIVE;
}

/**
 * CmdUnbind
 */
function CmdUnbind(keyName, cmd) {
	var key = GetKey(keyName);
	delete key.binding;
}

/**
 * CmdUnbindAll
 */
function CmdUnbindAll() {
	for (var keyName in cls.keys) {
		if (!cls.keys.hasOwnProperty(keyName)) {
			continue;
		}

		delete cls.keys[keyName].binding;
	}
}

/**
 * CmdConnect
 */
function CmdConnect(serverName) {
	var parts = serverName.split(':');
	var host = parts[0];
	var port = parts[1];

	var addr = com.StringToAddr(serverName);
	if (!addr) {
		log('Bad server address', serverName);
		return;
	}

	// Disconnect from the current server.
	Disconnect(false);

	// If running a local server, kill it.
	if (sv.Running() && serverName !== 'localhost') {
		sv.Kill();
	}

	// Change our client connection state such that CheckForResend()
	// will fire immediately, initializing our server connection.
	// This is a silly being that we're on TCP / IP, we could
	// move CheckForResend's functionality in here.
	clc.serverAddress = addr;
	clc.state = CA.CHALLENGING;
	clc.connectTime = -99999;
	clc.connectPacketCount = 0;
}

/**
 * CmdMessage
 */
function CmdMessage() {
	ui.PushMenu('message');
}