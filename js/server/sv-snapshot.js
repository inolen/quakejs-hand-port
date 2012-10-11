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
	var bb = new ByteBuffer(MAX_MSGLEN, ByteBuffer.LITTLE_ENDIAN);

	bb.writeUnsignedInt(client.netchan.outgoingSequence);
	bb.writeUnsignedByte(ServerMessage.snapshot);

	// Send over the current server time so the client can drift
	// its view of time to try to match.
	var serverTime = sv.time;
	if (client.oldServerTime) {
		// The server has not yet got an acknowledgement of the
		// new gamestate from this client, so continue to send it
		// a time as if the server has not restarted. Note from
		// the client's perspective this time is strictly speaking
		// incorrect, but since it'll be busy loading a map at
		// the time it doesn't really matter.
		serverTime = sv.time + client.oldServerTime;
	}
	bb.writeUnsignedInt(serverTime);

	var snapFlags = svs.snapFlagServerBit;
	if (client.state !== ClientState.ACTIVE) {
		snapFlags |= SNAPFLAG_NOT_ACTIVE;
	}
	bb.writeUnsignedInt(snapFlags);

	// Write out playerstate
	bb.writeUnsignedInt(frame.ps.commandTime);
	bb.writeUnsignedInt(frame.ps.pm_type);
	bb.writeUnsignedInt(frame.ps.pm_flags);
	bb.writeUnsignedInt(frame.ps.pm_time);
	bb.writeUnsignedInt(frame.ps.gravity);
	bb.writeUnsignedInt(frame.ps.speed);

	bb.writeFloat(frame.ps.origin[0]);
	bb.writeFloat(frame.ps.origin[1]);
	bb.writeFloat(frame.ps.origin[2]);

	bb.writeFloat(frame.ps.velocity[0]);
	bb.writeFloat(frame.ps.velocity[1]);
	bb.writeFloat(frame.ps.velocity[2]);

	bb.writeFloat(frame.ps.viewangles[0]);
	bb.writeFloat(frame.ps.viewangles[1]);
	bb.writeFloat(frame.ps.viewangles[2]);

	NetSend(client, bb.raw, bb.index);
}

function SendClientMessages() {
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (!client.state) {
			continue; // not connected
		}

		if (svs.time - client.lastSnapshotTime < client.snapshotMsec) {
			continue; // it's not time yet
		}

		SendClientSnapshot(client);
		client.lastSnapshotTime = svs.time;
	}
}