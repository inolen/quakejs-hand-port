var snd;

var s_gain,
	s_maxDistance,
	s_rolloff,
	s_volume,
	s_musicVolume;

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
		log('AudioContext not supported!');
		return;
	}

	// Sniff to ensure we can actually play OGG audio.
	var audio = document.createElement('audio');
	if (!audio.canPlayType) {
		return;
	}

	var canPlayOgg = audio.canPlayType('audio/ogg') !== '';
	if (!canPlayOgg) {
		return;
	}

	// Initialize local context.
	snd = new SoundLocals();

	// Register config vars.
	RegisterCvars();

	// Create a new audio context.
	snd.ctx = new AudioContext();

	// Create the main volume.
	snd.volume_main = snd.ctx.createGainNode();
	// Connect the main volume to the "destination"
	// (as in, the speakers or whatever the default output is).
	snd.volume_main.connect(snd.ctx.destination);
	snd.volume_main.gain.value = s_gain();

	// Create separate background music / sound effect volume controls for later on.
	snd.volume_music = snd.ctx.createGainNode();
	snd.volume_music.connect(snd.volume_main);
	snd.volume_music.gain.value = s_musicVolume();

	snd.volume_sfx = snd.ctx.createGainNode();
	snd.volume_sfx.connect(snd.volume_main);
	snd.volume_sfx.gain.value = s_volume();

	CreateDefaultSound();
}

/**
 * RegisterCvars
 */
function RegisterCvars() {
	s_gain          = imp.com_AddCvar('s_gain',          1.0,  0);
	s_graceDistance = imp.com_AddCvar('s_graceDistance', 512,  0);
	s_maxDistance   = imp.com_AddCvar('s_maxDistance',   1024, 0);
	s_rolloff       = imp.com_AddCvar('s_rolloff',       2,    0);
	s_volume        = imp.com_AddCvar('s_volume',        0.7,  CVF.ARCHIVE);
	s_musicVolume   = imp.com_AddCvar('s_musicVolume',   0.5,  CVF.ARCHIVE);
}

/**
 * Shutdown
 */
function Shutdown() {
	if (!snd) {
		return;
	}
}

/**
 * Frame
 */
function Frame() {
	if (!snd) {
		return;
	}

	if (s_volume.modified) {
		snd.volume_main.gain.value = s_volume();
		s_volume.modified = false;
	}

	if (s_musicVolume.modified) {
		snd.volume_music.gain.value = s_musicVolume();
		s_musicVolume.modified = false;
	}
}

/**
 * GetSoundByHandle
 */
function GetSoundByHandle(hSound) {
	// Out of range gets the default model.
	if (hSound < 1 || hSound >= snd.sounds.length) {
		return snd.sounds[0];
	}

	return snd.sounds[hSound];
}

/**
 * RegisterSound
 */
function RegisterSound(name) {
	if (!snd) {
		return;
	}

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
	sound.name = name;

	// Used to help queue up events while loading.
	sound.loading = true;

	imp.sys_ReadFile(name + '.ogg', 'binary', function (err, data) {
		sound.loading = false;

		if (err) {
			log('Failed to load sound', name);
			return;
		}

		snd.ctx.decodeAudioData(data, function (buffer) {
			sound.buffer = buffer;

			// Run any callbacks we've built up while loading.
			for (var i = 0; i < sound.callbacks.length; i++) {
				sound.callbacks[i]();
			}
			sound.callbacks = null;
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
function StartSound(origin, entity_number, hSound) {
	if (!snd) {
		return;
	}
	
	var sound = GetSoundByHandle(hSound);
	
	// Early out if there is no sound for this handle, or it failed to load.
	if (!sound || (!sound.buffer && !sound.loading)) {
		return;  // fail silently
	}
	
	// If the sound is still loading, push this call to a queue to execute
	// it is done.
	if (sound.loading) {
		sound.callbacks.push(_.bind(StartSound, this, origin, entity_number, hSound));
		return;
	}
	
	// Create an object with a source, volume control, and panner.
	//
	// NOTE: "source.noteOn()" cannot be called multiple times with the same source,
	//       so we have to create a new source every time.
	var source = snd.ctx.createBufferSource();
	
	if (!origin) {		
		source.connect(snd.volume_sfx);
	} else {
		var panner = snd.ctx.createPanner();

		panner.connect(snd.volume_sfx);
		panner.setPosition(origin[0], origin[1], origin[2]);
		panner.panningModel = panner.EQUALPOWER;
		panner.distanceModel = panner.LINEAR_DISTANCE;
		panner.refDistance = s_graceDistance();
		panner.maxDistance = s_maxDistance();
		// AP - This appears to be broke, setting this makes sounds always the same volume.
		// panner.rolloffFactor = s_rolloff();

		source.connect(panner);
	}

	// Set the buffer from cache.
	source.buffer = sound.buffer;

	// Play the sound immediately.
	source.noteOn(snd.ctx.currentTime);
}

/**
 * StartLocalSound
 */
function StartLocalSound(sfx, channelNum) {
	if (!snd) {
		return;
	}
}

/**
 * StartBackgroundTrack
 */
function StartBackgroundTrack(hSound, loop) {
	if (!snd) {
		return;
	}
	
	var sound = GetSoundByHandle(hSound);

	// Early out if there is no sound for this handle, or it failed to load.
	if (!sound || (!sound.buffer && !sound.loading)) {
		return;  // fail silently
	}

	// If the sound is still loading, push this call to a queue to execute
	// it is done.
	if (sound.loading) {
		sound.callbacks.push(_.bind(StartBackgroundTrack, this, hSound, loop));
		return;
	}

	// Create an object with a sound source.
	var source = snd.ctx.createBufferSource();

	// Connect the sound source to the overall music volume.
	source.connect(snd.volume_music);

	// Set whether it loops or not.
	source.loop = loop;

	// Set the buffer.
	source.buffer = sound.buffer;

	// Play the sound immediately.
	source.noteOn(0);
}

/**
 * StopBackgroundTrack
 */
function StopBackgroundTrack() {
	if (!snd) {
		return;
	}
}

/**
 * Respatialize
 */
function Respatialize(entityNum, origin, axis) {
	snd.ctx.listener.setPosition(origin[0], origin[1], origin[2]);
	snd.ctx.listener.setOrientation(axis[0][0], axis[0][1], axis[0][2], axis[2][0], axis[2][1], axis[2][2]);
}

/**
 * UpdateEntityPosition
 */
function UpdateEntityPosition(entityNum, origin) {
}