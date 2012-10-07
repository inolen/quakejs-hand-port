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

	var frame = client.frames[client.netchan.outgoingSequence & PACKET_MASK];
	var clientNum = GetClientNum(client);
	frame.ps = gm.GetClientPlayerstate(clientNum);
	
	//EmitPacketEntities();

	return true;
}

function SendClientSnapshot(client) {
	if (!BuildClientSnapshot(client)) {
		return;
	}

	var frame = client.frames[client.netchan.outgoingSequence & PACKET_MASK];

	var svop = new Net.ServerOp();
	svop.type = Net.ServerOp.Type.snapshot;

	var msg = svop.svop_snapshot = new Net.ServerOp_Snapshot();

	// Send over the current server time so the client can drift
	// its view of time to try to match.
	if (client.oldServerTime) {
		// The server has not yet got an acknowledgement of the
		// new gamestate from this client, so continue to send it
		// a time as if the server has not restarted. Note from
		// the client's perspective this time is strictly speaking
		// incorrect, but since it'll be busy loading a map at
		// the time it doesn't really matter.
		msg.serverTime = sv.time + client.oldServerTime;
	} else {
		msg.serverTime = sv.time;
	}

	msg.snapFlags = svs.snapFlagServerBit;
	if (client.state !== ClientState.ACTIVE) {
		msg.snapFlags |= SNAPFLAG_NOT_ACTIVE;
	}
	
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

	NetSend(client.netchan, svop);
}

window.snapshots = 0;
window.lastSnapshotTime = 0;

function SendClientMessages() {
	/*if (sys.GetMilliseconds() - window.lastSnapshotTime > 1000) {
		console.log('SendClientMessages, ' + window.snapshots + ' snapshots in 1 sec');
		window.snapshots = 0;
		window.lastSnapshotTime = sys.GetMilliseconds();
	}*/

	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (!client.state) {
			continue; // not connected
		}

		/*if (svs.time - client.lastSnapshotTime < client.snapshotMsec) {
			continue; // it's not time yet
		}*/

		SendClientSnapshot(client);
		client.lastSnapshotTime = svs.time;
	}

	window.snapshots++;
}