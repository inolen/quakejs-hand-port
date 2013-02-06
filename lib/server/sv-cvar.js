var sv_port,
	sv_rconPort,
	sv_master,
	sv_serverid,
	sv_hostname,
	sv_mapname,
	sv_maxClients,
	sv_fps,
	sv_timeout,
	sv_zombietime;

function RegisterCvars() {
	sv_port       = Cvar.AddCvar('sv_port',       9001,                         QS.CVAR.ARCHIVE, true);
	sv_rconPort   = Cvar.AddCvar('sv_rconPort',   9002,                         QS.CVAR.ARCHIVE, true);
	sv_master     = Cvar.AddCvar('sv_master',     'master.quakejs.com:45735',   QS.CVAR.ARCHIVE);
	sv_hostname   = Cvar.AddCvar('sv_hostname',   'Anonymous',                  QS.CVAR.ARCHIVE);
	sv_serverid   = Cvar.AddCvar('sv_serverid',   0,                            QS.CVAR.SYSTEMINFO | QS.CVAR.ROM);
	sv_mapname    = Cvar.AddCvar('sv_mapname',    'nomap',                      QS.CVAR.SERVERINFO);
	sv_maxClients = Cvar.AddCvar('sv_maxClients', 8,                            QS.CVAR.SERVERINFO | QS.CVAR.LATCH | QS.CVAR.ARCHIVE);
	sv_fps        = Cvar.AddCvar('sv_fps',        20);   // time rate for running non-clients
	sv_timeout    = Cvar.AddCvar('sv_timeout',    200);  // seconds without any message
	sv_zombietime = Cvar.AddCvar('sv_zombietime', 2);    // seconds to sink messages after disconnect
}