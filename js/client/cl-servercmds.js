function ParseServerMessage(msg) {
	if (msg.type === Net.ServerOp.Type.gamestate) {
		ParseGameState(msg.svop_gamestate);
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
	*/
}

function ParseGameState(gamestate) {
	console.log('ParseGameState: got configstrings', gamestate.configstrings);
}

function ParseServerInfo() {
}