var root = typeof(global) !== 'undefined' ? global : window;

/**
 * Simulated event structures.
 */
root.QkClickEvent = function (x, y) {
	this.type = 'qk_click';
	this.x = x;
	this.y = y;
};

root.QkKeyPressEvent = function (keyName) {
	this.type = 'qk_keypress';
	this.keyName = keyName;
};

root.QkChangeEvent = function (value) {
	this.type = 'qk_change';
	this.value = value;
};

root.QkFocusEvent = function () {
	this.type = 'qk_focus';
};

root.QkBlurEvent = function () {
	this.type = 'qk_blur';
};