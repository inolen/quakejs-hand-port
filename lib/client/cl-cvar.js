var cl_name,
	cl_model,
	cl_sensitivity,
	cl_showTimeDelta;

function RegisterCvars() {
	cl_name          = com.AddCvar('name',            'UnnamedPlayer', CVF.ARCHIVE | CVF.USERINFO);
	cl_model         = com.AddCvar('model',           'sarge',         CVF.ARCHIVE | CVF.USERINFO);
	cl_sensitivity   = com.AddCvar('cl_sensitivity',   2,              CVF.ARCHIVE);
	cl_showTimeDelta = com.AddCvar('cl_showTimeDelta', 0,              CVF.ARCHIVE);
}