/**
 * RegisterCommands
 */
function RegisterCommands() {
	com.AddCmd('+scores',  CmdScoresDown);
	com.AddCmd('-scores',  CmdScoresUp);
	com.AddCmd('weapnext', CmdNextWeapon);
	com.AddCmd('weapprev', CmdPrevWeapon);
	com.AddCmd('weapon',   CmdWeapon);
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