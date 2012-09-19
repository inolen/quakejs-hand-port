define('client/cl-servercmds', [], function () {
	return function (re, bg) {
		var cl = this;

		function ParseServerPacket(msg) {
			console.log('cl received', msg);

			/*
			while ( 1 ) {
				if ( msg->readcount > msg->cursize ) {
					Com_Error (ERR_DROP,"CL_ParseServerMessage: read past end of server message");
					break;
				}

				cmd = MSG_ReadByte( msg );

				if (cmd == svc_EOF) {
					SHOWNET( msg, "END OF MESSAGE" );
					break;
				}

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

		function ParseGameState() {
		}

		function ParseServerInfo() {
		}

		return {
			ParseServerPacket: ParseServerPacket,
			ParseGameState: ParseGameState,
			ParseServerInfo: ParseServerInfo
		};
	};
});