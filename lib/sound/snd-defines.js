/**
 * Sound channels.
 * channel 0 never willingly overrides.
 * other channels will allways override a playing sound on that channel.
 */
var CHAN = {
	AUTO:        0,
	LOCAL:       1,  // menu sounds, etc
	WEAPON:      2,
	VOICE:       3,
	ITEM:        4,
	BODY:        5,
	LOCAL_SOUND: 6,  // chat messages, etc
	ANNOUNCER:   7   // announcer voices, etc
};

var SoundStatic = function () {
	this.ctx            = null;
	this.volume_main    = null;
	this.volume_music   = null;
	this.sounds         = null;                            // source sound objects
};

var SoundLocals = function () {
	this.sources        = [];                              // sound instances
	this.entities       = new Array(QS.MAX_GENTITIES);
	this.localEntityNum = 0;

	for (var i = 0; i < QS.MAX_GENTITIES; i++) {
		this.entities[i] = new SoundEntity();
	}
};

var Sound = function () {
	this.name      = null;
	this.buffer    = null;
};

var SoundSource = function () {
	this.hSound    = -1;
	this.origin    = null;
	this.entityNum = -1;                                    // owning entity, -1 if none
	this.bufsrc    = null;
	this.panner    = null;

	// this.local     = false;
	// this.active    = false;
	// this.playing   = false;
	this.tracking  = false;

	this.looping   = false;
	this.loopAddedThisFrame = false;
};

var SoundEntity = function () {
	this.origin = vec3.create();
};
