var ClientActive = function () {
	this.mouseX = 0;
	this.mouseY = 0;

	/*UserCmd cmds[CMD_BACKUP]; // each mesage will send several old cmds
	int       cmdNumber;        // incremented each frame, because multiple
															// frames may need to be packed into a single packet*/

	// the client maintains its own idea of view angles, which are
	// sent to the server each frame.  It is cleared to 0 upon entering each level.
	// the server sends a delta each frame which is added to the locally
	// tracked view angles to account for standing on rotating objects,
	// and teleport direction changes
	this.viewangles = [0, 0, 0];
};

var ClientConnection = function () {
	/*connstate_t	state;
	var clientNum;*/
	this.challenge = 0;
};

var ClientGame = function () {
	this.ps = new PlayerState();
	this.refdef = new RefDef();
}

var KeyState = {
	active: false,
	downtime: 0,
	partial: 0,
	binding: null
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
