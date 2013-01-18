var cg_fov,
	cg_zoomFov,
	cg_errordecay,
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
	cg_fov              = com.AddCvar('cg_fov',              110,  CVF.ARCHIVE);
	cg_zoomFov          = com.AddCvar('cg_zoomFov',          22.5, CVF.ARCHIVE),
	cg_errordecay       = com.AddCvar('cg_errordecay',       100,  CVF.ARCHIVE);
	cg_nopredict        = com.AddCvar('cg_nopredict',        0,    CVF.ARCHIVE);
	cg_showmiss         = com.AddCvar('cg_showmiss',         1,    CVF.ARCHIVE);
	cg_thirdPerson      = com.AddCvar('cg_thirdPerson',      0,    CVF.ARCHIVE);
	cg_thirdPersonAngle = com.AddCvar('cg_thirdPersonAngle', 0);
	cg_thirdPersonRange = com.AddCvar('cg_thirdPersonRange', 100);
	cg_railTrailTime    = com.AddCvar('cg_railTrailTime',    400,  CVF.CHEAT);
	cg_autoSwitch       = com.AddCvar('cg_autoSwitch',       1,    CVF.ARCHIVE);
	cg_trueLightning    = com.AddCvar('cg_trueLightning',    1,    CVF.ARCHIVE);
	cg_drawLagometer    = com.AddCvar('cg_drawLagometer',    0,    CVF.ARCHIVE);
	cg_crosshairShaders = com.AddCvar('cg_crosshairShaders', 0,    CVF.CHEAT);
	pmove_fixed         = com.AddCvar('pmove_fixed',         0,    CVF.SYSTEMINFO);
	pmove_msec          = com.AddCvar('pmove_msec',          8,    CVF.SYSTEMINFO);
}