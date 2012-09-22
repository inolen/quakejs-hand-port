var gamestate = {};

function ParseServerMessage(msg) {
	if (msg.type === Net.ServerOp.Type.gamestate) {
		ParseGameState(msg.svop_gamestate);
	} else if (msg.type === Net.ServerOp.Type.snapshot) {
		ParseSnapshot(msg.svop_snapshot);
	}

	/*
	while ( 1 ) {
		// other commands
		switch ( cmd ) {
		default:
			Com_Error (ERR_DROP,"CL_ParseServerMessage: Illegible server message");
			break;
		case svc_nop:
			break;
		case svc_serverCommand:
			CL_ParseCommandString( msg );
			break;
		case svc_gamestate:
			cl.ParseGameState( msg );
			break;
		case svc_snapshot:
			CL_ParseSnapshot( msg );
			break;
		}
	}
	*/
}

function ParseGameState(gamestate) {
	for (var i = 0; i < gamestate.configstrings.length; i++) {
		var cs = gamestate.configstrings[i];
		gamestate[cs.key] = cs.value;
	}

	console.log('parsed gamestate', gamestate);

	// TODO: Call our own version of CL_InitCGame
	re.LoadMap(gamestate['map']);
}

function ParseSnapshot(snapshot) {
	cg.ps.origin = snapshot.origin;
	//console.log('got snapshot', snapshot);
}