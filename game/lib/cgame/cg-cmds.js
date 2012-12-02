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
	cg.showScores = true;
}

/**
 * CmdScoresUp
 */
function CmdScoresUp() {
	cg.showScores = false;
}