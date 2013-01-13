var r_nocull,
	r_znear,
	r_lodscale,
	r_subdivisions,
	r_overBrightBits,
	r_mapOverBrightBits,
	r_ambientScale,
	r_directedScale,
	r_railCoreWidth,
	r_dlights,
	r_pauseVis,
	r_showTris,
	r_showNormals,
	r_showFrustum,
	r_showCollision,
	r_dlights,
	r_activeDlight;

/**
 * RegisterCvars
 */
function RegisterCvars() {
	r_nocull            = com.AddCvar('r_nocull',            0);
	r_znear             = com.AddCvar('r_znear',             4);
	r_lodscale          = com.AddCvar('r_lodscale',          5,   CVF.CHEAT );
	r_subdivisions      = com.AddCvar('r_subdivisions',      4);
	r_overBrightBits    = com.AddCvar('r_overBrightBits',    0,   CVF.ARCHIVE);
	r_mapOverBrightBits = com.AddCvar('r_mapOverBrightBits', 2,   CVF.ARCHIVE);
	r_ambientScale      = com.AddCvar('r_ambientScale',      0.6);
	r_directedScale     = com.AddCvar('r_directedScale',     1);
	r_railCoreWidth     = com.AddCvar('r_railCoreWidth',     6,   CVF.ARCHIVE);
	r_dlights           = com.AddCvar('r_dlights',           1,   CVF.ARCHIVE);
	r_pauseVis          = com.AddCvar('r_pauseVis',          0,   CVF.CHEAT);
	r_showTris          = com.AddCvar('r_showTris',          0,   CVF.CHEAT);
	r_showNormals       = com.AddCvar('r_showNormals',       0,   CVF.CHEAT);
	r_showFrustum       = com.AddCvar('r_showFrustum',       0,   CVF.CHEAT);
	r_showCollision     = com.AddCvar('r_showCollision',     0,   CVF.CHEAT);
	r_activeDlight      = com.AddCvar('r_activeDlight',      -1,  CVF.CHEAT);
}