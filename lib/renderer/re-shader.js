/**
 * The terminology in this file can be a bit confusing:
 *
 * shader        = textures + GLSL program. These really probably be renamed to materials.
 * program       = GLSL program
 * shader script = original quake shader script file that we convert to our shader above.
 */

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
	var script = new ShaderCompiler.Script();
	script.name = '*default';
	script.sort = SS.OPAQUE;

	var stage = new ShaderCompiler.ScriptStage();
	stage.maps[0] = '*default';
	stage.rgbGen = 'vertex';
	script.stages.push(stage);

	return CompileShaderScript(script, 0);
}

/**
 * RegisterShader
 */
function RegisterShader(shaderName, callback) {
	// Strip extension.
	shaderName = shaderName.replace(/\.[^\.]+$/, '');

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
		script = ShaderCompiler.parse(shaderText, lightmapIndex);
	}
	// There is no script for this name, create a default.
	else {
		script = new ShaderCompiler.Script();
		script.name = shaderName;
		script.sort = SS.OPAQUE;

		var stage = new ShaderCompiler.ScriptStage();
		stage.maps[0] = shaderName;
		script.stages.push(stage);

		if (lightmapIndex === -1) {
			stage.rgbGen = 'vertex';
		} else if (lightmapIndex === -2) {
			stage.rgbGen = 'lightingdiffuse';
		} else {
			stage = new ShaderCompiler.ScriptStage();
			stage.maps[0] = '*lightmap';
			stage.isLightmap = true;
			stage.blendSrc = 'GL_DST_COLOR';
			stage.blendDest = 'GL_ZERO';
			script.stages.push(stage);
		}
	}

	// Convert the script into a shader.
	CompileShaderScript(script, flags, function (err, shader) {
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
function CompileShaderScript(script, flags, callback) {
	var shader = new Shader();

	shader.name = script.name;
	shader.sort = script.sort;
	shader.surfaceFlags = TranslateSurfaceFlags(script.surfaceParms);
	shader.contentFlags = TranslateContentFlags(script.surfaceParms);
	shader.cull = TranslateCull(script.cull);
	shader.sky = script.sky;
	shader.fog = script.fog;
	shader.polygonOffset = script.polygonOffset;
	shader.entityMergable = script.entityMergable;

	// Early out on nodraw surfaces.
	if (shader.surfaceFlags & SURF.NODRAW) {
		return callback(null, shader);
	}

	// We can't conditionally branch inside loops in GLSL v1 shaders
	// across all hardware, so generate a custom shader for each possible
	// amount of dlights, and bind the correct one at runtime.

	// Non-opaque surfaces won't be lit by dynamic lights.
	var maxDlights = shader.sort === SS.OPAQUE ? MAX_DLIGHTS : 0;

	shader.program = new Array(maxDlights+1);

	for (var i = 0; i <= maxDlights; i++) {
		shader.program[i] = ShaderCompiler.compile(gl, script, flags, i);
	}

	// Grab blend and depth info from first stage.
	// FIXME Find info from the first stage that contains it perhaps?
	var firstStage = script.stages[0];

	if (script.fog) {
		shader.hasBlendFunc = true;
		shader.blendSrc = gl.SRC_ALPHA;
		shader.blendDest = gl.ONE_MINUS_SRC_ALPHA;
	} else if (firstStage && firstStage.hasBlendFunc) {
		shader.hasBlendFunc = true;
		shader.blendSrc = TranslateBlend(firstStage.blendSrc);
		shader.blendDest = TranslateBlend(firstStage.blendDest);
	}

	if (firstStage && firstStage.depthWrite) {
		shader.depthWrite = true;
		shader.depthFunc = TranslateDepthFunc(firstStage.depthFunc);
	}

	// Load the textures for each stage.
	var steps = [];

	script.stages.forEach(function (scriptStage) {
		var stage = new ShaderStage();

		scriptStage.maps.forEach(function (map, j) {
			steps.push(function (cb) {
				FindTextureByName(map, scriptStage.clamp, function (texture) {
					stage.textures[j] = texture;
					cb(null);
				});
			});
		});

		stage.animFreq = scriptStage.animFreq;

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

	if (cull == 'none' || cull == 'twosided' || cull == 'disable') {
		return null;
	} else if (cull == 'back' || cull == 'backside' || cull == 'backsided') {
		return gl.BACK;
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
 * TranslateSurfaceParms
 */
var surfaceParms = {
	// server relevant contents
	'water':         { surface: 0,                contents: CONTENTS.WATER },
	'slime':         { surface: 0,                contents: CONTENTS.SLIME },         // mildly damaging
	'lava':          { surface: 0,                contents: CONTENTS.LAVA },          // very damaging
	'playerclip':    { surface: 0,                contents: CONTENTS.PLAYERCLIP },
	'monsterclip':   { surface: 0,                contents: CONTENTS.MONSTERCLIP },
	'nodrop':        { surface: 0,                contents: CONTENTS.NODROP },        // don't drop items or leave bodies (death fog, lava, etc)
	'nonsolid':      { surface: SURF.NONSOLID,    contents: 0 },                      // clears the solid flag

	// utility relevant attributes
	'origin':        { surface: 0,                contents: CONTENTS.ORIGIN },        // center of rotating brushes
	'trans':         { surface: 0,                contents: CONTENTS.TRANSLUCENT },   // don't eat contained surfaces
	'detail':        { surface: 0,                contents: CONTENTS.DETAIL },        // don't include in structural bsp
	'structural':    { surface: 0,                contents: CONTENTS.STRUCTURAL },    // force into structural bsp even if trnas
	'areaportal':    { surface: 0,                contents: CONTENTS.AREAPORTAL },    // divides areas
	'clusterportal': { surface: 0,                contents: CONTENTS.CLUSTERPORTAL }, // for bots
	'donotenter':    { surface: 0,                contents: CONTENTS.DONOTENTER },    // for bots

	'fog':           { surface: 0,                contents: CONTENTS.FOG},            // carves surfaces entering
	'sky':           { surface: SURF.SKY,         contents: 0 },                      // emit light from an environment map
	'lightfilter':   { surface: SURF.LIGHTFILTER, contents: 0 },                      // filter light going through it
	'alphashadow':   { surface: SURF.ALPHASHADOW, contents: 0 },                      // test light on a per-pixel basis
	'hint':          { surface: SURF.HINT,        contents: 0 },                      // use as a primary splitter

	// server attributes
	'slick':         { surface: SURF.SLICK,       contents: 0 },
	'noimpact':      { surface: SURF.NOIMPACT,    contents: 0 },                      // don't make impact explosions or marks
	'nomarks':       { surface: SURF.NOMARKS,     contents: 0 },                      // don't make impact marks, but still explode
	'ladder':        { surface: SURF.LADDER,      contents: 0 },
	'nodamage':      { surface: SURF.NODAMAGE,    contents: 0 },
	'metalsteps':    { surface: SURF.METALSTEPS,  contents: 0 },
	'flesh':         { surface: SURF.FLESH,       contents: 0 },
	'nosteps':       { surface: SURF.NOSTEPS,     contents: 0 },

	// drawsurf attributes
	'nodraw':        { surface: SURF.NODRAW,      contents: 0 },                      // don't generate a drawsurface (or a lightmap)
	'pointlight':    { surface: SURF.POINTLIGHT,  contents: 0 },                      // sample lighting at vertexes
	'nolightmap':    { surface: SURF.NOLIGHTMAP,  contents: 0 },                      // don't generate a lightmap
	'nodlight':      { surface: SURF.NODLIGHT,    contents: 0 },                      // don't ever add dynamic lights
	'dust':          { surface: SURF.DUST,        contents: 0 }                       // leave a dust trail when walking on this surface
};

function TranslateSurfaceFlags(parms) {
	var surfaceFlags = 0;

	for (var i = 0; i < parms.length; i++) {
		var parm = surfaceParms[parms[i]];
		if (!parm) {
			continue;
		}

		surfaceFlags |= parm.surface;
	}

	return surfaceFlags;
}

function TranslateContentFlags(parms) {
	var contentFlags = 0;

	for (var i = 0; i < parms.length; i++) {
		var parm = surfaceParms[parms[i]];
		if (!parm) {
			continue;
		}

		contentFlags |= parm.contents;
	}

	return contentFlags;
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
	sys.ReadFile('scripts/all.shader', 'utf8', function (err, data) {
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
		var name = tokens.next();

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