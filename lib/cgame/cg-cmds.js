/**
 * RegisterCommands
 */
function RegisterCommands() {
	com.AddCmd('+zoom',    CmdZoomDown);
	com.AddCmd('-zoom',    CmdZoomUp);
	com.AddCmd('+scores',  CmdScoresDown);
	com.AddCmd('-scores',  CmdScoresUp);
	com.AddCmd('weapnext', CmdNextWeapon);
	com.AddCmd('weapprev', CmdPrevWeapon);
	com.AddCmd('weapon',   CmdWeapon);
	// Forward to server.
	com.AddCmd('say',      null);
	com.AddCmd('noclip',   null);
	com.AddCmd('team',     null);
	com.AddCmd('arena',    null);
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
		cl.AddClientCommand('score');

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