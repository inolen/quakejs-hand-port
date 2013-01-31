var g_gametype,
	g_fraglimit,
	g_timelimit,
	g_capturelimit,
	g_synchronousClients,
	pmove_fixed,
	pmove_msec,
	g_friendlyFire,
	g_playersPerTeam,
	g_teamForceBalance,
	g_warmup,
	g_speed,
	g_gravity,
	g_knockback,
	g_quadfactor,
	g_weaponRespawn,
	g_weaponTeamRespawn,
	g_forceRespawn,
	g_inactivity;

function RegisterCvars() {
	g_fraglimit          = Cvar.AddCvar('g_fraglimit',          20,    CVAR.ARENAINFO | CVAR.ARCHIVE);
	g_capturelimit       = Cvar.AddCvar('g_capturelimit',       8,     CVAR.ARENAINFO | CVAR.ARCHIVE);
	g_gametype           = Cvar.AddCvar('g_gametype',           0,     CVAR.SERVERINFO | CVAR.ARCHIVE, true);
	g_timelimit          = Cvar.AddCvar('g_timelimit',          0,     CVAR.SERVERINFO | CVAR.ARCHIVE);

	g_synchronousClients = Cvar.AddCvar('g_synchronousClients', 0,     CVAR.SYSTEMINFO);
	pmove_fixed          = Cvar.AddCvar('pmove_fixed',          1,     CVAR.SYSTEMINFO);
	pmove_msec           = Cvar.AddCvar('pmove_msec',           8,     CVAR.SYSTEMINFO);

	g_friendlyFire       = Cvar.AddCvar('g_friendlyFire',       0,     CVAR.ARCHIVE);
	g_playersPerTeam     = Cvar.AddCvar('g_playersPerTeam',     0,     CVAR.ARCHIVE);
	g_teamForceBalance   = Cvar.AddCvar('g_teamForceBalance',   0,     CVAR.ARCHIVE);
	g_warmup             = Cvar.AddCvar('g_warmup',             10,    CVAR.ARCHIVE);

	g_speed              = Cvar.AddCvar('g_speed',              320);
	g_gravity            = Cvar.AddCvar('g_gravity',            800);
	g_knockback          = Cvar.AddCvar('g_knockback',          1000);
	g_quadfactor         = Cvar.AddCvar('g_quadfactor',         3);
	g_weaponRespawn      = Cvar.AddCvar('g_weaponrespawn',      5);
	g_weaponTeamRespawn  = Cvar.AddCvar('g_weaponTeamRespawn',  30);
	g_forceRespawn       = Cvar.AddCvar('g_forceRespawn',       20);
	g_inactivity         = Cvar.AddCvar('g_inactivity',         0);
}