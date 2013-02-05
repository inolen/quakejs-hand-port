var r_nocull,
	r_znear,
	r_subdivisions,
	r_overBrightBits,
	r_mapOverBrightBits,
	r_ambientScale,
	r_directedScale,
	r_dlights,
	r_railCoreWidth,
	r_showTris,
	r_showNormals,
	r_showFrustum,
	r_showCollision,
	r_portalOnly;

/**
 * RegisterCvars
 */
function RegisterCvars() {
	r_nocull            = Cvar.AddCvar('r_nocull',            0);
	r_znear             = Cvar.AddCvar('r_znear',             4);
	r_subdivisions      = Cvar.AddCvar('r_subdivisions',      4,   0,           true);
	r_overBrightBits    = Cvar.AddCvar('r_overBrightBits',    0,   QS.CVAR.ARCHIVE, true);
	r_mapOverBrightBits = Cvar.AddCvar('r_mapOverBrightBits', 2,   QS.CVAR.ARCHIVE, true);
	r_ambientScale      = Cvar.AddCvar('r_ambientScale',      0.6);
	r_directedScale     = Cvar.AddCvar('r_directedScale',     1);
	r_dlights           = Cvar.AddCvar('r_dlights',           1,   QS.CVAR.ARCHIVE, true);
	r_railCoreWidth     = Cvar.AddCvar('r_railCoreWidth',     6,   QS.CVAR.ARCHIVE);
	r_showTris          = Cvar.AddCvar('r_showTris',          0,   QS.CVAR.CHEAT);
	r_showNormals       = Cvar.AddCvar('r_showNormals',       0,   QS.CVAR.CHEAT);
	r_showFrustum       = Cvar.AddCvar('r_showFrustum',       0,   QS.CVAR.CHEAT);
	r_showCollision     = Cvar.AddCvar('r_showCollision',     0,   QS.CVAR.CHEAT);
	r_portalOnly        = Cvar.AddCvar('r_portalOnly',        0,   QS.CVAR.CHEAT);
}