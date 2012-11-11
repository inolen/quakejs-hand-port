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
	
	//
	// TODO: ...yeah, fix this so it's not doing a hardcoded http request
	//
	
	// Load a sound file using an ArrayBuffer XMLHttpRequest.
	var request = new XMLHttpRequest();
	request.open("GET", '/baseq3/music/' + intro, true);
	request.responseType = "arraybuffer";
	request.onload = function(e) {
		// Create a buffer from the response ArrayBuffer.
		var buffer = snd_ctx.createBuffer(this.response, false);
		sound.buffer = buffer;
		
		// Make the sound source use the buffer and start playing it.
		sound.source.buffer = sound.buffer;
		sound.source.noteOn(snd_ctx.currentTime);
	};
	request.send();
}


/*
=================
S_StopBackgroundTrack
=================
*/
function S_StopBackgroundTrack () {
	
}


/*
** TODO: Call each track on a per-map basis
*/
S_Init();
S_StartBackgroundTrack('sonic5.wav', true);
