var global = global || window;

/**
 * Simulated event structures.
 */
global.QkClickEvent = function (x, y) {
	this.type = 'qk_click';
	this.x = x;
	this.y = y;
};

global.QkKeyPressEvent = function (keyName) {
	this.type = 'qk_keypress';
	this.keyName = keyName;
};

global.QkChangeEvent = function (value) {
	this.type = 'qk_change';
	this.value = value;
};

global.QkFocusEvent = function () {
	this.type = 'qk_focus';
};

global.QkBlurEvent = function () {
	this.type = 'qk_blur';
};