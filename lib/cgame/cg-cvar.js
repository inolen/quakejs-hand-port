var cg_fov,
	cg_zoomFov,
	cg_errorDecay,
	cg_nopredict,
	cg_showmiss,
	cg_thirdPerson,
	cg_thirdPersonAngle,
	cg_thirdPersonRange,
	cg_railTrailTime,
	cg_autoSwitch,
	cg_trueLightning,
	cg_drawLagometer,
	cg_crosshairShaders,
	pmove_fixed,
	pmove_msec;

function RegisterCvars() {
	cg_fov              = Cvar.AddCvar('cg_fov',              110,  CVF.ARCHIVE);
	cg_zoomFov          = Cvar.AddCvar('cg_zoomFov',          22.5, CVF.ARCHIVE),
	cg_errorDecay       = Cvar.AddCvar('cg_errorDecay',       100,  CVF.ARCHIVE);
	cg_nopredict        = Cvar.AddCvar('cg_nopredict',        0,    CVF.ARCHIVE);
	cg_showmiss         = Cvar.AddCvar('cg_showmiss',         1,    CVF.ARCHIVE);
	cg_thirdPerson      = Cvar.AddCvar('cg_thirdPerson',      0,    CVF.ARCHIVE);
	cg_thirdPersonAngle = Cvar.AddCvar('cg_thirdPersonAngle', 0);
	cg_thirdPersonRange = Cvar.AddCvar('cg_thirdPersonRange', 100);
	cg_railTrailTime    = Cvar.AddCvar('cg_railTrailTime',    400,  CVF.CHEAT);
	cg_autoSwitch       = Cvar.AddCvar('cg_autoSwitch',       1,    CVF.ARCHIVE);
	cg_trueLightning    = Cvar.AddCvar('cg_trueLightning',    1,    CVF.ARCHIVE);
	cg_drawLagometer    = Cvar.AddCvar('cg_drawLagometer',    0,    CVF.ARCHIVE);
	cg_crosshairShaders = Cvar.AddCvar('cg_crosshairShaders', 0,    CVF.CHEAT);
	pmove_fixed         = Cvar.AddCvar('pmove_fixed',         0);
	pmove_msec          = Cvar.AddCvar('pmove_msec',          8);
}