/**
 * The terminology in this file can be a bit confusing:
 *
 * shader        = textures + GLSL program. These really probably be renamed to materials.
 * program       = GLSL program
 * shader script = original quake shader script file that we convert to our shader above.
 */

// Additional run time flags to help parameterize the compiler.
var CFLAGS = {
	POSITION_LERP: 1
};

/**
 * InitShaders
 */
function InitShaders() {
	re.defaultShader = GetDefaultShader();

	re.shaders = new AssetCache(re.defaultShader);
	re.shaders.onload = LoadShader;
}

/**
 * GetDefaultShader
 */
function GetDefaultShader() {
	var script = new Script.Script();
	script.name = '*default';
	script.sort = Script.SORT.OPAQUE;

	var stage = new Script.ScriptStage();
	stage.maps[0] = '*default';
	stage.rgbGen = 'vertex';

	script.stages.push(stage);

	return CompileScript(script, 0);
}

/**
 * RegisterShader
 */
function RegisterShader(shaderName, callback) {
	// Strip extension and lowercase.
	shaderName = shaderName.replace(/\.[^\.]+$/, '').toLowerCase();

	re.shaders.load(shaderName, 0, 0, callback);
}

/**
 * FindShaderByHandle
 */
function FindShaderByHandle(hShader) {
	return re.shaders.findByHandle(hShader);
}

/**
 * FindShaderByName
 */
function FindShaderByName(shaderName, lightmapIndex, flags, callback) {
	// Strip extension and lowercase.
	shaderName = shaderName.replace(/\.[^\.]+$/, '').toLowerCase();

	re.shaders.findByName(shaderName, lightmapIndex, flags, callback);
}

/**
 * LoadShader
 *
 * Will always return a valid shader, but it might be the
 * default shader if the real one can't be found.
 *
 * In the interest of not requiring an explicit shader text entry to
 * be defined for every single image used in the game, three default
 * shader behaviors can be auto-created for any image:
 *
 * If lightmapIndex == LIGHTMAP.NONE, then the image will have
 * dynamic diffuse lighting applied to it, as apropriate for most
 * entity skin surfaces.
 *
 * If lightmapIndex == LIGHTMAP.VERTEX, then the image will use
 * the vertex rgba modulate values, as apropriate for misc_model
 * pre-lit surfaces.
 *
 * Other lightmapIndex values will have a lightmap stage created
 * and src*dest blending applied with the texture, as apropriate for
 * most world construction surfaces.
 */
function LoadShader(shaderName, lightmapIndex, flags, callback) {
	// See if we have a script for this name.
	var script;
	if (re.scriptBodies[shaderName]) {
		var shaderText = re.scriptBodies[shaderName];
		script = Script.parse(shaderText, lightmapIndex);
	}
	// There is no script for this name, create a default.
	else {
		script = new Script.Script();
		script.name = shaderName;
		script.sort = Script.SORT.OPAQUE;

		var stage = new Script.ScriptStage();
		stage.maps[0] = shaderName;

		script.stages.push(stage);

		if (lightmapIndex === -1) {
			stage.rgbGen = 'vertex';
		} else if (lightmapIndex === -2) {
			stage.rgbGen = 'lightingdiffuse';
		} else {
			stage = new Script.ScriptStage();
			stage.maps[0] = '*lightmap';
			stage.isLightmap = true;
			stage.blendSrc = 'GL_DST_COLOR';
			stage.blendDest = 'GL_ZERO';

			script.stages.push(stage);
		}
	}

	// Set properties from additional runtime flags.
	if (flags & CFLAGS.POSITION_LERP) {
		script.positionLerp = true;
	}

	// Convert the script into a shader.
	CompileScript(script, function (err, shader) {
		if (err) {
			return callback(err);
		}

		if (shader.sky) {
			re.skyShader = shader;
		}

		callback(null, shader);
	});
}

/**
 * CompileScript
 */
function CompileScript(script, callback) {
	var shader;

	try {
		shader = Shader.from(gl, script, MAX_DLIGHTS);
	} catch (e) {
		return callback(e);
	}

	// Insert the shader in the master sort list.
	SortShader(shader);

	var steps = [];

	shader.stages.forEach(function (stage, i) {
		stage.maps.forEach(function (group, j) {
			stage.textures[j] = [];

			group.forEach(function (map, k) {
				steps.push(function (cb) {
					FindTextureByName(map.name, map.clamp, function (texture) {
						stage.textures[j][k] = texture.texnum;
						cb(null);
					});
				});
			});
		});
	});

	// Fire callback once the textures have all loaded.
	async.parallel(steps, function () {
		callback && callback(null, shader);
	});

	return shader;
}

/**
 * SortShader
 */
function SortShader(shader) {
	if (re.sortedShaders.length === MAX_SHADERS) {
		error('RegisterShader - MAX_SHADERS hit');
		return;
	}

	var sortedShaders = re.sortedShaders;
	var sort = shader.sort;

	for (var i = sortedShaders.length - 1; i >= 0; i--) {
		if (sortedShaders[i].sort <= sort) {
			break;
		}
		sortedShaders[i+1] = sortedShaders[i];
		sortedShaders[i+1].sortedIndex++;
	}

	shader.sortedIndex = i+1;
	sortedShaders[i+1] = shader;
}

/**
 * InitScripts
 */
function InitScripts(callback) {
	// Since we can't scan directories, load the special all.shader
	// from the server which will return a concatenated list of shaders.
	SYS.ReadFile('scripts/all.shader', 'utf8', function (err, data) {
		if (err) {
			return callback(err);
		}

		LoadScript(data);

		callback(null);
	}, 'renderer');
}

/**
 * LoadScript
 *
 * Tokenizes the file and places the script name / body
 * into a hashtable.
 */
function LoadScript(data, callback) {
	var tokens = new TextTokenizer(data);

	while (!tokens.EOF()) {
		var name = tokens.next().toLowerCase();

		var depth = 0;
		var buffer = name + ' ';
		do {
			var token = tokens.next();

			if (token === '{') {
				depth++;
			} else if (token === '}') {
				depth--;
			}

			buffer += token + ' ';
		} while (depth && !tokens.EOF());

		re.scriptBodies[name] = buffer;
	}
}