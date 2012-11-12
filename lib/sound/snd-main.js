var sys;

var snd_ctx;
var snd_volume_main;
var snd_volume_music;
var snd_volume_sfx;

var snd_memo_sfx = {};


/**
 * S_Init
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
	
	// Create the main volume.
	snd_volume_main = snd_ctx.createGainNode();
	// Connect the main volume to the "destination" (as in, the speakers or whatever the default output is).
	snd_volume_main.connect(snd_ctx.destination);
	
	// Create separate background music / sound effect volume controls for later on.
	snd_volume_music = snd_ctx.createGainNode();
	snd_volume_music.connect(snd_volume_main);
	
	snd_volume_sfx = snd_ctx.createGainNode();
	snd_volume_sfx.connect(snd_volume_main);
}

/**
 * S_Shutdown
 */
function S_Shutdown () {

}


/**
 * S_StartSound
 */
function S_StartSound (origin, entity_number, sfx) {
	if (!AudioContext) { return; }
	
//	if (snd_memo_sfx.hasOwnProperty(sfx)) {
//		console.log('SOUND MEMO');
//		
//		// play pre-loaded sound
//		snd_memo_sfx[sfx].source.noteOn(0);
//		
//	} else {
		
		// Create an object with a sound source and a volume control.
		var sound = {};
		sound.source = snd_ctx.createBufferSource();
		sound.volume = snd_ctx.createGainNode();
		sound.panner = snd_ctx.createPanner();
		
		// Connect the sound source to the volume control.
		sound.source.connect(sound.volume);
		// Connect the volume control to the panner.
		sound.volume.connect(sound.panner);
		// ...and the head bone's connected to the / neck bone...
		sound.panner.connect(snd_volume_sfx);
		
		if (origin) {
			sound.panner.setPosition(origin[0], origin[1], origin[2]);
			
			// TODO find out if player position is always [0,0,0] ?
//			snd_ctx.listener.setPosition(0, 0, 0); // listener is at origin by default
		}
		
		sys.ReadFile('sound/' + sfx + '.wav', 'binary', function (err, data) {
			if (err) throw err;
			
			// Set the buffer
			sound.source.buffer = snd_ctx.createBuffer(data, false);
			
			// Playing the sound immediately. // TODO: add in "delay" parameter?
			sound.source.noteOn(0);
			
//			// Store sound in memo.
//			snd_memo_sfx[sfx] = sound;
		});
//	}
}


/**
 * S_StartLocalSound
 */
function S_StartLocalSound (sfx, channelNum) {
	
}


/**
 * S_StartBackgroundTrack
 */
function S_StartBackgroundTrack (intro, loop) {
	if (!AudioContext) { return; }
	
	// Create an object with a sound source.
	var sound = {};
	sound.source = snd_ctx.createBufferSource();
	
	// Connect the sound source to the overall music volume.
	sound.source.connect(snd_volume_music);
	
	// Set whether it loops or not.
	sound.source.loop = loop;
	
	sys.ReadFile('music/' + intro + '.wav', 'binary', function (err, data) {
		if (err) throw err;
		
		// Set the buffer.
		sound.source.buffer = snd_ctx.createBuffer(data, false);
		
		// Play the sound immediately.
		sound.source.noteOn(0);
	});
}

/**
 * S_StopBackgroundTrack
 */
function S_StopBackgroundTrack () {
	
}
