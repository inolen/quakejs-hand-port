/**
 * ProcessTextInput
 */
function ProcessTextInput(str, keyName) {
	if (keyName === 'enter') {
		// Wait a frame to blur.
		setTimeout(_.bind(ClearFocusedElement, this));
	}

	// TODO sys-input should pass a char event as well as a key event.
	if (keyName.length === 1) {
		str += keyName;
	} else if (keyName === 'space') {
		str += ' ';
	} else if (keyName === 'backspace') {
		str = str.slice(0, -1);
	}

	return str;
}

/**
 * ProcessKeyBindInput
 */
function ProcessKeyBindInput(keyName) {
	// Wait a frame to blur.
	setTimeout(_.bind(ClearFocusedElement, this));
	
	if (keyName === 'backspace') {
		return '';
	} else {
		return keyName;
	}
}