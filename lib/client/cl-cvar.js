var cl_name,
	cl_model,
	cl_snaps,
	cl_sensitivity,
	cl_showTimeDelta,
	cl_timeNudge;

function RegisterCvars() {
	cl_name          = COM.AddCvar('name',            'UnnamedPlayer', QS.CVF.ARCHIVE | QS.CVF.USERINFO);
	cl_model         = COM.AddCvar('model',           'sarge',         QS.CVF.ARCHIVE | QS.CVF.USERINFO);
	cl_snaps         = COM.AddCvar('snaps',            20,             QS.CVF.ARCHIVE | QS.CVF.USERINFO);
	cl_sensitivity   = COM.AddCvar('cl_sensitivity',   2,              QS.CVF.ARCHIVE);
	cl_showTimeDelta = COM.AddCvar('cl_showTimeDelta', 0,              QS.CVF.ARCHIVE);
	cl_timeNudge     = COM.AddCvar('cl_timeNudge',     0,              QS.CVF.ARCHIVE);
}