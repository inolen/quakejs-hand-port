var RETRANSMIT_TIMEOUT = 3000;                             // time between connection packet retransmits

// The parseEntities array must be large enough to hold COM.PACKET_BACKUP frames of
// entities, so that when a delta compressed message arives from the server
// it can be un-deltad from the original.
var MAX_PARSE_ENTITIES = COM.PACKET_BACKUP * 64;

// The ClientStatic structure is never wiped, and is used even when
// no client connection is active at all.
var ClientStatic = function () {
	this.initialized       = false;
	this.realTime          = 0;
	this.msgBuffer         = new ArrayBuffer(COM.MAX_MSGLEN);

	this.keyDownCallback   = null;  // allows external modules to trap user input
	this.keyUpCallback     = null;  // allows external modules to trap user input
	this.keyPressCallback  = null;
	this.mouseMoveCallback = null;

	this.lastKey           = null;
	this.inButtons         = new Array(15);
	this.inForward         = null;
	this.inLeft            = null;
	this.inBack            = null;
	this.inRight           = null;
	this.inUp              = null;
	this.inDown            = null;
};

// The ClientLocals structure is wiped completely at every
// new gamestate, potentially several times during an established connection.
var ClientLocals = function () {
	this.snap                 = new ClientSnapshot();      // latest received from server
	this.serverTime           = 0;                         // may be paused during play
	this.oldServerTime        = 0;                         // to prevent time from flowing backwards
	this.oldFrameServerTime   = 0;                         // to check tournament restarts
	this.serverTimeDelta      = 0;                         // cl.serverTime = cls.realtime + cl.serverTimeDelta
	                                                       // this value changes as net lag varies

	this.extrapolatedSnapshot = false;                     // set if any cgame frame has been forced to extrapolate
	                                                       // cleared when CL_AdjustTimeDelta looks at it
	this.newSnapshots         = false;                     // set on parse of any valid packet
	this.gameState            = [];                        // configstrings
	this.mouseX               = [0, 0];
	this.mouseY               = [0, 0];
	this.mouseIndex           = 0;
	this.viewangles           = vec3.create();


	this.serverId             = 0;                         // included in each client message so the server
	                                                       // can tell if it is for a prior map_restart

	// CGame communicates a few values to the client system.
	this.cgameWeapon          = 0;
	this.cgameSensitivity     = 0;

	// cmds[cmdNumber] is the predicted command,
	// [cmdNumber-1] is the last properly generated
	// command.
	this.cmds                 = new Array(QS.CMD_BACKUP);  // each mesage will send several old cmds
	this.cmdNumber            = 0;                         // incremented each frame, because multiple
	                                                       // frames may need to be packed into a single packet
	this.outPackets           = new Array(COM.PACKET_BACKUP);  // information about each packet we have sent out

	this.snapshots            = new Array(COM.PACKET_BACKUP);
	this.entityBaselines      = new Array(QS.MAX_GENTITIES);  // for delta compression when not in previous frame
	this.parseEntities        = new Array(MAX_PARSE_ENTITIES);
	this.parseEntitiesNum     = 0;                         // index (not anded off) into cl_parse_entities[]

	for (var i = 0; i < COM.PACKET_BACKUP; i++) {
		this.outPackets[i] = new ClientPacket();
	}

	for (var i = 0; i < COM.PACKET_BACKUP; i++) {
		this.snapshots[i] = new ClientSnapshot();
	}

	for (var i = 0; i < QS.CMD_BACKUP; i++) {
		this.cmds[i] = new QS.UserCmd();
	}

	for (var i = 0; i < QS.MAX_GENTITIES; i++) {
		this.entityBaselines[i] = new QS.EntityState();
	}

	for (var i = 0; i < MAX_PARSE_ENTITIES; i++) {
		this.parseEntities[i] = new QS.EntityState();
	}
};

var CA = {
	DISCONNECTED:  0,                                      // not talking to a server
	CONNECTING:    1,                                      // sending request packets to the server
	CHALLENGING:   2,                                      // sending challenge packets to the server
	CONNECTED:     3,                                      // netchan_t established, getting gamestate
	LOADING:       4,                                      // only during cgame initialization, never during main loop
	PRIMED:        5,                                      // got gamestate, waiting for first frame
	ACTIVE:        6                                       // game views should be displayed
};

var ClientConnection = function () {
	this.state                     = CA.DISCONNECTED;
	this.clientNum                 = -1;
	this.lastPacketTime            = 0;  // for timeouts

	this.serverAddress             = null;
	this.socket                    = null;
	this.netchan                   = null;
	this.connectTime               = 0;  // for connection retransmits
	this.connectPacketCount        = 0;  // for display on connection dialog

	// Message sequence is used by both the network layer
	// and the delta compression layer.
	this.serverMessageSequence     = 0;

	// Reliable messages that go to the server.
	this.reliableSequence          = 0;
	this.reliableAcknowledge       = 0;  // the last one the server has executed
	this.reliableCommands          = new Array(COM.MAX_RELIABLE_COMMANDS);

	// Reliable messages received from server.
	this.serverCommandSequence     = 0;
	this.lastExecutedServerCommand = 0;  // last server command grabbed or executed with GetServerCommand
	this.serverCommands            = new Array(COM.MAX_RELIABLE_COMMANDS);
};

var ClientPacket = function () {
	this.cmdNumber  = 0;                                   // cl.cmdNumber when packet was sent
	this.serverTime = 0;                                   // usercmd->serverTime when packet was sent
	this.realTime   = 0;                                   // cls.realtime when packet was sent
};

var ClientSnapshot = function () {
	this.valid            = false;                         // cleared if delta parsing was invalid
	this.snapFlags        = 0;                             // rate delayed and dropped commands
	this.serverTime       = 0;                             // server time the message is valid for (in msec)
	this.messageNum       = 0;                             // copied from netchan->incoming_sequence
	this.deltaNum         = 0;                             // messageNum the delta is from
	this.ping             = 0;                             // time from when cmdNum-1 was sent to time packet was reeceived
	this.areamask         = new Array(COM.MAX_MAP_AREA_BYTES); // portalarea visibility bits
	this.cmdNum           = 0;                             // the next cmdNum the server is expecting
	this.ps               = new QS.PlayerState();          // complete information about the current player at this time
	this.numEntities      = 0;                             // all of the entities that need to be presented
	this.parseEntitiesNum = 0;                             // at the time of this snapshot
	this.serverCommandNum = 0;                             // execute all commands up to this before
	                                                       // making the snapshot current
};

ClientSnapshot.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new ClientSnapshot();
	}

	to.valid            = this.valid;
	to.snapFlags        = this.snapFlags;
	to.serverTime       = this.serverTime;
	to.messageNum       = this.messageNum;
	to.deltaNum         = this.deltaNum;
	to.ping             = this.ping;
	for (var i = 0; i < COM.MAX_MAP_AREA_BYTES; i++) {
		to.areamask[i] = this.areamask[i];
	}
	to.cmdNum           = this.cmdNum;
	this.ps.clone(to.ps);
	to.numEntities      = this.numEntities;
	to.parseEntitiesNum = this.parseEntitiesNum;
	to.serverCommandNum = this.serverCommandNum;

	return to;
};

var KeyState = function () {
	this.chr        = null;
	this.active     = false;
	this.wasPressed = false;
	this.downtime   = 0;
	this.partial    = 0;
	this.binding    = null;
};