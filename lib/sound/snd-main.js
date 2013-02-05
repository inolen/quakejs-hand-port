var snd;

/**
 * log
 */
function log() {
	CL.Log.apply(this, arguments);
}

/**
 * error
 */
function error(str) {
	CL.Error(str);
}

/**
 * Init
 */
function Init(callback) {
	// Detect if the audio context is supported.
	window.AudioContext = (
		window.AudioContext ||
		window.webkitAudioContext ||
		window.mozAudioContext ||
		undefined
	);

	if (window.AudioContext === undefined) {
		log('AudioContext not supported!');
		return callback();
	}

	// Sniff to ensure we can actually play OGG audio.
	var audio = document.createElement('audio');
	if (!audio.canPlayType || audio.canPlayType('audio/ogg') === '') {
		log('OGG audio not supported');
		return callback();
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
	snd.volume_main.gain.value = s_gain.getAsFloat();

	// Create separate background music / sound effect volume controls for later on.
	snd.volume_music = snd.ctx.createGainNode();
	snd.volume_music.connect(snd.volume_main);
	snd.volume_music.gain.value = s_musicVolume.getAsFloat();

	snd.volume_sfx = snd.ctx.createGainNode();
	snd.volume_sfx.connect(snd.volume_main);
	snd.volume_sfx.gain.value = s_volume.getAsFloat();

	InitSounds();

	callback();
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

	if (s_volume.modified()) {
		snd.volume_main.gain.value = s_volume.getAsFloat();
	}

	if (s_musicVolume.modified()) {
		snd.volume_music.gain.value = s_musicVolume.getAsFloat();
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

		// Stop and remove looping sound if 'loopAddedThisFrame' wasn't set.
		if (source.looping && !source.loopAddedThisFrame) {
			source.bufsrc.stop(0);

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

		source.loopAddedThisFrame = false;
	}
}

/**
 * InitSounds
 */
function InitSounds() {
	snd.sounds = new AssetCache(GetDefaultSound());
	snd.sounds.on('load', LoadSound);
}

/**
 * GetDefaultSound
 */
function GetDefaultSound() {
	var sound = new Sound();
	return sound;
}

/**
 * RegisterSound
 */
function RegisterSound(name, callback) {
	if (!snd) {
		return callback(0);
	}

	// Default to ogg files.
	name += '.ogg';

	snd.sounds.load(name, callback);
}

/**
 * FindSoundByHandle
 */
function FindSoundByHandle(hSound) {
	return snd.sounds.findByHandle(hSound);
}

/**
 * LoadSound
 */
function LoadSound(name, callback) {
	if (!name) {
		return callback(new Error('Empty texture name'));
	}

	SYS.ReadFile(name, 'binary', function (err, data) {
		if (err) {
			log('Failed to load sound \'' + name + '\'');
			return callback(err);
		}

		snd.ctx.decodeAudioData(data, function (buffer) {
			var sound = new Sound();
			sound.name = name;
			sound.buffer = buffer;

			callback(null, sound);
		});
	});
}

/**
 * StartSound
 */
function StartSound(origin, entityNum, hSound, looping) {
	if (!snd) {
		return;
	}

	if (origin && entityNum >= 0) {
		error('Must specify either an origin or an entityNum, not both.');
	}

	if (looping) {
		// Don't start a new looping sound if we're already playing it.
		for (var i = 0; i < snd.sources.length; i++) {
			var source = snd.sources[i];
			var bufsrc = source.bufsrc;

			if (source.hSound === hSound &&
				((!source.origin && !origin) || (source.origin && origin && vec3.equal(source.origin, origin))) &&
				source.entityNum === entityNum) {
				return snd.sources[i];
			}
		}
	}

	if (entityNum === snd.localEntityNum) {
		return StartLocalSound(hSound, looping);
	}

	var sound = FindSoundByHandle(hSound);
	// Early out if there is no sound for this handle, or it failed to load.
	if (!sound || !sound.buffer) {
		return;  // fail silently
	}

	var hSource = snd.sources.length;
	var source = snd.sources[hSource] = new SoundSource();
	source.hSound = hSound;
	if (origin) {
		source.origin = vec3.create(origin);
	}
	source.entityNum = entityNum;

	// Setup the system sound source object.
	var bufsrc = source.bufsrc = snd.ctx.createBufferSource();
	bufsrc.buffer = sound.buffer;

	if (looping) {
		bufsrc.looping = true; // deprecated
		bufsrc.loop = true;
	}

	// Set up a position panner.
	var panner = source.panner = snd.ctx.createPanner();

	panner.connect(snd.volume_sfx);
	panner.panningModel = panner.EQUALPOWER;
	panner.distanceModel = panner.LINEAR_DISTANCE;
	panner.refDistance = s_graceDistance.getAsFloat();
	panner.maxDistance = s_maxDistance.getAsFloat();
	// AP - This appears to be broke, setting this makes sounds always the same volume.
	// panner.rolloffFactor = s_rolloff.getAsFloat();

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
	bufsrc.start(0);

	return source;
}

/**
 * StartLocalSound
 */
function StartLocalSound(hSound, looping) {
	if (!snd) {
		return;
	}

	var sound = FindSoundByHandle(hSound);

	// Early out if there is no sound for this handle, or it failed to load.
	if (!sound || !sound.buffer) {
		return;  // fail silently
	}

	var hSource = snd.sources.length;
	var source = snd.sources[hSource] = new SoundSource();
	source.hSound = hSound;
	source.entityNum = snd.localEntityNum;

	// Setup the system sound source object.
	var bufsrc = source.bufsrc = snd.ctx.createBufferSource();
	bufsrc.buffer = sound.buffer;
	bufsrc.connect(snd.volume_sfx);

	if (looping) {
		bufsrc.looping = true; // deprecated
		bufsrc.loop = true;
	}

	// Play the sound immediately.
	bufsrc.start(0);

	return source;
}

/*
 * AddLoopingSound
 */
function AddLoopingSound(origin, entityNum, velocity, hSound) {
	var source = StartSound(origin, entityNum, hSound, true);

	source.loopAddedThisFrame = true;
	source.looping = true;
}

/**
 * StartBackgroundTrack
 */
function StartBackgroundTrack(name, loop) {
	if (!snd || !name) {
		return;
	}

	RegisterSound(name, function (hSound) {
		var sound = FindSoundByHandle(hSound);
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
	});
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

	if (entityNum < 0 || entityNum > QS.MAX_GENTITIES) {
		error('UpdateEntityPosition: bad entitynum', entityNum);
	}

	vec3.set(origin, snd.entities[entityNum].origin);
}
