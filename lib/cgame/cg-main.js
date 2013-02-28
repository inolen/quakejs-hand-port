var cg,
	cgs,
	hud_model,
	hud_view,
	loading_model,
	loading_view,
	scoreboard_model,
	scoreboard_view,
	currentgame_model;

var cg_fov,
	cg_zoomFov,
	cg_errorDecay,
	cg_nopredict,
	cg_showmiss,
	cg_runpitch,
	cg_runroll,
	cg_bobup,
	cg_bobpitch,
	cg_bobroll,
	cg_thirdPerson,
	cg_thirdPersonAngle,
	cg_thirdPersonRange,
	cg_railTrailTime,
	cg_autoSwitch,
	cg_trueLightning,
	cg_drawCounts,
	cg_drawLagometer,
	cg_crosshairShaders,
	pmove_fixed,
	pmove_msec;

/**
 * log
 */
function log() {
	// Add to HUD events.
	if (hud_model) {
		hud_model.addEvent('print', arguments[0]);
	}

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
function Init(serverMessageNum, serverCommandSequence, clientNum) {
	log('CG Initializing', serverMessageNum, serverCommandSequence, clientNum);

	cg = new ClientGame();
	cg.clientNum = clientNum;

	if (!cgs) {
		cgs = new ClientGameStatic();
	}
	cgs.processedSnapshotNum = serverMessageNum;
	cgs.serverCommandSequence = serverCommandSequence;
	cgs.gameState = CL.GetGameState();

	hud_model         = new UI.HudViewModel();
	hud_view          = UI.CreateView(hud_model, UI.HudViewTemplate);
	loading_model     = new UI.LoadingViewModel();
	loading_view      = UI.CreateView(loading_model, UI.LoadingViewTemplate);
	scoreboard_model  = new UI.ScoreboardViewModel();
	scoreboard_view   = UI.CreateView(scoreboard_model, UI.ScoreboardViewTemplate);
	currentgame_model = new UI.CurrentGameMenuModel();

	RegisterCvars();
	RegisterCommands();

	InitLocalEntities();

	ProcessConfigStrings();

	LoadAssets(function () {
		cg.initialized = true;
	});
}

/**
 * RegisterCvars
 */

function RegisterCvars() {
	cg_fov              = Cvar.AddCvar('cg_fov',              110,   Cvar.FLAGS.ARCHIVE);
	cg_zoomFov          = Cvar.AddCvar('cg_zoomFov',          22.5,  Cvar.FLAGS.ARCHIVE),
	cg_errorDecay       = Cvar.AddCvar('cg_errorDecay',       100,   Cvar.FLAGS.ARCHIVE);
	cg_nopredict        = Cvar.AddCvar('cg_nopredict',        0,     Cvar.FLAGS.ARCHIVE);
	cg_showmiss         = Cvar.AddCvar('cg_showmiss',         0,     Cvar.FLAGS.ARCHIVE);

	cg_runpitch         = Cvar.AddCvar('cg_runpitch',         0.002, Cvar.FLAGS.ARCHIVE);
	cg_runroll          = Cvar.AddCvar('cg_runroll',          0.005, Cvar.FLAGS.ARCHIVE);
	cg_bobup            = Cvar.AddCvar('cg_bobup',            0.005, Cvar.FLAGS.CHEAT);
	cg_bobpitch         = Cvar.AddCvar('cg_bobpitch',         0.002, Cvar.FLAGS.ARCHIVE);
	cg_bobroll          = Cvar.AddCvar('cg_bobroll',          0.002, Cvar.FLAGS.ARCHIVE);

	cg_thirdPerson      = Cvar.AddCvar('cg_thirdPerson',      0,     Cvar.FLAGS.ARCHIVE);
	cg_thirdPersonAngle = Cvar.AddCvar('cg_thirdPersonAngle', 0);
	cg_thirdPersonRange = Cvar.AddCvar('cg_thirdPersonRange', 100);
	cg_railTrailTime    = Cvar.AddCvar('cg_railTrailTime',    400,   Cvar.FLAGS.CHEAT);
	cg_autoSwitch       = Cvar.AddCvar('cg_autoSwitch',       1,     Cvar.FLAGS.ARCHIVE);
	cg_trueLightning    = Cvar.AddCvar('cg_trueLightning',    1,     Cvar.FLAGS.ARCHIVE);
	cg_drawCounts       = Cvar.AddCvar('cg_drawCounts',       0,     Cvar.FLAGS.ARCHIVE);
	cg_drawLagometer    = Cvar.AddCvar('cg_drawLagometer',    0,     Cvar.FLAGS.ARCHIVE);
	cg_crosshairShaders = Cvar.AddCvar('cg_crosshairShaders', 0,     Cvar.FLAGS.CHEAT);
	pmove_fixed         = Cvar.AddCvar('pmove_fixed',         0);
	pmove_msec          = Cvar.AddCvar('pmove_msec',          8);
}

/**
 * Shutdown
 */
function Shutdown() {
	log('Shutting down');
}

/**
 * Frame
 */
function Frame(serverTime) {
	// Wait for the collision / render bsp to load.
	if (!cg.initialized) {
		DrawLoading();
		return;
	}

	cg.time = serverTime;

	ProcessSnapshots();

	if (!cg.snap || (cg.snap.snapFlags & SNAPFLAG_NOT_ACTIVE)) {
		DrawLoading();
		return;
	}

	// Let the client system know our weapon.
	CL.SetUserCmdValue('weapon', cg.weaponSelect);
	CL.SetUserCmdValue('sensitivity', cg.zoomSensitivity);

	// Predicate our local playerstate.
	PredictPlayerState();

	// Decide on third person view.
	cg.renderingThirdPerson = cg_thirdPerson.get() || cg.snap.ps.pm_type === PM.DEAD;

	// Calculate view origin and axis.
	CalcViewValues();
	cg.refdef.time = cg.time;

	// Add network and local entities to the scene.
	if (!cg.hyperspace) {
		AddPacketEntities();
		AddLocalEntities();
	}
	AddViewWeapon(cg.predictedPlayerState);

	// Add buffered sounds.
	PlayBufferedSounds();

	// Update audio positions.
	SND.Respatialize(cg.snap.ps.clientNum, cg.refdef.vieworg, cg.refdef.viewaxis/*, inwater*/);

	cg.frameTime = cg.time - cg.oldTime;
	if (cg.frametime < 0) {
		cg.frametime = 0;
	}
	cg.oldTime = cg.time;

	// Add interpolation info to lagometer.
	AddLagometerFrame();

	// Issue rendering calls.
	RE.RenderScene(cg.refdef);

	Draw2D();
}

/**
 * LoadAssets
 */
function LoadAssets(callback) {
	var steps = [
		LoadWorld,
		RegisterItems,
		RegisterShaders,
		RegisterModels,
		RegisterSounds,
		RegisterClients
	];
	var progress = new Array(steps.length);
	var finished = steps.length;

	var updateProgressBar = function () {
		//
		// Update the UI.
		//
		var total = 0;
		for (var i = 0; i < progress.length; i++) {
			total += progress[i] || 0;
		}

		var percent = Math.round((total / finished) * 100);
		loading_model.progress(percent);

		//
		// Done loading.
		//
		if (total >= finished) {
			StartMusic();
			callback();
		}
	};

	// Set the loading screen map name.
	loading_model.mapName(cgs.mapname);

	// Execute the step's function, updating the progress bar
	// each time it feeds us an update.
	steps.forEach(function (fn, i) {
		fn(function (p) {
			progress[i] = p;
			updateProgressBar();
		});
	});
}

/**
 * LoadWorld
 */
function LoadWorld(progress) {
	CL.LoadBsp(cgs.mapname, function (err, bsp) {
		if (err) {
			return error(err);
		}
		progress(0.25);

		CM.LoadWorld(bsp);
		progress(0.5);

		RE.LoadWorld(bsp, function () {
			progress(0.75);

			RegisterWorldModels(function (f) {
				progress(0.75 + 0.25 * f);
			});
		});
	});
}

function RegisterWorldModels(progress) {
	// Register the inline models.
	var numInlineModels = RE.NumInlineModels();
	cgs.inlineDrawModels = new Array(numInlineModels);
	cgs.inlineModelMidpoints = new Array(numInlineModels);

	var total = numInlineModels - 1;
	var loaded = 0;

	var registerInlineModel = function (i) {
		var name = '*' + i;

		RE.RegisterModel(name, function (hModel) {
			cgs.inlineDrawModels[i] = hModel;

			var mins = vec3.create();
			var maxs = vec3.create();
			RE.ModelBounds(hModel, mins, maxs);

			cgs.inlineModelMidpoints[i] = vec3.createFrom(
				mins[0] + 0.5 * (maxs[0] - mins[0]),
				mins[1] + 0.5 * (maxs[1] - mins[1]),
				mins[2] + 0.5 * (maxs[2] - mins[2])
			);

			progress(++loaded / total);
		});
	};

	for (var i = 1; i < numInlineModels; i++) {
		registerInlineModel(i);
	}
}

/**
 * RegisterItems
 */
function RegisterItems(progress) {
	var total = BG.ItemList.length - 1;
	var loaded = 0;

	var itemLoaded = function (f) {
		if (f >= 1) {
			loaded++;
			f = 0;
		}

		progress((loaded + f) / total);
	};

	for (var i = 1; i < BG.ItemList.length; i++) {
		RegisterItem(i, itemLoaded);
	}
}

function RegisterItem(itemNum, progress) {
	var item = BG.ItemList[itemNum];
	var itemInfo = cg.itemInfo[itemNum];
	if (!item || itemInfo) {
		error('Invalid item number or item already registered');
		return;
	}

	itemInfo = cg.itemInfo[itemNum] = new ItemInfo();

	var total = (item.models ? Object.keys(item.models).length : 0) +
		(item.shaders ? Object.keys(item.shaders).length : 0) +
		(item.gfx ? Object.keys(item.gfx).length : 0) +
		(item.sounds ? Object.keys(item.sounds).length : 0);
	var loaded = 0;

	// Register models.
	if (item.models) {
		_.each(item.models, function (path, key) {
			RE.RegisterModel(path, function (hModel) {
				itemInfo.models[key] = hModel;
				progress(++loaded / total);
			});
		});
	}

	// Register shader.
	if (item.shaders) {
		_.each(item.shaders, function (path, key) {
			RE.RegisterShader(path, function (hShader) {
				itemInfo.shaders[key] = hShader;
				progress(++loaded / total);
			});
		});
	}

	// Register graphics.
	if (item.gfx) {
		_.each(item.gfx, function (path, key) {
			UI.RegisterImage(path, function (hImage) {
				itemInfo.gfx[key] = hImage;
				progress(++loaded / total);
			});
		});
	}

	// Register sounds.
	if (item.sounds) {
		_.each(item.sounds, function (path, key) {
			SND.RegisterSound(item.sounds[key], function (hSound) {
				itemInfo.sounds[key] = hSound;
				progress(++loaded / total);
			});
		});
	}

	// Copy over misc fields.
	itemInfo.trailTime = item.trailTime;
	itemInfo.trailRadius = item.trailRadius;
	itemInfo.flashDlightColor = item.flashDlightColor;
	itemInfo.missileDlightIntensity = item.missileDlightIntensity;
	itemInfo.missileDlightColor = item.missileDlightColor;

	// if (item.giType === IT.WEAPON && key === 'primary') {
	// 	// Calc midpoint for rotation.
	// 	var mins = vec3.create();
	// 	var maxs = vec3.create();
	// 	RE.ModelBounds(itemInfo.models.primary, mins, maxs );
	// 	for (var i = 0; i < 3; i++) {
	// 		itemInfo.weaponMidpoint[i] = mins[i] + 0.5 * ( maxs[i] - mins[i] );
	// 	}
	// }
}

/**
 * RegisterShaders
 */
function RegisterShaders(progress) {
	var shaders = {
		// Powerup shaders.
		redQuadShader:          'powerups/blueflag',
		quadShader:             'powerups/quad',
		quadWeaponShader:       'powerups/quadWeapon',
		battleSuitShader:       'powerups/battleSuit',
		battleWeaponShader:     'powerups/battleWeapon',
		invisShader:            'powerups/invisibility',
		regenShader:            'powerups/regen',
		hastePuffShader:        'hasteSmokePuff',

		// General weapon fx.
		smokePuffShader:        'smokePuff',
		shotgunSmokePuffShader: 'shotgunSmokePuff',
		plasmaBallShader:       'sprites/plasma1',

		// Gibs.
		bloodExplosionShader:   'bloodExplosion',
		bloodTrailShader:       'bloodTrail',
		bloodMarkShader:        'bloodMark',

		// Teleporter fx.
		teleportEffectShader:   'teleportEffect',

		// Wall marks.
		bulletMarkShader:       'gfx/damage/bullet_mrk',
		burnMarkShader:         'gfx/damage/burn_med_mrk',
		holeMarkShader:         'gfx/damage/hole_lg_mrk',
		energyMarkShader:       'gfx/damage/plasma_mrk',
		shadowMarkShader:       'markShadow'
	};

	// if (cgs.gametype >= GT.TEAM) {
		shaders.friendShader = 'sprites/foe';
	// }

	var total = Object.keys(shaders).length;
	var loaded = 0;

	_.each(shaders, function (path, key) {
		RE.RegisterShader(path, function (hShader) {
			cgs.media[key] = hShader;
			progress(++loaded / total);
		});
	});

	return total;
}

/**
 * RegisterModels
 */
function RegisterModels(progress) {
	var models = {
		// General weapon fx.
		bulletFlashModel:    'models/weaphits/bullet',
		ringFlashModel:      'models/weaphits/ring02',
		dishFlashModel:      'models/weaphits/boom01',

		// Gibs.
		gibAbdomen:          'models/gibs/abdomen',
		gibArm:              'models/gibs/arm',
		gibChest:            'models/gibs/chest',
		gibFist:             'models/gibs/fist',
		gibFoot:             'models/gibs/foot',
		gibForearm:          'models/gibs/forearm',
		gibIntestine:        'models/gibs/intestine',
		gibLeg:              'models/gibs/leg',
		gibSkull:            'models/gibs/skull',
		gibBrain:            'models/gibs/brain',

		// Teleporter fx.
		teleportEffectModel: 'models/misc/telep'
	};

	var total = Object.keys(models).length;
	var loaded = 0;

	_.each(models, function (path, key) {
		RE.RegisterModel(path, function (hModel) {
			cgs.media[key] = hModel;
			progress(++loaded / total);
		});
	});

	// Register all the server specified models.
	// for (var i = 1; i < MAX_MODELS; i++) {
	// 	const char		*modelName;

	// 	modelName = CG_Configstring( CS_MODELS+i );
	// 	if ( !modelName[0] ) {
	// 		break;
	// 	}

	// 	cgs.gameModels[i] = trap_R_RegisterModel( modelName );
	// }
}

/**
 * RegisterSounds
 */
function RegisterSounds(progress) {
	var sounds = {
		// Warmup.
		oneMinuteSound:        'sound/feedback/1_minute',
		fiveMinuteSound:       'sound/feedback/5_minute',
		suddenDeathSound:      'sound/feedback/sudden_death',
		oneFragSound:          'sound/feedback/1_frag',
		twoFragSound:          'sound/feedback/2_frags',
		threeFragSound:        'sound/feedback/3_frags',
		count3Sound:           'sound/feedback/three',
		count2Sound:           'sound/feedback/two',
		count1Sound:           'sound/feedback/one',
		countFightSound:       'sound/feedback/fight',
		countPrepareSound:     'sound/feedback/prepare',
		countPrepareTeamSound: 'sound/feedback/prepare_team',

		// Gibs.
		gibSound:              'sound/player/gibsplt1',
		gibBounce1Sound:       'sound/player/gibimp1',
		gibBounce2Sound:       'sound/player/gibimp2',
		gibBounce3Sound:       'sound/player/gibimp3',

		// Teleporter effects.
		teleInSound:           'sound/world/telein',
		teleOutSound:          'sound/world/teleout',
		respawnSound:          'sound/items/respawn1',

		// Weapons.
		selectSound:           'sound/weapons/change',
		noAmmoSound:           'sound/weapons/noammo',

		// Powerups.
		n_healthSound:         'sound/items/n_health',

		// Pain.
		gurp1Sound:            'sound/player/gurp1',
		gurp2Sound:            'sound/player/gurp2',
		hitSound:              'sound/feedback/hit',

		talkSound:             'sound/player/talk',

		watrInSound:           'sound/player/watr_in',
		watrOutSound:          'sound/player/watr_out',
		watrUnSound:           'sound/player/watr_un',
		jumpPadSound:          'sound/world/jumppad'
	};

	// Load footstep sounds.
	for (var i = 0; i < 4; i++) {
		sounds['footstep' + FOOTSTEP.NORMAL + i] = 'sound/player/footsteps/step' + (i + 1);
		sounds['footstep' + FOOTSTEP.BOOT + i] = 'sound/player/footsteps/boot' + (i + 1);
		sounds['footstep' + FOOTSTEP.FLESH + i] = 'sound/player/footsteps/flesh' + (i + 1);
		sounds['footstep' + FOOTSTEP.MECH + i] = 'sound/player/footsteps/mech' + (i + 1);
		sounds['footstep' + FOOTSTEP.ENERGY + i] = 'sound/player/footsteps/energy' + (i + 1);
		sounds['footstep' + FOOTSTEP.SPLASH + i] = 'sound/player/footsteps/splash' + (i + 1);
		sounds['footstep' + FOOTSTEP.METAL + i] = 'sound/player/footsteps/clank' + (i + 1);
	}

	// Load gametype specific sounds.
	// if (cgs.gametype >= GT.TEAM) {
		sounds.captureAwardSound    = 'sound/teamplay/flagcapture_yourteam';
		sounds.redLeadsSound        = 'sound/feedback/redleads';
		sounds.blueLeadsSound       = 'sound/feedback/blueleads';
		sounds.teamsTiedSound       = 'sound/feedback/teamstied';
		sounds.hitTeamSound         = 'sound/feedback/hit_teammate';

		sounds.redScoredSound       = 'sound/teamplay/voc_red_scores';
		sounds.blueScoredSound      = 'sound/teamplay/voc_blue_scores';

		sounds.captureYourTeamSound = 'sound/teamplay/flagcapture_yourteam';
		sounds.captureOpponentSound = 'sound/teamplay/flagcapture_opponent';

		sounds.returnYourTeamSound  = 'sound/teamplay/flagreturn_yourteam';
		sounds.returnOpponentSound  = 'sound/teamplay/flagreturn_opponent';

		sounds.takenYourTeamSound   = 'sound/teamplay/flagtaken_yourteam';
		sounds.takenOpponentSound   = 'sound/teamplay/flagtaken_opponent';

		// if (cgs.gametype == GT.CTF) {
			sounds.redFlagReturnedSound       = 'sound/teamplay/voc_red_returned';
			sounds.blueFlagReturnedSound      = 'sound/teamplay/voc_blue_returned';
			sounds.enemyTookYourFlagSound     = 'sound/teamplay/voc_enemy_flag';
			sounds.yourTeamTookEnemyFlagSound = 'sound/teamplay/voc_team_flag';
		// }

		// if (cgs.gametype == GT.NFCTF) {
			// FIXME: get a replacement for this sound ?
			sounds.neutralFlagReturnedSound = 'sound/teamplay/flagreturn_opponent';
			sounds.yourTeamTookTheFlagSound = 'sound/teamplay/voc_team_1flag';
			sounds.enemyTookTheFlagSound    = 'sound/teamplay/voc_enemy_1flag';
		// }

		// if (cgs.gametype == GT.CTF || cgs.gametype == GT.NFCTF) {
			sounds.youHaveFlagSound = 'sound/teamplay/voc_you_flag';
			sounds.holyShitSound    = 'sound/feedback/voc_holyshit';
		// }

		sounds.youHaveFlagSound = 'sound/teamplay/voc_you_flag';
		sounds.holyShitSound    = 'sound/feedback/voc_holyshit';
	// }

	// Actually load the sounds assets, updating our progress as we go.
	var total = Object.keys(sounds).length;
	var loaded = 0;

	_.each(sounds, function (path, key) {
		SND.RegisterSound(sounds[key], function (hSound) {
			cgs.media[key] = hSound;
			progress(++loaded / total);
		});
	});
}

/**
 * RegisterClients
 */
function RegisterClients(progress) {
	var total = 0;
	for (var i = 0; i < MAX_CLIENTS; i++) {
		var cs = Configstring('player:' + i);
		if (cs) {
			total++;
		}
	}

	var loaded = 0;
	var clientLoaded = function () {
		progress(++loaded / total);
	};

	for (var i = 0; i < MAX_CLIENTS; i++) {
		var cs = Configstring('player:' + i);
		if (!cs) {
			continue;
		}

		NewClientInfo(i, clientLoaded);
	}
}

/**
 * HandleEscape
 */
function HandleEscape() {
	if (!UI.PeekMenu()) {
		var tab_model = new UI.TabMenuModel();

		tab_model.title('ingame');
		tab_model.addTab('Current game', currentgame_model,          UI.CurrentGameMenuTemplate);
		tab_model.addTab('Settings',     new UI.SettingsMenuModel(), UI.SettingsMenuTemplate);

		var tab_view = UI.CreateView(tab_model, UI.TabMenuTemplate);
		UI.PushMenu(tab_view);
	} else {
		UI.PopAllMenus();
	}
}

/**
 * FindItemInfo
 */
function FindItemInfo(type, tag) {
	for (var i = 0; i < BG.ItemList.length; i++) {
		if (BG.ItemList[i].giType === type && BG.ItemList[i].giTag === tag) {
			return cg.itemInfo[i];
		}
	}

	return null;
}

/**
 * Configstring
 */
function Configstring(key) {
	return cgs.gameState[key];
}

/**
 * StartMusic
 */
function StartMusic() {
	var music = Configstring('music');
	SND.StartBackgroundTrack(music, true);
}

/**
 * AddBufferedSound
 */
function AddBufferedSound(sfx) {
	if (!sfx) {
		return;
	}

	cg.soundBuffer[cg.soundBufferIn] = sfx;
	cg.soundBufferIn = (cg.soundBufferIn + 1) % MAX_SOUNDBUFFER;
	if (cg.soundBufferIn === cg.soundBufferOut) {
		cg.soundBufferOut++;
	}
}

/**
 * PlayBufferedSounds
 */
function PlayBufferedSounds() {
	if (cg.soundTime < cg.time) {
		if (cg.soundBufferOut !== cg.soundBufferIn && cg.soundBuffer[cg.soundBufferOut]) {
			SND.StartLocalSound(cg.soundBuffer[cg.soundBufferOut]/*, CHAN_ANNOUNCER*/);
			cg.soundBuffer[cg.soundBufferOut] = 0;
			cg.soundBufferOut = (cg.soundBufferOut + 1) % MAX_SOUNDBUFFER;
			cg.soundTime = cg.time + 750;
		}
	}
}

/**
* BGExports
*/
function BGExports() {
	return {
		error: CL.Error
	};
}