var Texture = function () {
	this.name = null;
	this.texnum = 0;
};

var RefDef = function () {
	this.x = 0;
	this.y = 0;
	this.width = 0;
	this.height = 0;
	this.fov = 0;
	this.origin = [0, 0, 0];
	this.viewaxis = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	this.drawSurfs = null;
};

var ViewParms = function () {
	this.x = 0;
	this.y = 0;
	this.width = 0;
	this.height = 0;
	this.fov = 0;
	this.origin = [0, 0, 0];
	this.viewaxis = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
};