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
	s_gain          = COM.AddCvar('s_gain',          1.0,  0);
	s_graceDistance = COM.AddCvar('s_graceDistance', 512,  0);
	s_maxDistance   = COM.AddCvar('s_maxDistance',   1024, 0);
	s_rolloff       = COM.AddCvar('s_rolloff',       2,    0);
	s_volume        = COM.AddCvar('s_volume',        0.7,  QS.CVF.ARCHIVE);
	s_musicVolume   = COM.AddCvar('s_musicVolume',   0.5,  QS.CVF.ARCHIVE);
}