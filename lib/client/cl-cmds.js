/**
 * RegisterCommands
 */
function RegisterCommands() {
	com.AddCmd('bind',      CmdBind);
	com.AddCmd('unbind',    CmdUnbind);
	com.AddCmd('unbindall', CmdUnbindAll);
	com.AddCmd('connect',   CmdConnect);
	com.AddCmd('+attack',   function (key) { cls.inButtons[0] = key; });
	com.AddCmd('+forward',  function (key) { cls.inForward = key; });
	com.AddCmd('+left',     function (key) { cls.inLeft = key; });
	com.AddCmd('+back',     function (key) { cls.inBack = key; });
	com.AddCmd('+right',    function (key) { cls.inRight = key; });
	com.AddCmd('+jump',     function (key) { cls.inUp = key; });
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
}

/**
 * CmdBind
 */
function CmdBind(keyName, cmd) {
	var key = GetKey(keyName);
	key.binding = cmd;
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
