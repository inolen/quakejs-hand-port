var sv_serverid,
	sv_mapname,
	sv_maxClients,
	sv_fps,
	sv_timeout,
	sv_zombietime;

function RegisterCvars() {
	sv_serverid   = Cvar.AddCvar('sv_serverid',   0,       QS.CVF.SYSTEMINFO | QS.CVF.ROM);
	sv_mapname    = Cvar.AddCvar('sv_mapname',    'nomap', QS.CVF.SERVERINFO);
	sv_maxClients = Cvar.AddCvar('sv_maxClients', 8,       QS.CVF.SERVERINFO | QS.CVF.LATCH | QS.CVF.ARCHIVE);
	sv_fps        = Cvar.AddCvar('sv_fps',        20);   // time rate for running non-clients
	sv_timeout    = Cvar.AddCvar('sv_timeout',    200);  // seconds without any message
	sv_zombietime = Cvar.AddCvar('sv_zombietime', 2);    // seconds to sink messages after disconnect
}