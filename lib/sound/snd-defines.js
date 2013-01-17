var SoundLocals = function () {
	this.ctx            = null;
	this.volume_main    = null;
	this.volume_music   = null;
	this.volume_sfx     = null;
	this.sounds         = [];
	this.sources        = [];
	this.loopingHandles = [];
	this.entities       = new Array(MAX_GENTITIES);
	this.localEntityNum = 0;

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.entities[i] = new SoundEntity();
	}
};

var Sound = function () {
	this.name      = null;
	this.buffer    = null;
};

var SoundSource = function () {
	this.hSound    = -1;
	this.entityNum = -1;                                    // owning entity, -1 if none
	this.bufsrc    = null;
	this.panner    = null;
	
	// this.local     = false;
	// this.active    = false;
	// this.playing   = false;
	this.looping   = false;
	this.tracking  = false;
	
	this.loopAddedThisFrame = false;
};

var SoundEntity = function () {
	this.origin = vec3.create();
};
