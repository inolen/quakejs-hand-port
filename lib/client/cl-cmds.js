/**
 * RegisterCommands
 */
function RegisterCommands() {
	com.AddCmd('bind',      CmdBind);
	com.AddCmd('unbind',    CmdUnbind);
	com.AddCmd('unbindall', CmdUnbindAll);
	com.AddCmd('connect',   CmdConnect);
	com.AddCmd('+attack',   function () { cls.inButtons[0] = cls.lastKey; });
	com.AddCmd('+forward',  function () { cls.inForward    = cls.lastKey; });
	com.AddCmd('+left',     function () { cls.inLeft       = cls.lastKey; });
	com.AddCmd('+back',     function () { cls.inBack       = cls.lastKey; });
	com.AddCmd('+right',    function () { cls.inRight      = cls.lastKey; });
	com.AddCmd('+jump',     function () { cls.inUp         = cls.lastKey; });
}

/**
 * RegisterDefaultBinds
 */
function RegisterDefaultBinds() {
	CmdBind('mouse0',     '+attack');
	CmdBind('w',          '+forward');
	CmdBind('a',          '+left');
	CmdBind('s',          '+back');
	CmdBind('d',          '+right');
	CmdBind('space',      '+jump');
	CmdBind('tab',        '+scores');
	CmdBind('mwheelup',   'weapnext');
	CmdBind('mwheeldown', 'weapprev');
	CmdBind('1',          'weappon 1');
	CmdBind('2',          'weappon 2');
	CmdBind('3',          'weappon 3');
	CmdBind('4',          'weappon 4');
	CmdBind('5',          'weappon 5');
	CmdBind('6',          'weappon 6');
	CmdBind('7',          'weappon 7');
	CmdBind('8',          'weappon 8');
	CmdBind('9',          'weappon 9');
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

	Disconnect(false);

	clc.serverName = serverName;
	clc.serverAddress = StringToAddr(clc.serverName);

	clc.state = CA.CHALLENGING;
	clc.connectTime = -99999; // CheckForResend() will fire immediately
	clc.connectPacketCount = 0;
}

/**
 * StringToAddr
 */
function StringToAddr(str) {
	var addr = new sh.NetAdr();

	if (str.indexOf('localhost') !== -1) {
		addr.type = sh.NetAdrType.LOOPBACK;
	} else {
		addr.type = sh.NetAdrType.IP;
	}

	var split = str.split(':');

	if (!split.length) {
		addr.ip = split[0];
		addr.port = 9000;
	} else {
		addr.ip = split[0];
		addr.port = split[1];
	}

	return addr;
}
