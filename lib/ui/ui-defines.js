var UILocals = function () {
	this.styles        = [];                               // styles we've pushed into the head element
	this.frameCount    = 0;
	this.views         = {};
	this.activeMenus   = [];                               // active view stack
	this.hoverEls      = null;                             // currently hovered element
	this.focusEl       = null;                             // currently focused element
	this.mx            = 0;                                // mouse x
	this.my            = 0;                                // mouse y
	this.vw            = 0;                                // viewport width
	this.vh            = 0;                                // viewport height
	this.images        = null;
};

var UIImage = function () {
	this.name      = null;
	this.data      = null;
	this.index     = 0;
	this.promise   = null;
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