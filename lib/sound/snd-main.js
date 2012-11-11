var sys;

var snd_ctx;
var snd_main_volume;


/*
=================
S_Init
=================
*/
function S_Init () {
	
	// Detect if the audio context is supported.
	window.AudioContext = (
		window.AudioContext ||
		window.webkitAudioContext ||
		window.mozAudioContext ||
		false
	);
	
	if (!AudioContext) {
//		throw new Error("AudioContext not supported!");
		console.log("AudioContext not supported!");
		return;
	}
	
	// Create a new audio context.
	snd_ctx = new AudioContext();
	
	// Create a AudioGainNode to control the main volume.
	snd_main_volume = snd_ctx.createGainNode();
	// Connect the main volume node to the context destination.
	snd_main_volume.connect(snd_ctx.destination);
}


/*
=================
S_StartSound
=================
*/
function S_StartSound (origin, entity_number, entity_channel, sfx) {
	
}


/*
=================
S_StartLocalSound
=================
*/
function S_StartLocalSound (sfx, channelNum) {
	
}


/*
=================
S_StartBackgroundTrack
=================
*/
function S_StartBackgroundTrack (intro, loop) {
	if (!AudioContext) { return; }
	
	// Create an object with a sound source and a volume control.
	var sound = {};
	sound.source = snd_ctx.createBufferSource();
	sound.volume = snd_ctx.createGainNode();
	
	// Connect the sound source to the volume control.
	sound.source.connect(sound.volume);
	// Hook up the sound volume control to the main volume.
	sound.volume.connect(snd_main_volume);
	
	// Make the sound source loop.
	sound.source.loop = loop;
	
	sys.ReadFile('music/' + intro, 'binary', function (err, data) {
		if (err) throw err;
		
		// Create a buffer from the response ArrayBuffer.
		var buffer = snd_ctx.createBuffer(data, false);
		sound.buffer = buffer;
		
		// Make the sound source use the buffer and start playing it.
		sound.source.buffer = sound.buffer;
		sound.source.noteOn(snd_ctx.currentTime);
	});
}


/*
=================
S_StopBackgroundTrack
=================
*/
function S_StopBackgroundTrack () {
	
}
