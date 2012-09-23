// TODO: Add disconnect support.
function DirectConnect(netchan) {
	console.log('SV: A client is direct connecting', netchan);
	var client = new Client();
	client.netchan = netchan;
	svs.clients.push(client);
}

function UserMove(client, cmd) {
	if (!client.gameStateSent) {
		SendClientGameState(client);
		client.gameStateSent = true;
	}

	ClientThink(client, cmd);
}

function SendClientGameState(client) {
	var svop = new Net.ServerOp();
	svop.type = Net.ServerOp.Type.gamestate;
	svop.svop_gamestate = new Net.ServerOp_Gamestate();
	// TODO: Send aggregated configstrings from specific cvars (CVAR_SYSTEMINFO and CS_SERVERINFO)
	var cs = new Net.ServerOp.ConfigString();
	cs.key = 'map';
	cs.value = 'q3dm6';
	svop.svop_gamestate.configstrings.push(cs);

	NetSend(svop);
}

function ClientThink(client, cmd) {
	client.lastUsercmd = cmd;

	// TODO: Following q3 convention here.. seems weird.
	client.ps.speed = 320;

	var pm = new PmoveInfo();
	pm.ps = client.ps;
	pm.cmd = cmd;

	com.Pmove(pm);
	//VM_Call( gvm, GAME_CLIENT_THINK, cl - svs.clients );
}

function ClientEnterWorld(client, cmd) {
	client.lastUsercmd = cmd;

	ClientSpawn(client);
	// call the game begin function
	//VM_Call( gvm, GAME_CLIENT_BEGIN, client - svs.clients );
}

function ClientSpawn() {
	/*if (!map.entities) {
		return;
	}

	if (index == -1) {
		index = (lastIndex+1)% map.entities.info_player_deathmatch.length;
	}
	lastIndex = index;

	var spawnPoint = map.entities.info_player_deathmatch[index];
	playerMover.position = [
		spawnPoint.origin[0],
		spawnPoint.origin[1],
		spawnPoint.origin[2]+30 // Start a little ways above the floor
	];
	playerMover.velocity = [0,0,0];

	zAngle = -spawnPoint.angle * (3.1415/180) + (3.1415*0.5); // Negative angle in radians + 90 degrees
	xAngle = 0;*/
}