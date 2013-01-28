var s_gain,
	s_graceDistance,
	s_maxDistance,
	s_rolloff,
	s_volume,
	s_musicVolume;

/**
 * RegisterCvars
 */
function RegisterCvars() {
	s_gain          = Cvar.AddCvar('s_gain',          1.0,  0);
	s_graceDistance = Cvar.AddCvar('s_graceDistance', 512,  0);
	s_maxDistance   = Cvar.AddCvar('s_maxDistance',   1024, 0);
	s_rolloff       = Cvar.AddCvar('s_rolloff',       2,    0);
	s_volume        = Cvar.AddCvar('s_volume',        0.7,  QS.CVAR.ARCHIVE);
	s_musicVolume   = Cvar.AddCvar('s_musicVolume',   0.5,  QS.CVAR.ARCHIVE);
}