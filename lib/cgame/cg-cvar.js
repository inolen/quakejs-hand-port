var cg_fov,
	cg_zoomFov,
	cg_errorDecay,
	cg_nopredict,
	cg_showmiss,
	cg_runpitch,
	cg_runroll,
	cg_bobup,
	cg_bobpitch,
	cg_bobroll,
	cg_thirdPerson,
	cg_thirdPersonAngle,
	cg_thirdPersonRange,
	cg_railTrailTime,
	cg_autoSwitch,
	cg_trueLightning,
	cg_drawCounts,
	cg_drawLagometer,
	cg_crosshairShaders,
	pmove_fixed,
	pmove_msec;

function RegisterCvars() {
	cg_fov              = Cvar.AddCvar('cg_fov',              110,   Cvar.FLAGS.ARCHIVE);
	cg_zoomFov          = Cvar.AddCvar('cg_zoomFov',          22.5,  Cvar.FLAGS.ARCHIVE),
	cg_errorDecay       = Cvar.AddCvar('cg_errorDecay',       100,   Cvar.FLAGS.ARCHIVE);
	cg_nopredict        = Cvar.AddCvar('cg_nopredict',        0,     Cvar.FLAGS.ARCHIVE);
	cg_showmiss         = Cvar.AddCvar('cg_showmiss',         0,     Cvar.FLAGS.ARCHIVE);

	cg_runpitch         = Cvar.AddCvar('cg_runpitch',         0.002, Cvar.FLAGS.ARCHIVE);
	cg_runroll          = Cvar.AddCvar('cg_runroll',          0.005, Cvar.FLAGS.ARCHIVE);
	cg_bobup            = Cvar.AddCvar('cg_bobup',            0.005, Cvar.FLAGS.CHEAT);
	cg_bobpitch         = Cvar.AddCvar('cg_bobpitch',         0.002, Cvar.FLAGS.ARCHIVE);
	cg_bobroll          = Cvar.AddCvar('cg_bobroll',          0.002, Cvar.FLAGS.ARCHIVE);

	cg_thirdPerson      = Cvar.AddCvar('cg_thirdPerson',      0,     Cvar.FLAGS.ARCHIVE);
	cg_thirdPersonAngle = Cvar.AddCvar('cg_thirdPersonAngle', 0);
	cg_thirdPersonRange = Cvar.AddCvar('cg_thirdPersonRange', 100);
	cg_railTrailTime    = Cvar.AddCvar('cg_railTrailTime',    400,   Cvar.FLAGS.CHEAT);
	cg_autoSwitch       = Cvar.AddCvar('cg_autoSwitch',       1,     Cvar.FLAGS.ARCHIVE);
	cg_trueLightning    = Cvar.AddCvar('cg_trueLightning',    1,     Cvar.FLAGS.ARCHIVE);
	cg_drawCounts       = Cvar.AddCvar('cg_drawCounts',       0,     Cvar.FLAGS.ARCHIVE);
	cg_drawLagometer    = Cvar.AddCvar('cg_drawLagometer',    0,     Cvar.FLAGS.ARCHIVE);
	cg_crosshairShaders = Cvar.AddCvar('cg_crosshairShaders', 0,     Cvar.FLAGS.CHEAT);
	pmove_fixed         = Cvar.AddCvar('pmove_fixed',         0);
	pmove_msec          = Cvar.AddCvar('pmove_msec',          8);
}