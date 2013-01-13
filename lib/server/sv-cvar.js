var sv_serverid,
	sv_mapname,
	sv_maxClients,
	sv_fps,
	sv_timeout,
	sv_zombietime;

function RegisterCvars() {
	sv_serverid   = com.AddCvar('sv_serverid',   0,       CVF.SYSTEMINFO);
	sv_mapname    = com.AddCvar('sv_mapname',    'nomap', CVF.SERVERINFO);
	sv_maxClients = com.AddCvar('sv_maxClients', 8,       CVF.SERVERINFO | CVF.LATCH | CVF.ARCHIVE);
	// TODO We need to run clientthink outside of our main Frame() think loop.
	sv_fps        = com.AddCvar('sv_fps',        20);   // time rate for running non-clients
	sv_timeout    = com.AddCvar('sv_timeout',    200);  // seconds without any message
	sv_zombietime = com.AddCvar('sv_zombietime', 2);    // seconds to sink messages after disconnect
}