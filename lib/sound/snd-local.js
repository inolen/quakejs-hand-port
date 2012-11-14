var SoundLocals = function () {
	this.ctx          = null;
	this.volume_main  = null;
	this.volume_music = null;
	this.volume_sfx   = null;
	this.sounds       = [];
}

var Sound = function () {
	this.name      = null;
	this.buffer    = null;
	this.loading   = false;
	this.callbacks = [];
};