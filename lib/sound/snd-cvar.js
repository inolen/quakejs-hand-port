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
	s_gain          = com.AddCvar('s_gain',          1.0,  0);
	s_graceDistance = com.AddCvar('s_graceDistance', 512,  0);
	s_maxDistance   = com.AddCvar('s_maxDistance',   1024, 0);
	s_rolloff       = com.AddCvar('s_rolloff',       2,    0);
	s_volume        = com.AddCvar('s_volume',        0.7,  CVF.ARCHIVE);
	s_musicVolume   = com.AddCvar('s_musicVolume',   0.5,  CVF.ARCHIVE);
}