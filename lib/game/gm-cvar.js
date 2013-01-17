var g_gametype,
	g_forcearena,
	g_maxGameClients,
	g_fraglimit,
	g_timelimit,
	g_capturelimit,
	g_synchronousClients,
	g_friendlyFire,
	g_teamAutoJoin,
	g_teamForceBalance,
	g_warmup,
	g_doWarmup,
	g_speed,
	g_gravity,
	g_knockback,
	g_quadfactor,
	g_weaponRespawn,
	g_weaponTeamRespawn,
	g_forcerespawn,
	g_inactivity,
	g_motd,
	g_blood;

function RegisterCvars() {
	// Latched vars.
	g_gametype           = com.AddCvar('g_gametype',           0,     CVF.SERVERINFO | CVF.LATCH);
	g_forcearena         = com.AddCvar('g_forcearena',         0,     CVF.SERVERINFO | CVF.LATCH);

	g_maxGameClients     = com.AddCvar('g_maxGameClients',     0,     CVF.SERVERINFO | CVF.LATCH | CVF.ARCHIVE);

	// Change anytime vars.
	g_fraglimit          = com.AddCvar('g_fraglimit',          20,    CVF.SERVERINFO | CVF.ARCHIVE | CVF.NORESTART);
	g_timelimit          = com.AddCvar('g_timelimit',          0,     CVF.SERVERINFO | CVF.ARCHIVE | CVF.NORESTART);
	g_capturelimit       = com.AddCvar('g_capturelimit',       8,     CVF.SERVERINFO | CVF.ARCHIVE | CVF.NORESTART);

	g_synchronousClients = com.AddCvar('g_synchronousClients', 0,     CVF.SYSTEMINFO);

	g_friendlyFire       = com.AddCvar('g_friendlyFire',       0,     CVF.ARCHIVE);

	g_teamAutoJoin       = com.AddCvar('g_teamAutoJoin',       1,     CVF.ARCHIVE);
	g_teamForceBalance   = com.AddCvar('g_teamForceBalance',   0,     CVF.ARCHIVE);

	g_warmup             = com.AddCvar('g_warmup',             10,    CVF.ARCHIVE);
	g_doWarmup           = com.AddCvar('g_doWarmup',           1,     CVF.ARCHIVE);

	g_speed              = com.AddCvar('g_speed',              320);
	g_gravity            = com.AddCvar('g_gravity',            800);
	g_knockback          = com.AddCvar('g_knockback',          1000);
	g_quadfactor         = com.AddCvar('g_quadfactor',         3);
	g_weaponRespawn      = com.AddCvar('g_weaponrespawn',      5);
	g_weaponTeamRespawn  = com.AddCvar('g_weaponTeamRespawn',  30);
	g_forcerespawn       = com.AddCvar('g_forcerespawn',       20);
	g_inactivity         = com.AddCvar('g_inactivity',         0);
	g_motd               = com.AddCvar('g_motd',               "");
	g_blood              = com.AddCvar('g_blood',              1);
}