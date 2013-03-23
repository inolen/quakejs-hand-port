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
	re.shaders.on('load', LoadShader);
}

/**
 * GetDefaultShader
 */
function GetDefaultShader() {
	var script = new ShaderParser.Script();
	script.name = '*default';
	script.sort = ShaderParser.SS.OPAQUE;

	var stage = new ShaderParser.ScriptStage();
	stage.maps[0] = '*default';
	stage.rgbGen = 'vertex';

	script.stages.push(stage);

	return CompileShaderScript(script, 0);
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
		script = ShaderParser.parse(shaderText, lightmapIndex);
	}
	// There is no script for this name, create a default.
	else {
		script = new ShaderParser.Script();
		script.name = shaderName;
		script.sort = ShaderParser.SS.OPAQUE;

		var stage = new ShaderParser.ScriptStage();
		stage.maps[0] = shaderName;

		script.stages.push(stage);

		if (lightmapIndex === -1) {
			stage.rgbGen = 'vertex';
		} else if (lightmapIndex === -2) {
			stage.rgbGen = 'lightingdiffuse';
		} else {
			stage = new ShaderParser.ScriptStage();
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
	CompileShaderScript(script, function (err, shader) {
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
 * CompileShaderScript
 */
function CompileShaderScript(script, callback) {
	var shader = new Shader();

	shader.name = script.name;
	shader.sort = script.sort;

	shader.surfaceFlags = script.surfaceFlags;
	shader.contentFlags = script.contentFlags;

	shader.cull = TranslateCull(script.cull);
	shader.polygonOffset = script.polygonOffset;
	shader.sky = script.sky;
	shader.fog = script.fog;
	shader.entityMergable = script.entityMergable;

	// if (script.fog) {
	// 	shader.hasBlendFunc = true;
	// 	shader.blendSrc = gl.SRC_ALPHA;
	// 	shader.blendDest = gl.ONE_MINUS_SRC_ALPHA;
	// }

	var steps = [];

	// Group script stages into groups that can be blended
	// at the fragment program level.
	var groups = ShaderCompiler.mergeStages(script);

	groups.forEach(function (group, i) {
		var stage = new ShaderStage();

		// Since these values were merged, it's safe to use the first
		// values blend / depth funcs.
		stage.blendSrc = TranslateBlend(group[0].blendSrc);
		stage.blendDest = TranslateBlend(group[0].blendDest);

		stage.depthWrite = group[0].depthWrite;
		stage.depthFunc = TranslateDepthFunc(group[0].depthFunc);

		// We can't conditionally branch inside loops in GLSL v1 shaders
		// across all hardware, so generate a custom shader for each possible
		// amount of dlights, and bind the correct one at runtime.
		// Also, only add dlights to the final group.
		var maxDlights = (i === groups.length - 1) && shader.sort === ShaderParser.SS.OPAQUE ?
			MAX_DLIGHTS :
			0;

		stage.programs = new Array(maxDlights+1);

		var builder = ShaderCompiler.buildProgram(script, group);

		for (var numLights = 0; numLights <= maxDlights; numLights++) {
			builder.addDefine('MAX_DLIGHTS', numLights);
			stage.programs[numLights] = BuildProgram(builder.getVertexSource(), builder.getFragmentSource());
		}

		// Load the textures for each stage of the group.
		group.forEach(function (scriptStage, j) {
			stage.textures[j] = [];
			stage.animFreq[j] = scriptStage.animFreq;

			scriptStage.maps.forEach(function (map, k) {
				steps.push(function (cb) {
					FindTextureByName(map, scriptStage.clamp, function (texture) {
						stage.textures[j][k] = texture;
						cb(null);
					});
				});
			});
		});

		shader.stages.push(stage);
	});

	// Insert the shader in the master sort list.
	SortShader(shader);

	// Fire callback once the textures have all loaded.
	async.parallel(steps, function () {
		callback && callback(null, shader);
	});

	return shader;
}

/**
 * TranslateCull
 */
function TranslateCull(cull) {
	if (!cull) { return gl.FRONT; }

	cull = cull.toLowerCase();

	if (cull === 'none' || cull === 'twosided' || cull === 'disable') {
		return null;
	} else if (cull === 'back' || cull === 'backside' || cull === 'backsided') {
		return gl.BACK;
	} else {
		return gl.FRONT;
	}
}

/**
 * TranslateDepthFunc
 */
function TranslateDepthFunc(depth) {
	if (!depth) { return gl.LEQUAL; }

	switch (depth.toLowerCase()) {
		case 'gequal':  return gl.GEQUAL;
		case 'lequal':  return gl.LEQUAL;
		case 'equal':   return gl.EQUAL;
		case 'greater': return gl.GREATER;
		case 'less':    return gl.LESS;
		default:        return gl.LEQUAL;
	}
}

/**
 * TranslateBlend
 */
function TranslateBlend(blend) {
	if (!blend) { return gl.ONE; }

	switch (blend.toUpperCase()) {
		case 'GL_ONE':                 return gl.ONE;
		case 'GL_ZERO':                return gl.ZERO;
		case 'GL_DST_COLOR':           return gl.DST_COLOR;
		case 'GL_ONE_MINUS_DST_COLOR': return gl.ONE_MINUS_DST_COLOR;
		case 'GL_SRC_ALPHA':           return gl.SRC_ALPHA;
		case 'GL_ONE_MINUS_SRC_ALPHA': return gl.ONE_MINUS_SRC_ALPHA;
		case 'GL_SRC_COLOR':           return gl.SRC_COLOR;
		case 'GL_ONE_MINUS_SRC_COLOR': return gl.ONE_MINUS_SRC_COLOR;
		default:                       return gl.ONE;
	}
}

/**
 * BuildProgram
 */
var programCache = {};

function BuildProgram(vertexSrc, fragmentSrc) {
	var shaderProgram;

	// Try and find it from our cache.
	if ((shaderProgram = programCache[vertexSrc + fragmentSrc])) {
		return shaderProgram;
	}

	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, fragmentSrc);
	gl.compileShader(fragmentShader);

	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		console.log('Could not compile fragment shader:');
		console.log(gl.getShaderInfoLog(fragmentShader));
		console.log(vertexSrc);
		console.log(fragmentSrc);
		gl.deleteShader(fragmentShader);
		return null;
	}

	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexSrc);
	gl.compileShader(vertexShader);

	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		console.log('Could not compile vertex shader:');
		console.log(gl.getShaderInfoLog(vertexShader));
		console.log(vertexSrc);
		console.log(fragmentSrc);
		gl.deleteShader(vertexShader);
		return null;
	}

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		console.log('Could not link shaders');
		console.log(vertexSrc);
		console.log(fragmentSrc);
		gl.deleteProgram(shaderProgram);
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		return null;
	}

	var i, attrib, uniform;
	var attribCount = gl.getProgramParameter(shaderProgram, gl.ACTIVE_ATTRIBUTES);
	shaderProgram.attrib = {};
	for (i = 0; i < attribCount; i++) {
		attrib = gl.getActiveAttrib(shaderProgram, i);
		shaderProgram.attrib[attrib.name] = gl.getAttribLocation(shaderProgram, attrib.name);
	}

	var uniformCount = gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS);
	shaderProgram.uniform = {};
	for (i = 0; i < uniformCount; i++) {
		uniform = gl.getActiveUniform(shaderProgram, i);
		shaderProgram.uniform[uniform.name] = gl.getUniformLocation(shaderProgram, uniform.name);
	}

	programCache[vertexSrc + fragmentSrc] = shaderProgram;

	return shaderProgram;
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
 * InitShaderScripts
 */
function InitShaderScripts(callback) {
	// Since we can't scan directories, load the special all.shader
	// from the server which will return a concatenated list of shaders.
	SYS.ReadFile('scripts/all.shader', 'utf8', function (err, data) {
		if (err) {
			return callback(err);
		}

		LoadShaderScript(data);

		callback(null);
	}, 'renderer');
}

/**
 * LoadShaderScript
 *
 * Tokenizes the file and places the script name / body
 * into a hashtable.
 */
function LoadShaderScript(data, callback) {
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