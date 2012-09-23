var Texture = function () {
	this.name = null;
	this.texnum = null;
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

var WorldData = function () {
	this.name = null;
	this.path = null;
	this.lightmaps = null;
	this.shaders = [];
	this.verts = [];
	this.meshVerts = [];
	this.faces = [];
	this.entities = {};

	/*vec3_t		lightGridOrigin;
	vec3_t		lightGridSize;
	vec3_t		lightGridInverseSize;
	int			lightGridBounds[3];
	byte		*lightGridData;*/
};