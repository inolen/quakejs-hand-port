var UILocals = function () {
	this.frameCount    = 0;
	this.views         = {};
	this.activeMenus   = [];                               // active view stack
	this.hoverEls      = null;                             // currently hovered element
	this.focusEl       = null;                             // currently focused element
	this.mx            = 0;                                // mouse x
	this.my            = 0;                                // mouse y
	this.vw            = 0;                                // viewport width
	this.vh            = 0;                                // viewport height
	this.images        = [];
};

var UIImage = function () {
	this.b64 = null;
};