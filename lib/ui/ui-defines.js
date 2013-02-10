var UILocals = function () {
	this.styles        = [];                               // styles we've pushed into the head element
	this.images        = null;

	this.views         = [];
	this.activeMenus   = [];                               // active view stack
	this.frameCount    = 0;

	// Input emulation.
	this.hoverEls      = null;                             // currently hovered element
	this.focusEl       = null;                             // currently focused element
	this.mx            = 0;                                // mouse x
	this.my            = 0;                                // mouse y
	this.vw            = 0;                                // viewport width
	this.vh            = 0;                                // viewport height
};

var UIImage = function () {
	this.name      = null;
	this.data      = null;
};

var UIView = function () {
	this.model    = null;
	this.el       = null;
	this.visFrame = 0;
};