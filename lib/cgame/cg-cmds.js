/**
 * RegisterCommands
 */
function RegisterCommands() {
	imp.com_AddCmd('+scores',  CmdScoresDown);
	imp.com_AddCmd('-scores',  CmdScoresUp);
	imp.com_AddCmd('weapnext', CmdNextWeapon);
	imp.com_AddCmd('weapprev', CmdPrevWeapon);
	imp.com_AddCmd('weapon',   CmdWeapon);
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