/**
 * ProcessTextInput
 */
function ProcessTextInput(str, keyName) {
	// A-Z a-z 0-9... this seems like a bad idea.
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
		return keyName;
	}
}