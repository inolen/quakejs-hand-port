var snd;

var s_gain,
	s_graceDistance,
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
 * error
 */
function error(str) {
	com.Error(ERR.DROP, str);
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

	if (window.AudioContext === undefined) {
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
	snd.ctx = new window.AudioContext();

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
	s_gain          = com.AddCvar('s_gain',          1.0,  0);
	s_graceDistance = com.AddCvar('s_graceDistance', 512,  0);
	s_maxDistance   = com.AddCvar('s_maxDistance',   1024, 0);
	s_rolloff       = com.AddCvar('s_rolloff',       2,    0);
	s_volume        = com.AddCvar('s_volume',        0.7,  CVF.ARCHIVE);
	s_musicVolume   = com.AddCvar('s_musicVolume',   0.5,  CVF.ARCHIVE);
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

	UpdateSources();
}

/**
 * UpdateSources
 */
function UpdateSources() {
	for (var i = 0; i < snd.sources.length; i++) {
		var source = snd.sources[i];
		var bufsrc = source.bufsrc;

		// Remove source if it's done playing.
		if (bufsrc.playbackState === bufsrc.FINISHED_STATE) {
			snd.sources.splice(i, 1);
			i--;
			continue;
		}

		// Otherwise, if the source is supposed to be tracking an entity,
		// update its position.
		if (source.tracking) {
			var entity = snd.entities[source.entityNum];
			source.panner.setPosition(entity.origin[0], entity.origin[1], entity.origin[2]);
		}
	}
}

/**
 * CreateDefaultSound
 */
function CreateDefaultSound() {
	snd.sounds[0] = new Sound();
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
function RegisterSound(name, callback) {
	if (!snd) {
		return callback(0);
	}

	if (!name) {
		return callback(0);
	}

	// Search the currently loaded models.
	for (var hSound = 1; hSound < snd.sounds.length; hSound++) {
		var sound = snd.sounds[hSound];

		if (sound.name === name) {
			// Push callback, it will fire immediately if
			// the deferred has already resolved.
			sound.promise.then(callback);

			return hSound;
		}
	}

	// Create new sound.
	var deferred = $.Deferred();

	var hSound = snd.sounds.length;
	var sound = snd.sounds[hSound] = new Sound();
	sound.name = name;
	sound.promise = deferred.promise();

	// Push callback.
	sound.promise.then(callback);

	sys.ReadFile(name + '.ogg', 'binary', function (err, data) {
		if (err) {
			log('Failed to load sound', name);
			deferred.resolve(0);
			return;
		}

		snd.ctx.decodeAudioData(data, function (buffer) {
			sound.buffer = buffer;

			// Trigger all callbacks.
			deferred.resolve(hSound);
		});
	});

	return hSound;
}

/**
 * StartSound
 */
function StartSound(origin, entityNum, hSound) {
	if (!snd) {
		return;
	}

	if (origin && entityNum >= 0) {
		error('Must specify either an origin or an entityNum, not both.');
	}

	if (entityNum === snd.localEntityNum) {
		StartLocalSound(hSound);
		return;
	}

	var sound = GetSoundByHandle(hSound);
	// Early out if there is no sound for this handle, or it failed to load.
	if (!sound || !sound.buffer) {
		return;  // fail silently
	}

	var hSource = snd.sources.length;
	var source = snd.sources[hSource] = new SoundSource();
	source.entityNum = entityNum;

	// Setup the system sound source object.
	var bufsrc = source.bufsrc = snd.ctx.createBufferSource();
	bufsrc.buffer = sound.buffer;

	// Set up a position panner.
	var panner = source.panner = snd.ctx.createPanner();

	panner.connect(snd.volume_sfx);
	panner.panningModel = panner.EQUALPOWER;
	panner.distanceModel = panner.LINEAR_DISTANCE;
	panner.refDistance = s_graceDistance();
	panner.maxDistance = s_maxDistance();
	// AP - This appears to be broke, setting this makes sounds always the same volume.
	// panner.rolloffFactor = s_rolloff();

	// If an origin was passed, set that once, otherwise set the source up
	// to track the entity's position each frame.
	if (origin) {
		panner.setPosition(origin[0], origin[1], origin[2]);
	} else {
		source.tracking = true;

		var entity = snd.entities[entityNum];
		panner.setPosition(entity.origin[0], entity.origin[1], entity.origin[2]);
	}

	bufsrc.connect(panner);

	// Play the sound immediately.
	bufsrc.noteOn(snd.ctx.currentTime);
}

/**
 * StartLocalSound
 */
function StartLocalSound(hSound) {
	if (!snd) {
		return;
	}

	var sound = GetSoundByHandle(hSound);
	// Early out if there is no sound for this handle, or it failed to load.
	if (!sound || !sound.buffer) {
		return;  // fail silently
	}

	var hSource = snd.sources.length;
	var source = snd.sources[hSource] = new SoundSource();

	// Setup the system sound source object.
	var bufsrc = source.bufsrc = snd.ctx.createBufferSource();
	bufsrc.buffer = sound.buffer;
	bufsrc.connect(snd.volume_sfx);

	// Play the sound immediately.
	bufsrc.noteOn(snd.ctx.currentTime);
}

/**
 * AddLoopingSound
 */
function AddLoopingSound (entityNum, origin, velocity, sfx) {
//	if (si.AddLoopingSound) {
//		si.AddLoopingSound(entityNum, origin, velocity, sfx);
//	}
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
	if (!sound || !sound.buffer) {
		return;  // fail silently
	}

	var source = new SoundSource();

	// Setup the system sound source object.
	var bufsrc = source.bufsrc = snd.ctx.createBufferSource();
	bufsrc.buffer = sound.buffer;
	bufsrc.loop = loop;

	// Connect the sound source to the overall music volume.
	bufsrc.connect(snd.volume_music);

	// Play the sound immediately.
	bufsrc.noteOn(0);
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
	if (!snd) {
		return;
	}

	snd.localEntityNum = entityNum;

	snd.ctx.listener.setPosition(origin[0], origin[1], origin[2]);
	snd.ctx.listener.setOrientation(axis[0][0], axis[0][1], axis[0][2], axis[2][0], axis[2][1], axis[2][2]);
}

/**
 * UpdateEntityPosition
 */
function UpdateEntityPosition(entityNum, origin) {
	if (!snd) {
		return;
	}

	if (entityNum < 0 || entityNum > MAX_GENTITIES) {
		error('UpdateEntityPosition: bad entitynum', entityNum);
	}

	vec3.set(origin, snd.entities[entityNum].origin);
}
