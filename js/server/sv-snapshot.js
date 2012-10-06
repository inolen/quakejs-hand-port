function EmitPacketEntities(from, to, cmd) {
}

/*
=============
BuildClientSnapshot

Decides which entities are going to be visible to the client, and
copies off the playerstate and areabits.
=============
*/
function BuildClientSnapshot(client, msg) {
	var clent = client.gentity;
	if (!clent || client.state === ClientState.ZOMBIE) {
		return false; // Client hasn't entered world yet.
	}

	var frame = client.frames[0];
	var clientNum = GetClientNum(client);
	frame.ps = gm.GetClientPlayerstate(clientNum);
	
	//EmitPacketEntities();

	return true;
}

function SendClientSnapshot(client) {
	if (!BuildClientSnapshot(client)) {
		return;
	}

	var frame = client.frames[0];

	var msg = new Net.ServerOp_Snapshot();
	msg.serverTime = sv.time;
	
	msg.ps = new Net.PlayerState();
	msg.ps.origin.push(frame.ps.origin[0]);
	msg.ps.origin.push(frame.ps.origin[1]);
	msg.ps.origin.push(frame.ps.origin[2]);

	msg.ps.velocity.push(frame.ps.velocity[0]);
	msg.ps.velocity.push(frame.ps.velocity[1]);
	msg.ps.velocity.push(frame.ps.velocity[2]);

	msg.ps.viewangles.push(frame.ps.viewangles[0]);
	msg.ps.viewangles.push(frame.ps.viewangles[1]);
	msg.ps.viewangles.push(frame.ps.viewangles[2]);

	var svop = new Net.ServerOp();
	svop.type = Net.ServerOp.Type.snapshot;
	svop.svop_snapshot = msg;

	NetSend(svop);
}

function SendClientMessages() {
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (!client.state) {
			continue; // not connected
		}

		SendClientSnapshot(client);
		//client.lastSnapshotTime = svs.time;
	}
}