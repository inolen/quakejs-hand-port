/**
 * InitCommands
 */
function InitCommands() {
	com.AddCmd('+scores', CmdScoresDown);
	com.AddCmd('-scores', CmdScoresUp);
}

/**
 * CmdScoresDown
 */
function CmdScoresDown() {
	cg.showScores = true;

	console.log('scores down');
}

/**
 * CmdScoresUp
 */
function CmdScoresUp() {
	cg.showScores = false;

	console.log('scores up');
}