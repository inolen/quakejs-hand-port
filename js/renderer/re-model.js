/**
 * InitModels
 */
function InitModels() {
	var mod = re.models[0] = new Model();
	mod.type = ModelType.BAD;
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
 * Loads in a model for the given name
 * Zero will be returned if the model fails to load.
 * An entry will be retained for failed models as an
 * optimization to prevent disk rescanning if they are
 * asked for again.
 */
function RegisterModel(name) {
	if (!name) {
		console.log('RegisterModel: null name');
		return 0;
	}

	// Search the currently loaded models.
	var mod;
	for (var hModel = 1; hModel < re.models.length; hModel++) {
		mod = re.models[hModel];

		if (mod.name === name) {
			return hModel;
		}
	}

	// Create new model.
	hModel = re.models.length;
	mod = re.models[hModel] = new Model();
	mod.type = ModelType.BAD;
	mod.name = name;
	mod.index = hModel;

	// Async load it.
	RegisterMd3(mod, name);

	return hModel;
}

/**
 * RegisterMd3
 */
function RegisterMd3(mod, name, callback) {
	var done = 0;

	// Strip off file extension.
	var filename = name.substr(0, name.lastIndexOf('.')) || name;

	var loadLOD = function (lod) {
		var lodFilename;

		if (lod) {
			lodFilename = filename + '_' + lod + '.md3';
		} else {
			lodFilename = filename + '.md3';
		}

		LoadMd3(mod, lodFilename, function (err, md3) {
			if (err) {
				console.log(err.message);
			} else {
				// Once we load one valid MD3.
				mod.type = ModelType.MD3;
				mod.md3[lod] = md3;
				mod.numLods++;
			}

			// Once we've attempted to load all LODs.
			if (++done === 1/*MD3_MAX_LODS*/) {
				// var best;
				// 
				// Fill in higher lods that weren't loaded with the next best lod.
				// for (var i = MD3_MAX_LODS-1; i >= 0; i--) {
				// 	if (mod.md3[i]) {
				// 		best = mod.md3[i];
				// 	} else if (best) {
				// 		mod.md3[i] = best;
				// 		mod.numLods++;
				// 	}
				// }

				if (callback) {
					return callback.apply(this);
				}
			}
		});
	};

	// TODO Enable lods (ugh.. all the failed HTTP requests).
	for (var lod = 0/*MD3_MAX_LODS - 1*/; lod >= 0 ; lod--) {
		loadLOD(lod);
	}
}

/**
 * LoadMd3
 */
function LoadMd3(mod, filename, callback) {
	sys.ReadFile(filename, 'binary', function (err, data) {
		if (err) return callback(err);
	
		var bb = new ByteBuffer(data, ByteBuffer.LITTLE_ENDIAN);

		var header = new Md3Header();
		header.ident = bb.readInt();
		header.version = bb.readInt();

		if (header.version != MD3_VERSION) {
			console.warn('LoadMd3: ' + filename + ' has wrong version (' + version + ' should be ' + MD3_VERSION + ')');
			return null;
		}

		// Finish reading header.
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

		if (header.numFrames < 1) {
			console.warn('LoadMd3: ' + filename + ' has no frames');
			return null;
		}

		var md3 = new Md3();
		md3.header = header;
		md3.name = header.name;
		md3.frames = new Array(header.numFrames);
		md3.tags = new Array(header.numTags);
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

			var sheader = new Md3SurfaceHeader();
			sheader.ident = bb.readInt();
			sheader.name = bb.readASCIIString(MAX_QPATH);
			sheader.flags = bb.readInt();
			sheader.numFrames = bb.readInt();
			sheader.numShaders = bb.readInt();
			sheader.numVerts = bb.readInt();
			sheader.numTriangles = bb.readInt();
			sheader.ofsTriangles = bb.readInt();
			sheader.ofsShaders = bb.readInt();
			sheader.ofsSt = bb.readInt();
			sheader.ofsXyzNormals = bb.readInt();
			sheader.ofsEnd = bb.readInt();

			if (sheader.numVerts > SHADER_MAX_VERTEXES) {
				console.warn('LoadMd3: ' + filename + ' has more than ' + SHADER_MAX_VERTEXES + ' verts on a surface (' + sheader.numVerts + ')');
				return null;
			}

			if (sheader.numTriangles * 3 > SHADER_MAX_INDEXES) {
				console.warn('LoadMd3: ' + filename + ' has more than ' + (SHADER_MAX_INDEXES / 3) + ' triangles on a surface (' + shead.numTriangles + ')');
				return null;
			}

			var surf = md3.surfaces[i] = new Md3Surface();
			surf.header = sheader;
			surf.name = sheader.name.toLowerCase();

			// Store a reference to the model to help out the backend.
			surf.model = mod;

			/*// strip off a trailing _1 or _2
			// this is a crutch for q3data being a mess
			j = strlen( surf->name );
			if ( j > 2 && surf->name[j-2] == '_' ) {
				surf->name[j-2] = 0;
			}*/

			surf.shaders = new Array(sheader.numShaders);
			surf.triangles = new Array(sheader.numTriangles);
			surf.st = new Array(sheader.numVerts);
			surf.xyzNormals = new Array(sheader.numFrames * sheader.numVerts);

			// Register all the shaders.
			bb.index = meshOffset + sheader.ofsShaders;

			for (var j = 0; j < sheader.numShaders; j++) {
				var shader = surf.shaders[j] = new Md3Shader();
				// Strip extension.
				shader.name = bb.readASCIIString(MAX_QPATH).replace(/\.[^\/.]+$/, '');
				shader.shader = FindShader(shader.name, LightmapType.NONE);
			}

			// Read all of the triangles.
			bb.index = meshOffset + sheader.ofsTriangles;

			for (var j = 0; j < sheader.numTriangles; j++) {
				var tri = surf.triangles[j] = new Md3Triangle();

				for (var k = 0; k < 3; k++) {
					tri.indexes[k] = bb.readInt();
				}
			}

			// Read all of the ST coordinates.
			bb.index = meshOffset + sheader.ofsSt;

			for (var j = 0; j < sheader.numVerts; j++) {
				var st = surf.st[j] = new Md3St();

				for (var k = 0; k < 2; k++) {
					st.st[k] = bb.readFloat();
				}
			}

			// Read all of the xyz normals.
			bb.index = meshOffset + sheader.ofsXyzNormals;

			for (var j = 0; j < sheader.numFrames * sheader.numVerts; j++) {
				var xyz = surf.xyzNormals[j] = new Md3XyzNormal();

				for (var k = 0; k < 3; k++) {
					xyz.xyz[k] = bb.readShort();
				}

				// Convert from spherical coordinates to normalized vec3.
				var zenith = bb.readByte();
				var azimuth = bb.readByte();

				var lat = zenith * (2 * Math.PI) / 255;
				var lng = azimuth * (2 * Math.PI) / 255;

				xyz.normal[0] = Math.cos(lng) * Math.sin(lat);
				xyz.normal[1] = Math.sin(lng) * Math.sin(lat);
				xyz.normal[2] = Math.cos(lat);
				vec3.normalize(xyz.normal);
			}
			
			meshOffset += sheader.ofsEnd;
		}

		return callback(null, md3);
	});
}

/**
 * GetTag
 */
function GetTag(md3, frame, tagName) {
	if (frame >= md3.header.numFrames) {
		// It is possible to have a bad frame while changing models, so don't error.
		frame = md3.header.numFrames - 1;
	}

	var offset = frame * md3.header.numTags;

	for (var i = 0; i < md3.header.numTags; i++) {
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

	if (model.type === ModelType.BAD) {
		return false;
	}

	if (!model.md3[0] ) {
		AxisClear(or.axis);
		vec3.set(or.origin, [0, 0, 0]);
		return false;
	}

	var start = GetTag(model.md3[0], startFrame, tagName);
	var end = GetTag(model.md3[0], endFrame, tagName);

	if (!start || !end) {
		AxisClear(or.axis);
		vec3.set(or.origin, [0, 0, 0]);
		return false;
	}
	
	var frontLerp = frac;
	var backLerp = 1  - frac;

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