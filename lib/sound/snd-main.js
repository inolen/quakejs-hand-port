var snd;

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'SND:');
	Function.apply.call(console.log, console, args);
}

/**
 * Init
 */
function Init () {
	// Detect if the audio context is supported.
	window.AudioContext = (
		window.AudioContext ||
		window.webkitAudioContext ||
		window.mozAudioContext ||
		undefined
	);
	
	if (typeof AudioContext === 'undefined') {
		console.log('AudioContext not supported!');
		return;
	}
	
	snd = new SoundLocals();

	// Create a new audio context.
	snd.ctx = new AudioContext();
	
	// Create the main volume.
	snd.volume_main = snd.ctx.createGainNode();
	// Connect the main volume to the "destination"
	// (as in, the speakers or whatever the default output is).
	snd.volume_main.connect(snd.ctx.destination);
	
	// Create separate background music / sound effect volume controls for later on.
	snd.volume_music = snd.ctx.createGainNode();
	snd.volume_music.connect(snd.volume_main);
	
	snd.volume_sfx = snd.ctx.createGainNode();
	snd.volume_sfx.connect(snd.volume_main);
	
	// Lowering sound effects in the mix.
	snd.volume_sfx.gain.value = 0.4;

	CreateDefaultSound();
}

/**
 * Shutdown
 */
function Shutdown() {
	if (typeof AudioContext === 'undefined') { return; }
}

/**
 * GetSoundByHandle
 */
function GetSoundByHandle(index) {
	// Out of range gets the default model.
	if (index < 1 || index >= snd.sounds.length) {
		return snd.sounds[0];
	}

	return snd.sounds[index];
}

/**
 * RegisterSound
 */
function RegisterSound(name) {
	if (!name) {
		log('RegisterSound: null name');
		return 0;
	}

	// Search the currently loaded models.
	var sound;
	for (var hSound = 1; hSound < snd.sounds.length; hSound++) {
		sound = snd.sounds[hSound];

		if (sound.name === name) {
			return hSound;
		}
	}

	// Create new sound.
	hSound = snd.sounds.length;
	sound = snd.sounds[hSound] = new Sound();

	imp.sys_ReadFile(name + '.wav', 'binary', function (err, data) {
		if (err) {
			log('Failed to load sound', name);
			return;
		}
		
		snd.ctx.decodeAudioData(data, function (buffer) {
			sound.buffer = buffer;
		});
	});

	return hSound;
}

/**
 * CreateDefaultSound
 */
function CreateDefaultSound() {
	snd.sounds[0] = new Sound();
}

/**
 * StartSound
 */
// TODO: add in "delay" parameter?
// TODO: are we using the entity number for anything? remove it?
function StartSound(origin, entity_number, sHandle) {
	if (typeof AudioContext === 'undefined') { return; }

	// TODO Add a deferred object to sound so we can play the sound
	// once it's done loading, even if we don't have a buffer currently.
	var sound = GetSoundByHandle(sHandle);
	if (!sound || !sound.buffer) {
		return;  // fail silently
	}
	
	// Create an object with a source, volume control, and panner.
	//
	// NOTE: "source.noteOn()" cannot be called multiple times with the same source,
	//       so we have to create a new source every time.
	var source = snd.ctx.createBufferSource();
//	panner = snd.ctx.createPanner();
//	
//	// Connect the sound source to the panner
//	source.connect(panner);
//	// ...and the head bone's connected to the / neck bone...
//	panner.connect(snd.volume_sfx);
	
	source.connect(snd.volume_sfx);
	
// 	if (origin) {
// 		panner.setPosition(origin[0], origin[1], origin[2]);
// 		
// 		// TODO: set listener position to player position
// 		snd.ctx.listener.setPosition(0, 0, 0); // listener is at origin by default
// 	}
	
	// Set the buffer from cache.
	source.buffer = sound.buffer;
		
	// Play the sound immediately.
	source.noteOn(0);
}

/**
 * StartLocalSound
 */
function StartLocalSound(sfx, channelNum) {
	
}

/**
 * StartBackgroundTrack
 */
function StartBackgroundTrack(intro, loop) {
	if (typeof AudioContext === 'undefined') { return; }
	
	// TODO Add a deferred object to sound so we can play the sound
	// once it's done loading, even if we don't have a buffer currently.
	var sound = GetSoundByHandle(sHandle);
	if (!sound || !sound.buffer) {
		return;  // fail silently
	}
	
	// Create an object with a sound source.
	var source = snd.ctx.createBufferSource();
	
	// Connect the sound source to the overall music volume.
	source.connect(snd.volume_music);
	
	// Set whether it loops or not.
	source.loop = loop;
			
	// Set the buffer.
	sound.source.buffer = buffer;
			
	// Play the sound immediately.
	sound.source.noteOn(0);
}

/**
 * StopBackgroundTrack
 */
function StopBackgroundTrack () {
	
}
