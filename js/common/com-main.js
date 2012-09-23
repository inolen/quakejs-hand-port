function Init(canvas, gl) {
	cl.Init(canvas, gl);
	sv.Init(cl);

	// Provide the user a way to interface with the client.
	window.$ = function (cmd) {
		var args = Array.prototype.slice.call(arguments, 1);
		var callback;

		if ((callback = sv.CmdGet(cmd))) {
			callback.apply(sv, args);
		} else if ((callback = cl.CmdGet(cmd))) {
			callback.apply(cl, args);
		}
	};
}

/*function GetMsec() {
	timeBeforeFirstEvents =0;
	timeBeforeServer =0;
	timeBeforeEvents =0;
	timeBeforeClient = 0;
	timeAfter = 0;

	//
	// main event loop
	//
	if ( com_speeds->integer ) {
		timeBeforeFirstEvents = Sys_Milliseconds ();
	}

	// Figure out how much time we have
	if(com_dedicated->integer) {
		minMsec = SV_FrameMsec();
	} else {
		minMsec = 1;
		
		timeVal = com_frameTime - lastTime;
		bias += timeVal - minMsec;
		
		if(bias > minMsec)
			bias = minMsec;
		
		// Adjust minMsec if previous frame took too long to render so
		// that framerate is stable at the requested value.
		minMsec -= bias;
	}

	do
	{
		if(com_sv_running->integer) {
			timeValSV = SV_SendQueuedPackets();
			timeVal = Com_TimeVal(minMsec);

			if(timeValSV < timeVal)
				timeVal = timeValSV;
		} else {
			timeVal = Com_TimeVal(minMsec);
		}
		
		if (com_busyWait->integer || timeVal < 1) {
			NET_Sleep(0);
		} else {
			NET_Sleep(timeVal - 1);
		}
	} while(Com_TimeVal(minMsec));
	
	lastTime = com_frameTime;
	com_frameTime = Com_EventLoop();
	
	msec = com_frameTime - lastTime;
}*/

function Frame() {
	//var msec = GetMsec();
	sv.Frame();
	cl.Frame();
}