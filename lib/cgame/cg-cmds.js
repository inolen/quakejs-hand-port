/**
 * RegisterCommands
 */
function RegisterCommands() {
	CL.AddCmd('+zoom',    CmdZoomDown);
	CL.AddCmd('-zoom',    CmdZoomUp);
	CL.AddCmd('+scores',  CmdScoresDown);
	CL.AddCmd('-scores',  CmdScoresUp);
	CL.AddCmd('weapnext', CmdNextWeapon);
	CL.AddCmd('weapprev', CmdPrevWeapon);
	CL.AddCmd('weapon',   CmdWeapon);
	// Forward to server.
	CL.AddCmd('say',      null);
	CL.AddCmd('noclip',   null);
	CL.AddCmd('team',     null);
	CL.AddCmd('arena',    null);
}

/**
 * CmdZoomDown
 */
function CmdZoomDown() {
	if (cg.zoomed) {
		return;
	}
	cg.zoomed = true;
	cg.zoomTime = cg.time;
}

/**
 * CmdZoomUp
 */
function CmdZoomUp() {
	if (!cg.zoomed) {
		return;
	}
	cg.zoomed = false;
	cg.zoomTime = cg.time;
}

/**
 * CmdScoresDown
 */
function CmdScoresDown() {
	if (cg.scoresRequestTime + 2000 < cg.time) {
		// The scores are more than two seconds out of data,
		// so request new ones.
		cg.scoresRequestTime = cg.time;
		CL.AddClientCommand('score');

		// Leave the current scores up if they were already
		// displayed, but if this is the first hit, clear them out.
		if (!cg.showScores) {
			cg.showScores = true;
			cg.numScores = 0;
		}
	} else {
		// Show the cached contents even if they just pressed it
		// within two seconds.
		cg.showScores = true;
	}

	cg.showScores = true;
}

/**
 * CmdScoresUp
 */
function CmdScoresUp() {
	cg.showScores = false;
}