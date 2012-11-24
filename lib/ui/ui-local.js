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
	this.images        = null;
};

var UIImage = function () {
	this.index  = 0;
	this.name   = null;
	this.data   = null;
	this.loadcb = [];
};
UIImage.prototype.load = function (cb) {
	if (arguments.length) {
		if (this.data) {
			return cb();
		}
		this.loadcb.push(cb);
		return;
	}

	if (!this.data) {
		throw new Error('Load event triggered before we have a valid buffer.');
	}

	for (var i = 0; i < this.loadcb.length; i++) {
		this.loadcb[i]();
	}
};