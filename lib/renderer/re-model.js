/**
 * InitModels
 */
function InitModels() {
	var mod = re.models[0] = new Model();
	mod.type = MOD.BAD;

	// Setup static model buffers.
	var buffers      = backend.modelBuffers = {};
	buffers.xyz      = CreateBuffer('float32', 3, 0x8000*3);
	buffers.normal   = CreateBuffer('float32', 3, 0x8000*3);
	buffers.texCoord = CreateBuffer('float32', 2, 0x8000*2);
	buffers.color    = CreateBuffer('uint8',   4, 0x8000*4);
	buffers.index    = CreateBuffer('uint16',  1, 0x8000, true);

	LockBuffer(buffers.xyz);
	LockBuffer(buffers.normal);
	LockBuffer(buffers.texCoord);
	LockBuffer(buffers.color);
	LockBuffer(buffers.index);
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
 * AllocateModel
 */
function AllocateModel() {
	var hModel = re.models.length;

	var mod = re.models[hModel] = new Model();
	mod.type = MOD.BAD;
	mod.index = hModel;

	return mod;
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
		log('RegisterModel: null name');
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
	mod = AllocateModel();
	mod.name = name;

	// Async load it.
	RegisterMd3(mod, name);

	// Append static models to static buffers.
	ModelOnLoad(mod.index, function (mod) {
		if (mod.type === MOD.BAD) {
			return;
		}

		if (mod.md3[0].header.numFrames === 1) {
			CompileModelSurfaces(mod);
		}
	});

	return mod.index;
}

/**
 * ModelOnLoad
 */
function ModelOnLoad(hModel, callback) {
	if (!callback) {
		throw new Error('No callback specified');
	}

	var mod = GetModelByHandle(hModel);

	// If the model has already been loaded, immediately 
	// call the callback.
	if (mod.loaded) {
		return callback(mod);
	}
	// If it hasn't loaded yet, append to the model's
	// callback list.
	else {
		mod.callbacks.push(callback);
	}
}

/**
 * ModelLoadComplete
 */
function ModelLoadComplete(mod) {
	mod.loaded = true;

	for (var i = 0; i < mod.callbacks.length; i++) {
		mod.callbacks[i](mod);
	}

	// Clear callback list.
	mod.callbacks = null;
}

/**
 * RegisterMd3
 */
function RegisterMd3(mod, name) {
	var done = 0;

	// Strip off file extension.
	var filename = name.substr(0, name.lastIndexOf('.')) || name;

	var loadLOD = function (lod) {
		var lodFilename;

		if (lod > 0) {
			lodFilename = filename + '_' + lod + '.md3';
		} else {
			lodFilename = filename + '.md3';
		}

		LoadMd3(mod, lodFilename, function (err, md3) {
			if (err) {
				log(err.message);
			} else {
				mod.md3[lod] = md3;

				// The highlest loaded lod will be our numLods,
				// we'll fill in any missing ones in allLODLoaded().
				if (lod >= mod.numLods) {
					mod.numLods = lod + 1;
				}
			}

			// Once we've attempted to load all LODs.
			if (++done === MD3_MAX_LODS) {
				allLODLoaded();
			}
		});
	};

	var allLODLoaded = function () {
		// Fill in lower lods that weren't loaded with the next best lod.
		for (var i = mod.numLods-2; i >= 0; i--) {
			if (!mod.md3[i]) {
				mod.md3[i] = mod.md3[i+1];
			}
		}

		// Set a valid model type if we loaded at least one LOD.
		if (mod.numLods > 0) {
			mod.type = MOD.MD3;
		}

		ModelLoadComplete(mod);
	};

	for (var lod = 0; lod < MD3_MAX_LODS; lod++) {
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

		if (header.version !== MD3_VERSION) {
			console.warn('LoadMd3: ' + filename + ' has wrong version (' + header.version + ' should be ' + MD3_VERSION + ')');
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
		md3.tags = new Array(header.numFrames * header.numTags);
		md3.surfaces = new Array(header.numSurfaces);
		md3.skins = new Array(header.numSkins);

		//log('LoadMD3', mod.name, header.numFrames, header.numTags, header.numFrames * header.numTags);

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
				console.warn('LoadMd3: ' + filename + ' has more than ' + (SHADER_MAX_INDEXES / 3) + ' triangles on a surface (' + sheader.numTriangles + ')');
				return null;
			}

			var surf = md3.surfaces[i] = new Md3Surface();
			surf.header = sheader;
			surf.name = sheader.name.toLowerCase();

			// Store a reference to the model to help out the backend.
			surf.model = mod;

			/*// strip off a trailing _1 or _2
			// this is a crutch for q3data being a mess
			j = strlen( surf.name );
			if ( j > 2 && surf.name[j-2] == '_' ) {
				surf.name[j-2] = 0;
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
				shader.shader = FindShaderByName(shader.name, LIGHTMAP.NONE);
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
					xyz.xyz[k] = bb.readShort() * MD3_XYZ_SCALE;
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

	if (model.type === MOD.BAD) {
		return false;
	}

	if (!model.md3[0] ) {
		QMath.AxisClear(or.axis);
		vec3.set(or.origin, [0, 0, 0]);
		return false;
	}

	var start = GetTag(model.md3[0], startFrame, tagName);
	var end = GetTag(model.md3[0], endFrame, tagName);

	if (!start || !end) {
		QMath.AxisClear(or.axis);
		vec3.set(or.origin, [0, 0, 0]);
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
		var md3 = mod.md3[0];
		var frame = md3.frames[0];
		vec3.set(frame.bounds[0], mins);
		vec3.set(frame.bounds[1], maxs);
		return;
	}

	mins[0] = mins[1] = mins[2] = 0;
	maxs[0] = maxs[1] = maxs[2] = 0;
}

/**
 * CompileModelSurfaces
 */
function CompileModelSurfaces(mod) {
	for (var i = 0; i < mod.numLods; i++) {
		var md3 = mod.md3[i];
		CompileMd3Surfaces(md3);
	}
}

/**
 * CompileMd3Surfaces
 */
function CompileMd3Surfaces(md3) {
	var buffers = backend.modelBuffers;
	var xyz = buffers.xyz;
	var normal = buffers.normal;
	var texCoord = buffers.texCoord;
	var color = buffers.color;
	var index = buffers.index;

	var originalCmd = backend.tess;

	for (var i = 0; i < md3.surfaces.length; i++) {
		var surface = md3.surfaces[i];

		var compiled = new CompiledMd3Surface();
		compiled.header = surface.header;
		compiled.xyzNormals = surface.xyzNormals;
		compiled.name = surface.name;
		compiled.shaders = surface.shaders;
		// Store the color offset so we can update
		// the diffuse colors in TesselateCompiledMd3.
		compiled.colorOffset = color.offset;

		compiled.cmd = new ShaderCommand();
		compiled.cmd.xyz = xyz;
		compiled.cmd.normal = normal;
		compiled.cmd.texCoord = texCoord;
		compiled.cmd.color = color;
		compiled.cmd.index = index;

		// Overwrite the current backend cmd so TesselateMd3
		// writes to us.
		backend.tess = compiled.cmd;

		// Tesselate and mark our index offset.
		compiled.cmd.indexOffset = index.elementCount;
		TesselateMd3(surface);
		compiled.cmd.elementCount = index.elementCount - compiled.cmd.indexOffset;

		// Overwrite the original surface.
		md3.surfaces[i] = compiled;
	}

	// Restore the original command (we could be being called mid
	// render since we're in a callback).
	backend.tess = originalCmd;

	xyz.modified = true;
	normal.modified = true;
	texCoord.modified = true;
	color.modified = true;
	index.modified = true;
}