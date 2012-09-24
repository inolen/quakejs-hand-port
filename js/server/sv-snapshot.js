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
	var frame = client.frames[0];

	var clientNum = GetClientNum(client);
	frame.ps = gm.GetClientPlayerstate(clientNum);

	msg.origin.push(frame.ps.origin[0]);
	msg.origin.push(frame.ps.origin[1]);
	msg.origin.push(frame.ps.origin[2]);
	
	//EmitPacketEntities();
}

function SendClientSnapshot(client) {
	var msg = new Net.ServerOp_Snapshot();
	BuildClientSnapshot(client, msg);

	var svop = new Net.ServerOp();
	svop.type = Net.ServerOp.Type.snapshot;
	svop.svop_snapshot = msg;

	NetSend(svop);
}

function SendClientMessages() {
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		SendClientSnapshot(client);
		//client.lastSnapshotTime = svs.time;
	}
}