/**
 * RegisterCommands
 */
function RegisterCommands() {
	com.AddCmd('+scores', ScoresDownCmd);
	com.AddCmd('-scores', ScoresUpCmd);
}

/**
 * ScoresDownCmd
 */
function ScoresDownCmd() {
	cg.showScores = true;
}

/**
 * ScoresUpCmd
 */
function ScoresUpCmd() {
	cg.showScores = false;
}