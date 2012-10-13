// the parseEntities array must be large enough to hold PACKET_BACKUP frames of
// entities, so that when a delta compressed message arives from the server
// it can be un-deltad from the original 
var MAX_PARSE_ENTITIES = 2048;

var ClientLocals = function () {
	this.snap                 = null;                      // latest received from server
	this.serverTime           = 0;                         // may be paused during play
	this.oldServerTime        = 0;                         // to prevent time from flowing bakcwards
	this.oldFrameServerTime   = 0;                         // to check tournament restarts
	this.serverTimeDelta      = 0;                         // cl.serverTime = cls.realtime + cl.serverTimeDelta
	                                                       // this value changes as net lag varies

	this.extrapolatedSnapshot = false;                     // set if any cgame frame has been forced to extrapolate
	                                                       // cleared when CL_AdjustTimeDelta looks at it
	this.newSnapshots         = false;                     // set on parse of any valid packet
	this.gameState            = [];                        // configstrings
	this.mouseX               = 0;
	this.mouseY               = 0;
	this.viewangles           = [0, 0, 0];

	// cmds[cmdNumber] is the predicted command, [cmdNumber-1] is the last
	// properly generated command.
	this.cmds                 = new Array(CMD_BACKUP);     // each mesage will send several old cmds
	this.cmdNumber            = 0;                         // incremented each frame, because multiple
	                                                       // frames may need to be packed into a single packet

	this.snapshots            = new Array(PACKET_BACKUP);
	this.entityBaselines      = new Array(MAX_GENTITIES);  // for delta compression when not in previous frame
	this.parseEntities        = new Array(MAX_PARSE_ENTITIES);
	this.parseEntitiesNum     = 0;                         // index (not anded off) into cl_parse_entities[]
	
	for (var i = 0; i < PACKET_BACKUP; i++) {
		this.snapshots[i] = new ClientSnapshot();
	}

	for (var i = 0; i < CMD_BACKUP; i++) {
		this.cmds[i] = new UserCmd();
	}

	for (var i = 0; i < MAX_PARSE_ENTITIES; i++) {
		this.parseEntities[i] = new EntityState();
	}
};

var ClientStatic = function () {
	this.initialized     = false;
	this.realTime        = 0;
};

var ConnectionState = {
	UNINITIALIZED: 0,
	DISCONNECTED:  1,                                      // not talking to a server
	CONNECTING:    2,                                      // sending request packets to the server
	CHALLENGING:   3,                                      // sending challenge packets to the server
	CONNECTED:     4,                                      // netchan_t established, getting gamestate
	LOADING:       5,                                      // only during cgame initialization, never during main loop
	PRIMED:        6,                                      // got gamestate, waiting for first frame
	ACTIVE:        7                                       // game views should be displayed
};

var ClientConnection = function () {
	this.state                 = ConnectionState.UNINITIALIZED;
	this.clientNum             = -1;
	this.lastPacketSentTime    = 0;                        // for retransmits during connection
	this.lastPacketTime        = 0;                        // for timeouts
	// Message sequence is used by both the network layer and the
	// delta compression layer.
	this.serverMessageSequence = 0;
	this.netchan               = null;
};

var ClientSnapshot = function () {
	this.valid            = false;                         // cleared if delta parsing was invalid
	this.snapFlags        = 0;                             // rate delayed and dropped commands
	this.serverTime       = 0;                             // server time the message is valid for (in msec)
	this.messageNum       = 0;                             // copied from netchan->incoming_sequence
	this.deltaNum         = 0;                             // messageNum the delta is from
	this.ping             = 0;                             // time from when cmdNum-1 was sent to time packet was reeceived
	this.areamask         = new Array(MAX_MAP_AREA_BYTES); // portalarea visibility bits
	this.cmdNum           = 0;                             // the next cmdNum the server is expecting
	this.ps               = new PlayerState();             // complete information about the current player at this time
	this.numEntities      = 0;                             // all of the entities that need to be presented
	this.parseEntitiesNum = 0;                             // at the time of this snapshot
	this.serverCommandNum = 0;                             // execute all commands up to this before
	                                                       // making the snapshot current
};

var KeyState = function () {
	this.active   = false,
	this.downtime = 0;
	this.partial  = 0;
	this.binding  = null;
};
