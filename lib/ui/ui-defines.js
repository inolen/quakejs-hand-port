var UIImage = function () {
	this.name      = null;
	this.data      = null;
};

/**
 * Simulated event structures.
 */
var QkClickEvent = function (x, y) {
	this.type = 'qk_click';
	this.x = x;
	this.y = y;
};

var QkKeyPressEvent = function (keyName) {
	this.type = 'qk_keypress';
	this.keyName = keyName;
};

var QkChangeEvent = function (value) {
	this.type = 'qk_change';
	this.value = value;
};

var QkFocusEvent = function () {
	this.type = 'qk_focus';
};

var QkBlurEvent = function () {
	this.type = 'qk_blur';
};