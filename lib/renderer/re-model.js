/**
 * InitModels
 */
function InitModels() {
	var mod = re.models[0] = new Model();
	mod.type = MOD.BAD;
}

/**
 * GetModelByHandle
 */
function GetModelByHandle(index) {
	// Out of range gets the default model.
	if (index < 1 || index >= re.models.length) {
		return re.models[0];
	}

	return re.models[index];
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
		return callback(null, 0);
	}

	// bmodel param is only used for loading brush
	// models in re-bsp.
	if (_.isFunction(bmodel)) {
		callback = bmodel;
		bmodel = null;
	}

	FindModelByName(name, bmodel, function (err, mod) {
		var hModel = re.models.indexOf(mod);
		callback(err, hModel);
	});
}

/**
 * FindModelByName
 */
function FindModelByName(name, bmodel, callback) {
	// Search the currently loaded models.
	for (var hModel = 1; hModel < re.models.length; hModel++) {
		var mod = re.models[hModel];
		if (mod.name === name) {
			return callback(null, mod);
		}
	}

	// Create new model.
	var mod = new Model();
	mod.name = name;

	re.models.push(mod);

	if (bmodel !== null) {
		mod.type = MOD.BRUSH;
		mod.bmodel = bmodel;
		return callback(null, mod);
	}

	var filename = name.substr(0, name.lastIndexOf('.')) || name;
	filename = filename + '.md3';

	LoadMd3(filename, function (err, md3) {
		if (err) {
			log('Failed to load model \'' + name + '\'');
			return callback(err, re.models[0]);
		}

		mod.type = MOD.MD3;
		mod.md3 = md3;

		callback(null, mod);
	});
}

/**
 * LoadMd3
 */
function LoadMd3(filename, callback) {
	var md3 = new Md3();

	sys.ReadFile(filename, 'binary', function (err, data) {
		if (err) {
			return callback(err);
		}

		var bb = new ByteBuffer(data, ByteBuffer.LITTLE_ENDIAN);

		// Load the md3's header.
		var header = new Md3Header();
		header.ident = bb.readInt();
		header.version = bb.readInt();

		if (header.version !== MD3_VERSION) {
			return callback(new Error('LoadMd3: ' + filename + ' has wrong version (' + header.version + ' should be ' + MD3_VERSION + ')'));
		}

		header.name = bb.readASCIIString(MAX_QPATH);
		header.flags = bb.readInt();
		header.numFrames = bb.readInt();
		header.numTags = bb.readInt();
		header.numSurfaces = bb.readInt();
		header.numSkins = bb.readInt();
		header.ofsFrames = bb.readInt();
		header.ofsTags = bb.readInt();
		header.ofsSurfaces = bb.readInt();
		header.ofsEnd = bb.readInt();

		// Validate the header.
		if (header.numFrames < 1) {
			return callback(new Error('LoadMd3: ' + filename + ' has no frames'));
		}

		md3.name = header.name;
		md3.frames = new Array(header.numFrames);
		md3.tags = new Array(header.numFrames * header.numTags);
		md3.surfaces = new Array(header.numSurfaces);
		md3.skins = new Array(header.numSkins);

		// Read all of the frames.
		bb.index = header.ofsFrames;

		for (var i = 0; i < header.numFrames; i++) {
			var frame = md3.frames[i] = new Md3Frame();
			for (var j = 0; j < 6; j++) {
				frame.bounds[Math.floor(j/3)][j % 3] = bb.readFloat();
			}
			for (var j = 0; j < 3; j++) {
				frame.localOrigin[j] = bb.readFloat();
			}
			frame.radius = bb.readFloat();
			frame.name = bb.readASCIIString(16);
		}

		// Read all of the tags.
		bb.index = header.ofsTags;

		for (var i = 0; i < header.numFrames * header.numTags; i++) {
			var tag = md3.tags[i] = new Md3Tag();
			tag.name = bb.readASCIIString(MAX_QPATH);

			for (var j = 0; j < 3; j++) {
				tag.origin[j] = bb.readFloat();
			}
			for (var j = 0; j < 9; j++) {
				tag.axis[Math.floor(j/3)][j % 3] = bb.readFloat();
			}
		}

		// Read all of the meshes.
		var meshOffset = header.ofsSurfaces;

		for (var i = 0; i < header.numSurfaces; i++) {
			bb.index = meshOffset;

			// Load this surface's header.
			var surfheader = new Md3SurfaceHeader();
			surfheader.ident = bb.readInt();
			surfheader.name = bb.readASCIIString(MAX_QPATH);
			surfheader.flags = bb.readInt();
			surfheader.numFrames = bb.readInt();
			surfheader.numShaders = bb.readInt();
			surfheader.numVerts = bb.readInt();
			surfheader.numTriangles = bb.readInt();
			surfheader.ofsTriangles = bb.readInt();
			surfheader.ofsShaders = bb.readInt();
			surfheader.ofsSt = bb.readInt();
			surfheader.ofsXyzNormals = bb.readInt();
			surfheader.ofsEnd = bb.readInt();

			// Calidate the surface's header.
			if (surfheader.numVerts > SHADER_MAX_VERTEXES) {
				return callback(new Error('LoadMd3: ' + filename + ' has more than ' + SHADER_MAX_VERTEXES + ' verts on a surface (' + surfheader.numVerts + ')'));
			}

			if (surfheader.numTriangles * 3 > SHADER_MAX_INDEXES) {
				return callback(new Error('LoadMd3: ' + filename + ' has more than ' + (SHADER_MAX_INDEXES / 3) + ' triangles on a surface (' + surfheader.numTriangles + ')'));
			}

			//
			var surf = md3.surfaces[i] = new Md3Surface();
			// Strip off a trailing _1 or _2
			// this is a crutch for q3data being a mess.
			surf.name = surfheader.name.toLowerCase().replace(/_\d+/, '');
			surf.numFrames = surfheader.numFrames;
			surf.numVerts = surfheader.numVerts;
			surf.shaders = new Array(surfheader.numShaders);
			surf.indexes = new Array(surfheader.numTriangles * 3);
			surf.st = new Array(surfheader.numVerts);
			surf.xyz = new Array(surfheader.numFrames * surfheader.numVerts);
			surf.normals = new Array(surfheader.numFrames * surfheader.numVerts);

			surf.geo = new Md3Geometry();
			surf.geo.surface = surf;

			// Register all the shaders.
			bb.index = meshOffset + surfheader.ofsShaders;

			for (var j = 0; j < surfheader.numShaders; j++) {
				// Strip extension.
				var name = bb.readASCIIString(MAX_QPATH).replace(/\.[^\/.]+$/, '');
				surf.shaders[j] = name;
			}

			// Read all of the triangles.
			bb.index = meshOffset + surfheader.ofsTriangles;

			for (var j = 0; j < surfheader.numTriangles; j++) {
				for (var k = 0; k < 3; k++) {
					surf.indexes[j * 3 + k] = bb.readInt();
				}
			}

			// Read all of the ST coordinates.
			bb.index = meshOffset + surfheader.ofsSt;

			for (var j = 0; j < surfheader.numVerts; j++) {
				var st = surf.st[j] = [0, 0];

				st[0] = bb.readFloat();
				st[1] = bb.readFloat();
			}

			// Read all of the xyz normals.
			bb.index = meshOffset + surfheader.ofsXyzNormals;

			for (var j = 0; j < surfheader.numFrames * surfheader.numVerts; j++) {
				var xyz = surf.xyz[j] = vec3.create();
				var normal = surf.normals[j] = vec3.create();

				for (var k = 0; k < 3; k++) {
					xyz[k] = bb.readShort() * MD3_XYZ_SCALE;
				}

				// Convert from spherical coordinates to normalized vec3.
				var zenith = bb.readByte();
				var azimuth = bb.readByte();

				var lat = zenith * (2 * Math.PI) / 255;
				var lng = azimuth * (2 * Math.PI) / 255;

				normal[0] = Math.cos(lng) * Math.sin(lat);
				normal[1] = Math.sin(lng) * Math.sin(lat);
				normal[2] = Math.cos(lat);
				vec3.normalize(normal);
			}

			meshOffset += surfheader.ofsEnd;
		}

		// Load all of the model's shaders.
		var steps = [];

		md3.surfaces.forEach(function (surface) {
			surface.shaders.forEach(function (shaderName, i) {
				steps.push(function (cb) {
					FindShaderByName(shaderName, SF.LIGHTMAP_GRID | SF.POSITION_LERP, function (err, shader) {
						surface.shaders[i] = shader;
						cb(null, shader);
					});
				});
			});
		});

		async.parallel(steps, function (err) {
			callback(err, md3);
		});
	}, 'renderer');
}

/**
 * GetTag
 */
function GetTag(md3, frame, tagName) {
	if (frame >= md3.frames.length) {
		// It is possible to have a bad frame while changing models, so don't error.
		frame = md3.frames.length - 1;
	}

	var numTags = md3.tags.length / md3.frames.length;
	var offset = frame * numTags;

	for (var i = 0; i < numTags; i++) {
		var tag = md3.tags[offset + i];
		if (tag.name === tagName) {
			return tag;  // found it
		}
	}

	return null;
}

/**
 * LerpTag
 */
function LerpTag(or, handle, startFrame, endFrame, frac, tagName) {
	var model = GetModelByHandle(handle);

	if (model.type === MOD.BAD) {
		return false;
	}

	if (!model.md3) {
		QMath.AxisClear(or.axis);
		vec3.create(or.origin);
		return false;
	}

	var start = GetTag(model.md3, startFrame, tagName);
	var end = GetTag(model.md3, endFrame, tagName);

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
	var mod = GetModelByHandle(hModel);

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