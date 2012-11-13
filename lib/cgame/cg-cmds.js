/**
 * RegisterCommands
 */
function RegisterCommands() {
	exp.COM_AddCmd('+scores',  CmdScoresDown);
	exp.COM_AddCmd('-scores',  CmdScoresUp);
	exp.COM_AddCmd('weapnext', CmdNextWeapon);
	exp.COM_AddCmd('weapprev', CmdPrevWeapon);
	exp.COM_AddCmd('weapon',   CmdWeapon);
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