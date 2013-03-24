/**
 * InitModels
 */
function InitModels() {
	re.models = new AssetCache(GetDefaultModel());
	re.models.onload = LoadModel;
}

/**
 * GetDefaultModel
 */
function GetDefaultModel() {
	var defaultModel = new Model();
	defaultModel.type = MOD.BAD;
	return defaultModel;
}

/**
 * RegisterModel
 *
 * Loads in a model for the given name.
 * Zero will be returned if the model fails to load.
 * An entry will be retained for failed models as an
 * optimization to prevent disk rescanning if they are
 * asked for again.
 */
function RegisterModel(name, bmodel, callback) {
	if (!name) {
		log('RegisterModel: null name');
		return callback(0);
	}

	if (_.isFunction(bmodel)) {
		callback = bmodel;
		bmodel = null;
	}

	// Strip extension.
	name = name.replace(/\.[^\/.]+$/, '');

	re.models.load(name, bmodel, callback);
}

/**
 * FindModelByHandle
 */
function FindModelByHandle(handle) {
	return re.models.findByHandle(handle);
}

/**
 * LoadModel
 */
function LoadModel(name, bmodel, callback) {
	// Special case for registering brush models.
	if (name.charAt(0) === '*') {
		var mod = new Model();
		mod.type = MOD.BRUSH;
		mod.name = name;
		mod.bmodel = bmodel;

		callback(null, mod);
		return;
	}

	var filename = name + '.md3';
	LoadMd3(filename, function (err, md3) {
		if (err) {
			return callback(err);
		}

		var mod = new Model();
		mod.type = MOD.MD3;
		mod.name = name;
		mod.md3 = md3;

		callback(null, mod);
	});
}

/**
 * LoadMd3
 */
function LoadMd3(filename, callback) {
	SYS.ReadFile(filename, 'binary', function (err, data) {
		if (err) {
			return callback(err);
		}

		var md3 = MD3Loader.load(data);

		// Load all of the model's shaders.
		var steps = [];

		md3.surfaces.forEach(function (surface) {
			surface.geo = new Md3Geometry();
			surface.geo.surface = surface;

			surface.shaders.forEach(function (shaderName, i) {
				steps.push(function (cb) {
					FindShaderByName(shaderName, -2, CFLAGS.POSITION_LERP, function (shader) {
						surface.shaders[i] = shader;
						cb(null);
					});
				});
			});
		});

		async.parallel(steps, function (err) {
			callback(null, md3);
		});
	}, 'renderer');
}

/**
 * LerpTag
 */
function LerpTag(or, handle, startFrame, endFrame, frac, tagName) {
	var model = FindModelByHandle(handle);

	if (!model.md3) {
		QMath.AxisClear(or.axis);
		vec3.create(or.origin);
		return false;
	}

	var start = MD3Loader.getTag(model.md3, startFrame, tagName);
	var end = MD3Loader.getTag(model.md3, endFrame, tagName);

	if (!start || !end) {
		QMath.AxisClear(or.axis);
		vec3.create(or.origin);
		return false;
	}

	var frontLerp = frac;
	var backLerp = 1 - frac;

	for (var i = 0; i < 3; i++) {
		or.origin[i] = start.origin[i] * backLerp + end.origin[i] * frontLerp;
		or.axis[0][i] = start.axis[0][i] * backLerp + end.axis[0][i] * frontLerp;
		or.axis[1][i] = start.axis[1][i] * backLerp + end.axis[1][i] * frontLerp;
		or.axis[2][i] = start.axis[2][i] * backLerp + end.axis[2][i] * frontLerp;
	}
	vec3.normalize(or.axis[0]);
	vec3.normalize(or.axis[1]);
	vec3.normalize(or.axis[2]);

	return true;
}

/**
 * ModelBounds
 */
function ModelBounds(hModel, mins, maxs) {
	var mod = FindModelByHandle(hModel);

	if(mod.type == MOD.BRUSH) {
		vec3.set(mod.bmodel.bounds[0], mins);
		vec3.set(mod.bmodel.bounds[1], maxs);
		return;
	} else if (mod.type == MOD.MD3) {
		var md3 = mod.md3;
		var frame = md3.frames[0];
		vec3.set(frame.bounds[0], mins);
		vec3.set(frame.bounds[1], maxs);
		return;
	}

	mins[0] = mins[1] = mins[2] = 0;
	maxs[0] = maxs[1] = maxs[2] = 0;
}