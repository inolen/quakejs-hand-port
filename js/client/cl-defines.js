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

var ClientConnection = function () {
	// Message sequence is used by both the network layer and the
	// delta compression layer.
	this.serverMessageSequence = 0;
	this.state                 = ConnectionState.UNINITIALIZED;
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

var KbLocals = {
	'us': {
		'backspace': 8,
		'tab': 9,
		'enter': 13,
		'shift': 16,
		'ctrl': 17,
		'alt': 18,
		'pause': 19, 'break': 19,
		'capslock': 20,
		'escape': 27, 'esc': 27,
		'space': 32, 'spacebar': 32,
		'pageup': 33,
		'pagedown': 34,
		'end': 35,
		'home': 36,
		'left': 37,
		'up': 38,
		'right': 39,
		'down': 40,
		'insert': 45,
		'delete': 46,
		'0': 48, '1': 49, '2': 50, '3': 51, '4': 52, '5': 53, '6': 54, '7': 55, '8': 56, '9': 57,
		'a': 65, 'b': 66, 'c': 67, 'd': 68, 'e': 69, 'f': 70, 'g': 71, 'h': 72, 'i': 73, 'j': 74, 'k': 75, 'l': 76, 'm': 77, 'n': 78, 'o': 79, 'p': 80, 'q': 81, 'r': 82, 's': 83, 't': 84, 'u': 85, 'v': 86, 'w': 87, 'x': 88, 'y': 89, 'z': 90,
		'meta': 91, 'command': 91, 'windows': 91, 'win': 91,
		'_91': 92,
		'select': 93,
		'num0': 96, 'num1': 97, 'num2': 98, 'num3': 99, 'num4': 100, 'num5': 101, 'num6': 102, 'num7': 103, 'num8': 104, 'num9': 105,
		'multiply': 106,
		'add': 107,
		'subtract': 109,
		'decimal': 110,
		'divide': 111,
		'f1': 112, 'f2': 113, 'f3': 114, 'f4': 115, 'f5': 116, 'f6': 117, 'f7': 118, 'f8': 119, 'f9': 120, 'f10': 121, 'f11': 122, 'f12': 123,
		'numlock': 144, 'num': 144,
		'scrolllock': 145, 'scroll': 145,
		'semicolon': 186,
		'equal': 187, 'equalsign': 187,
		'comma': 188,
		'dash': 189,
		'period': 190,
		'slash': 191, 'forwardslash': 191,
		'graveaccent': 192,
		'openbracket': 219,
		'backslash': 220,
		'closebracket': 221,
		'singlequote': 222
	}
};
