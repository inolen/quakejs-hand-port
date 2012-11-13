/**
 * RegisterCommands
 */
function RegisterCommands() {
	imp.COM_AddCmd('+scores',  CmdScoresDown);
	imp.COM_AddCmd('-scores',  CmdScoresUp);
	imp.COM_AddCmd('weapnext', CmdNextWeapon);
	imp.COM_AddCmd('weapprev', CmdPrevWeapon);
	imp.COM_AddCmd('weapon',   CmdWeapon);
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