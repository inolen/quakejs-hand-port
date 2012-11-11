/**
 * ProcessTextInput
 */
function ProcessTextInput(str, keyName) {
	if (keyName === 'enter') {
		ClearFocusedElement();
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
	if (keyName === 'backspace') {
		return '';
	} else {
		ClearFocusedElement();
		return keyName;
	}
}