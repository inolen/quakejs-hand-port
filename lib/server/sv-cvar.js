var sv_serverid,
	sv_mapname,
	sv_maxClients,
	sv_fps,
	sv_timeout,
	sv_zombietime;

function RegisterCvars() {
	sv_serverid   = COM.AddCvar('sv_serverid',   0,       QS.CVF.SYSTEMINFO);
	sv_mapname    = COM.AddCvar('sv_mapname',    'nomap', QS.CVF.SERVERINFO);
	sv_maxClients = COM.AddCvar('sv_maxClients', 8,       QS.CVF.SERVERINFO | QS.CVF.LATCH | QS.CVF.ARCHIVE);
	// TODO We need to run clientthink outside of our main Frame() think loop.
	sv_fps        = COM.AddCvar('sv_fps',        20);   // time rate for running non-clients
	sv_timeout    = COM.AddCvar('sv_timeout',    200);  // seconds without any message
	sv_zombietime = COM.AddCvar('sv_zombietime', 2);    // seconds to sink messages after disconnect
}