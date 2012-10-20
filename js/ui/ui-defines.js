var UILocals = function () {
	this.frameCount = 0;
	this.views      = {};
};

var UIView = function () {
	this.template = null;
	this.el       = null;
	this.visFrame = -1;
	this.model    = null;
	this.dirty    = -false;
}