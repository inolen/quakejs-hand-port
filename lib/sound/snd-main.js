var sdl,
	sds;

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

	log('Initializing SND');

	if (window.AudioContext === undefined) {
		sdl = null;
		log('AudioContext not supported!');
		return callback();
	}

	// Sniff to ensure we can actually play OGG audio.
	var audio = document.createElement('audio');
	if (!audio.canPlayType || audio.canPlayType('audio/ogg') === '') {
		sdl = null;
		log('OGG audio not supported');
		return callback();
	}

	// Register config vars.
	RegisterCvars();

	// AudioContexts are not garbage collected, they will live until the document
	// goes away. Due to this, we only initialize it once.
	// https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html#lifetime-AudioContext
	if (!sds) {
		sds = new SoundStatic();

		// Create a new audio context.
		sds.ctx = new window.AudioContext();

		// Create the main volume.
		sds.volume_main = sds.ctx.createGain();
		sds.volume_main.connect(sds.ctx.destination);
		sds.volume_main.gain.value = s_gain.get();

		// Create separate background music / sound effect volume controls for later on.
		sds.volume_music = sds.ctx.createGain();
		sds.volume_music.connect(sds.volume_main);
		sds.volume_music.gain.value = s_musicVolume.get();

		InitSounds();
	}

	// Initialize local context.
	sdl = new SoundLocals();

	callback();
}

/**
 * RegisterCvars
 */
function RegisterCvars() {
	s_gain          = Cvar.AddCvar('s_gain',          1.0,  0);
	s_graceDistance = Cvar.AddCvar('s_graceDistance', 512,  0);
	s_maxDistance   = Cvar.AddCvar('s_maxDistance',   1024, 0);
	s_rolloff       = Cvar.AddCvar('s_rolloff',       2,    0);
	s_volume        = Cvar.AddCvar('s_volume',        0.7,  Cvar.FLAGS.ARCHIVE);
	s_musicVolume   = Cvar.AddCvar('s_musicVolume',   0.5,  Cvar.FLAGS.ARCHIVE);
}

/**
 * Shutdown
 */
function Shutdown(callback) {
	log('Shutdown SND');

	if (!sdl) {
		return callback();
	}

	callback();
}

/**
 * Frame
 */
function Frame() {
	if (!sdl) {
		return;
	}

	if (s_volume.modified()) {
		sds.volume_main.gain.value = s_volume.get();
	}

	if (s_musicVolume.modified()) {
		sds.volume_music.gain.value = s_musicVolume.get();
	}

	UpdateSources();
}

/**
 * UpdateSources
 */
function UpdateSources() {
	for (var i = 0; i < sdl.sources.length; i++) {
		var source = sdl.sources[i];
		var bufsrc = source.bufsrc;

		// Remove source if it's done playing.
		if (bufsrc.playbackState === bufsrc.FINISHED_STATE) {
			sdl.sources.splice(i, 1);
			i--;
			continue;
		}

		// Stop and remove looping sound if 'loopAddedThisFrame' wasn't set.
		if (source.looping && !source.loopAddedThisFrame) {
			source.bufsrc.stop(0);

			sdl.sources.splice(i, 1);
			i--;

			continue;
		}

		// Otherwise, if the source is supposed to be tracking an entity,
		// update its position.
		if (source.tracking) {
			var entity = sdl.entities[source.entityNum];
			source.panner.setPosition(entity.origin[0], entity.origin[1], entity.origin[2]);
		}

		source.loopAddedThisFrame = false;
	}
}

/**
 * InitSounds
 */
function InitSounds() {
	sds.sounds = new AssetCache(GetDefaultSound());
	sds.sounds.onload = LoadSound;
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
	if (!sdl) {
		return callback(0);
	}

	// Default to ogg files.
	name += '.ogg';

	sds.sounds.load(name, callback);
}

/**
 * FindSoundByHandle
 */
function FindSoundByHandle(hSound) {
	return sds.sounds.findByHandle(hSound);
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

		sds.ctx.decodeAudioData(data, function (buffer) {
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
	if (!sdl) {
		return;
	}

	if (origin && entityNum >= 0) {
		error('Must specify either an origin or an entityNum, not both.');
	}

	if (looping) {
		// Don't start a new looping sound if we're already playing it.
		for (var i = 0; i < sdl.sources.length; i++) {
			var source = sdl.sources[i];
			var bufsrc = source.bufsrc;

			if (bufsrc.loop &&
				source.hSound === hSound &&
				((!source.origin && !origin) || (source.origin && origin && vec3.equal(source.origin, origin))) &&
				source.entityNum === entityNum) {
				return sdl.sources[i];
			}
		}
	}

	if (entityNum === sdl.localEntityNum) {
		return StartLocalSound(hSound, looping);
	}

	var sound = FindSoundByHandle(hSound);
	// Early out if there is no sound for this handle, or it failed to load.
	if (!sound || !sound.buffer) {
		return;  // fail silently
	}

	var hSource = sdl.sources.length;
	var source = sdl.sources[hSource] = new SoundSource();
	source.hSound = hSound;
	if (origin) {
		source.origin = vec3.create(origin);
	}
	source.entityNum = entityNum;

	// Setup the system sound source object.
	var bufsrc = source.bufsrc = sds.ctx.createBufferSource();
	bufsrc.buffer = sound.buffer;

	if (looping) {
		bufsrc.loop = true;
	}

	// Set up a position panner.
	var panner = source.panner = sds.ctx.createPanner();

	panner.connect(sds.volume_main);
	panner.panningModel = panner.EQUALPOWER;
	panner.distanceModel = panner.LINEAR_DISTANCE;
	panner.refDistance = s_graceDistance.get();
	panner.maxDistance = s_maxDistance.get();
	// AP - This appears to be broke, setting this makes sounds always the same volume.
	// panner.rolloffFactor = s_rolloff.get();

	// If an origin was passed, set that once, otherwise set the source up
	// to track the entity's position each frame.
	if (origin) {
		panner.setPosition(origin[0], origin[1], origin[2]);
	} else {
		source.tracking = true;

		var entity = sdl.entities[entityNum];
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
	if (!sdl) {
		return;
	}

	var sound = FindSoundByHandle(hSound);

	// Early out if there is no sound for this handle, or it failed to load.
	if (!sound || !sound.buffer) {
		return;  // fail silently
	}

	var hSource = sdl.sources.length;
	var source = sdl.sources[hSource] = new SoundSource();
	source.hSound = hSound;
	source.entityNum = sdl.localEntityNum;

	// Setup the system sound source object.
	var bufsrc = source.bufsrc = sds.ctx.createBufferSource();
	bufsrc.buffer = sound.buffer;
	if (looping) {
		bufsrc.loop = true;
	}

	// Connect the sound source to the sfxvolume.
	bufsrc.connect(sds.volume_main);

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
	if (!sdl || !name) {
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
		var bufsrc = source.bufsrc = sds.ctx.createBufferSource();
		bufsrc.buffer = sound.buffer;
		bufsrc.loop = loop;

		// Connect the sound source to the overall music volume.
		bufsrc.connect(sds.volume_music);

		// Play the sound immediately.
		bufsrc.noteOn(0);
	});
}

/**
 * StopBackgroundTrack
 */
function StopBackgroundTrack() {
	if (!sdl) {
		return;
	}
}


/**
 * Respatialize
 */
function Respatialize(entityNum, origin, axis) {
	if (!sdl) {
		return;
	}

	sdl.localEntityNum = entityNum;

	sds.ctx.listener.setPosition(origin[0], origin[1], origin[2]);
	sds.ctx.listener.setOrientation(axis[0][0], axis[0][1], axis[0][2], axis[2][0], axis[2][1], axis[2][2]);
}

/**
 * UpdateEntityPosition
 */
function UpdateEntityPosition(entityNum, origin) {
	if (!sdl) {
		return;
	}

	if (entityNum < 0 || entityNum > QS.MAX_GENTITIES) {
		error('UpdateEntityPosition: bad entitynum', entityNum);
	}

	vec3.set(origin, sdl.entities[entityNum].origin);
}
