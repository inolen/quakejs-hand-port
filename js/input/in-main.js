(function(q3w) {
	q3w.In_Init = function () {
		var self = this;

		// TODO: Should pass this in as some sort of context.
		var viewportFrame = document.getElementById('viewport-frame');

		document.addEventListener('keydown', function (ev) { self.In_KeyDown(ev); });
		document.addEventListener('keyup', function (ev) { self.In_KeyUp(ev); });
		viewportFrame.addEventListener('mousedown', function (ev) { self.In_MouseDown(ev); });
		viewportFrame.addEventListener('mouseup', function (ev) { self.In_MouseUp(ev); });
		viewportFrame.addEventListener('mousemove', function (ev) { self.In_MouseMove(ev); });
	};

	q3w.In_Frame = function () {
		// TODO: Magic.
	};

	/**
	 * Keyboard input
	 */
	function GetKeyForKeyCode(keyCode) {
		var local = q3w.kbLocals['us'];

		for (var key in local) {
			if (!local.hasOwnProperty(key)) continue;
			if (local[key] == keyCode) return key;
		}
	}

	var _activeKeys = {};
	q3w.In_KeyDown = function (ev) {
		var key = GetKeyForKeyCode(ev.keyCode);

		// Some browsers repeat keydown events, we don't want that.
		if (_activeKeys[key]) return;

		this.Com_QueueEvent({ type: this.inputEventTypes.EVENT_KEYDOWN, keyName: key });
		_activeKeys[key] = true;
	};

	q3w.In_KeyUp = function (ev) {
		var key = GetKeyForKeyCode(ev.keyCode);

		this.Com_QueueEvent({ type: this.inputEventTypes.EVENT_KEYUP, keyName: key });
		_activeKeys[key] = false;
	};

	/**
	 * Mouse input
	 */
	function GetKeyForMouseButton(button) {
		return 'mouse' + button;
	}

	q3w.In_MouseDown = function (ev) {
		var key = GetKeyForMouseButton(ev.button);
		this.Com_QueueEvent({ type: this.inputEventTypes.EVENT_KEYDOWN, keyName: key });
	};

	q3w.In_MouseUp = function (ev) {
		var key = GetKeyForMouseButton(ev.button);
		this.Com_QueueEvent({ type: this.inputEventTypes.EVENT_KEYUP, keyName: key });
	};

	var _lastPageX = 0, _lastPageY = 0;
	q3w.In_MouseMove = function (ev) {
		var deltaX, deltaY;

		if (document.pointerLockElement) {
			deltaX = ev.movementX;
			deltaY = ev.movementY;
		} else {
			deltaX = ev.pageX - _lastPageX;
			deltaY = ev.pageY - _lastPageY;
			_lastPageX = ev.pageX;
			_lastPageY = ev.pageY;
		}

		this.Com_QueueEvent({ type: this.inputEventTypes.EVENT_MOUSEMOVE, deltaX: deltaX, deltaY: deltaY });
	};

	/*
			case SDL_MOUSEBUTTONDOWN:
			case SDL_MOUSEBUTTONUP:
				{
					unsigned char b;
					switch( e.button.button )
					{
						case 1:   b = K_MOUSE1;     break;
						case 2:   b = K_MOUSE3;     break;
						case 3:   b = K_MOUSE2;     break;
						case 4:   b = K_MWHEELUP;   break;
						case 5:   b = K_MWHEELDOWN; break;
						case 6:   b = K_MOUSE4;     break;
						case 7:   b = K_MOUSE5;     break;
						default:  b = K_AUX1 + ( e.button.button - 8 ) % 16; break;
					}
					Com_QueueEvent( 0, SE_KEY, b,
						( e.type == SDL_MOUSEBUTTONDOWN ? qtrue : qfalse ), 0, NULL );
				}*/
})(window.q3w = window.q3w || {});