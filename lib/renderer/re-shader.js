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
function InitShaders(callback) {
	// TODO there are some serious race conditions here, as we don't wait for these to finish loading
	// Thankfully these almost always finish before the map loads.
	InitDefaultShaders();

	ScanAndLoadScripts(function () {
		if (callback) callback();
	});

	// // HACK - clean up a few mb off the heap for snapshots
	// setTimeout(function () {
	// 	re.scriptBodies = null;
	// }, 10000);
}

/**
 * InitDefaultShaders
 */
function InitDefaultShaders() {
	CreateDefaultShader();
	CreateDebugShader();
}

/**
 * CreateDefaultShader
 */
function CreateDefaultShader() {
	var script = new Script();
	script.name = '<default>';
	script.sort = SS.OPAQUE;

	var stage = new ScriptStage();
	stage.maps[0] = '*default';
	stage.rgbGen = 'vertex';
	script.stages.push(stage);

	var shader = CreateShaderFromScript(script);
	re.shaders.push(shader);

	SortShader(shader);
}

/**
 * CreateDebugShader
 */
function CreateDebugShader() {
	var vs = '#ifdef GL_ES\n' +
				 'precision highp float;\n' +
			 '#endif\n' +
			 'attribute vec3 position;\n' +
			 'uniform mat4 modelViewMatrix;\n' +
			 'uniform mat4 projectionMatrix;\n' +
			 'void main(void) {\n' +
				 'vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);\n' +
				 // Nudge towards the camera a bit to combat z-fighting issues.
				 'worldPosition.xyz = worldPosition.xyz * 0.999;\n' +
				 'gl_Position = projectionMatrix * worldPosition;\n' +
			 '}';

	var fs = '#ifdef GL_ES\n' +
				 'precision highp float;\n' +
			 '#endif\n' +
			 'void main(void) {\n' +
				 'gl_FragColor = vec4 (0.0, 1.0, 0.0, 0.5);\n' +
			 '}';


	// Register green debug shader.
	var shader = new Shader();
	shader.name = '<debug>';
	shader.cull = null;
	shader.program = CompileProgram(vs, fs);

	re.shaders.push(shader);
	SortShader(shader);
}

/**
 * ScanAndLoadScripts
 */
function ScanAndLoadScripts(callback) {
	// Since we can't scan directories, load the special all.shader
	// from the server which will return a concatenated list of shaders.
	sys.ReadFile('scripts/all.shader', 'utf8', function (err, data) {
		LoadScript(data);

		if (callback) {
			callback();
		}
	});
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

/**
 * GetShaderByHandle
 */
function GetShaderByHandle(hShader) {
	if (hShader < 1 || hShader >= re.shaders.length) {
		console.warn('GetShaderByHandle: out of range hShader \'' + hShader + '\'');
		return re.shaders[0];
	}

	return re.shaders[hShader];
}

/**
 * RegisterShader
 */
function RegisterShader(shaderName, callback) {
	if (shaderName.length >= MAX_QPATH) {
		log('Shader name exceeds MAX_QPATH');
		return callback(0);
	}

	var shader = FindShaderByName(shaderName, LIGHTMAP.TWOD);
	var hShader = re.shaders.indexOf(shader);

	// Trigger callback once the shader is completely loaded.
	shader.promise.then(function () {
		callback(hShader);
	});
}

/**
 * FindShaderByName
 */
function FindShaderByName(shaderName, lightmapIndex) {
	if (!shaderName) {
		return re.shaders[0];
	}

	shaderName = shaderName.replace(/\.[^\.]+$/, '');

	for (var hShader = 0; hShader < re.shaders.length; hShader++) {
		var shader = re.shaders[hShader];
		if (shader.name === shaderName) {
			return shader;
		}
	}

	// Create the new shader.
	var hShader = re.shaders.length;
	var shader;

	// TODO We should free up these script bodies, they occupy loads of memory for no reason.
	if (re.scriptBodies[shaderName]) {
		var shaderText = re.scriptBodies[shaderName];
		var script = ParseScript(shaderText, lightmapIndex);

		shader = CreateShaderFromScript(script);
	}
	// There is no shader for this name, let's create a default.
	else {
		shader = CreateShaderFromTexture(shaderName, lightmapIndex);
	}

	// Assign a promise that is an aggregate of all the
	// dependent textures' promises.
	var promises = [];
	for (var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];
		for (var j = 0; j < stage.textures.length; j++) {
			promises.push(stage.textures[j].promise);
		}
	}
	shader.promise = $.when.apply(this, promises);

	re.shaders.push(shader);

	SortShader(shader);

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
 * CreateShaderFromTexture
 */
function CreateShaderFromTexture(textureName, lightmapIndex) {
	var script = new Script();
	script.name = textureName;
	script.sort = SS.OPAQUE;

	var stage = new ScriptStage();
	stage.maps[0] = textureName;
	script.stages.push(stage);

	if (lightmapIndex < 0) {
		stage.rgbGen = 'vertex';
	} else {
		stage = new ScriptStage();
		stage.maps[0] = '*lightmap';
		stage.isLightmap = true;
		stage.blendSrc = 'GL_DST_COLOR';
		stage.blendDest = 'GL_ZERO';
		script.stages.push(stage);
	}

	var shader = CreateShaderFromScript(script);

	return shader;
}

/**
 * CreateShaderFromScript
 */
function CreateShaderFromScript(script) {
	// Return the default shader for 0-stage shaders (e.g. caulk surfaces
	// that make it into the bsp somehow).
	if (!script.stages.length) {
		return re.shaders[0];
	}

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

	// Load the textures for each stage.
	for (var i = 0; i < script.stages.length; i++) {
		var scriptStage = script.stages[i];
		var stage = new ShaderStage();

		for (var j = 0; j < scriptStage.maps.length; j++) {
			stage.textures[j] = FindTextureByName(scriptStage.maps[j], scriptStage.clamp);
		}

		stage.animFreq = scriptStage.animFreq;

		shader.stages.push(stage);
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

	// Build the program for this shader.
	shader.program = FindProgramByScript(script);

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
		case 'gequal': return gl.GEQUAL;
		case 'lequal': return gl.LEQUAL;
		case 'equal': return gl.EQUAL;
		case 'greater': return gl.GREATER;
		case 'less': return gl.LESS;
		default: return gl.LEQUAL;
	}
}

/**
 * TranslateBlend
 */
function TranslateBlend(blend) {
	if (!blend) { return gl.ONE; }

	switch (blend.toUpperCase()) {
		case 'GL_ONE': return gl.ONE;
		case 'GL_ZERO': return gl.ZERO;
		case 'GL_DST_COLOR': return gl.DST_COLOR;
		case 'GL_ONE_MINUS_DST_COLOR': return gl.ONE_MINUS_DST_COLOR;
		case 'GL_SRC_ALPHA': return gl.SRC_ALPHA;
		case 'GL_ONE_MINUS_SRC_ALPHA': return gl.ONE_MINUS_SRC_ALPHA;
		case 'GL_SRC_COLOR': return gl.SRC_COLOR;
		case 'GL_ONE_MINUS_SRC_COLOR': return gl.ONE_MINUS_SRC_COLOR;
		default: return gl.ONE;
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

function TranslateSurfaceFlags(surfaceParms) {
	var surfaceFlags = 0;

	for (var i = 0; i < surfaceParms.length; i++) {
		var parm = surfaceParms[name];
		if (!parm) {
			continue;
		}

		surfaceFlags |= parm.surface;
	}

	return surfaceFlags;
}

function TranslateContentFlags(surfaceParms) {
	var contentFlags = 0;

	for (var i = 0; i < surfaceParms.length; i++) {
		var parm = surfaceParms[name];
		if (!parm) {
			continue;
		}

		contentFlags |= parm.contents;
	}

	return contentFlags;
}

/**
 * FindProgramByScript
 *
 * Reuse previously built programs if they match.
 */
function FindProgramByScript(script) {
	var builder = BuildProgramFromScript(script);
	var vs = builder.getVertexSource();
	var fs = builder.getFragmentSource();

	var key = vs + fs;

	if (!re.programs[key]) {
		var program = CompileProgram(builder.getVertexSource(), builder.getFragmentSource());
		if (!program) {
			log('Failed to compile program for', script.name);
			return null;
		}

		re.programs[key] = program;
	}

	return re.programs[key];
}

/**
 * BuildProgramFromScript
 */
function BuildProgramFromScript(script) {
	var builder = new ShaderBuilder();

	var dlights = r_dlights() && script.sort === SS.OPAQUE;
	var portal = script.portalRange;  // surface doesn't have to be SS.PORTAL to use this
	var vertexColors = !script.sky;

	builder.addAttrib('position', 'vec3');
	builder.addAttrib('normal', 'vec3');
	builder.addAttrib('color', 'vec4');

	builder.addUniform('modelViewMatrix', 'mat4');
	builder.addUniform('projectionMatrix', 'mat4');
	builder.addUniform('viewPosition', 'vec3');
	builder.addUniform('time', 'float');

	//
	// Vertex Shader.
	//
	builder.addVertexLines([
		'vec3 defPosition = position;'
	]);

	if (portal || dlights) {
		builder.addVarying('vPosition', 'vec3');
		builder.addVertexLines([
			'vPosition = position;'
		]);
	}

	if (vertexColors) {
		builder.addVarying('vColor', 'vec4');
		builder.addVertexLines([
			'vColor = color / 255.0;'
		]);
	}

	for(var i = 0; i < script.vertexDeforms.length; i++) {
		var deform = script.vertexDeforms[i];

		switch (deform.type) {
			case 'wave':
				var name = 'deform' + i;
				var offName = 'deformOff' + i;

				builder.addVertexLines([
					'float ' + offName + ' = (position.x + position.y + position.z) * ' + deform.spread.toFixed(4) + ';'
				]);

				var phase = deform.waveform.phase;
				deform.waveform.phase = phase.toFixed(4) + ' + ' + offName;
				builder.addVertexLines([
					builder.createWaveform(name, deform.waveform, true)
				]);
				deform.waveform.phase = phase;

				builder.addVertexLines([
					'defPosition += normal * ' + name + ';'
				]);
				break;

			default:
				break;
		}
	}

	// Disable far plane clipping for skies.
	var w = script.sky ? 0 : 1;
	builder.addVertexLines(['vec4 worldPosition = modelViewMatrix * vec4(defPosition, ' + w + '.0);']);

	for (var i = 0; i < script.stages.length; i++) {
		var stage = script.stages[i];
		BuildVertexPass(builder, script, stage, i);
	}

	builder.addVertexLines(['gl_Position = projectionMatrix * worldPosition;']);

	//
	// Fragment shader.
	//
	builder.addFragmentLines([
		'vec4 passColor;'
	]);

	// Add fog pass first.
	if (script.fog) {
		builder.addFragmentLines([
			'vec4 fragColor = vec4(0.0, 1.0, 0.0, 1.0);',
			'float z = (gl_FragCoord.z / gl_FragCoord.w) / 4000.0;',
			'fragColor.a = z;'
		]);
	}

	// Add individual stages.
	for (var i = 0; i < script.stages.length; i++) {
		var stage = script.stages[i];
		BuildFragmentPass(builder, script, stage, i);
	}

	// Add dlights as the final pass.
	if (dlights) {
		builder.addUniform('dlights[' + MAX_DLIGHTS * 2 + ']', 'vec4');
		builder.addUniform('dlightCount', 'int');
		builder.addUniform('dlightBits', 'int');

		var dlightFunc = 'vec4 dlightPass() {\n' +
						 '	vec4 fragColor = vec4(0.0, 0.0, 0.0, 1.0);\n' +
						 '	for (int i = 0; i < ' + MAX_DLIGHTS + '; i++) {\n' +
						 '		if (i >= dlightCount) break;\n' +
						 '		if (int(mod(floor(float(dlightBits) / pow(2.0, float(i))), 2.0)) == 0) {\n' +
						 '			continue;\n' +
						 '		}\n' +
						 '		vec4 pos = dlights[i*2];\n' +
						 '		vec4 color = dlights[i*2+1];\n' +
						 '		float dist = length(vPosition - pos.xyz);\n' +
						 '		float radius = color.a;\n' +
						 '		float a = clamp(1.0 - (dist / radius), 0.0, 1.0);\n' +
						 '		fragColor.rgb += color.rgb * a;\n' +
						 '	}\n' +
						 '	return fragColor;\n' +
						 '}\n';

		builder.addFragmentFunction('dlightPass', dlightFunc);
		builder.addFragmentLines([
			'passColor = dlightPass();',
			builder.createBlend('passColor', 'fragColor', 'GL_DST_COLOR', 'GL_ONE')
		]);
	}

	builder.addFragmentLines([
		'gl_FragColor = fragColor;'
	]);

	// if (script.name === 'textures/sfx/portal_sfx_ring') {
	// 	console.log('textures/sfx/portal_sfx_ring', builder.getFragmentSource());
	// }

	return builder;
}

/**
 * BuildVertexPass
 */
function BuildVertexPass(builder, script, stage, stageId) {
	var passName = 'vertPass' + stageId;
	var texCoordVar = 'vTexCoord' + stageId;
	builder.addVarying(texCoordVar, 'vec2');

	if (stage.isLightmap) {
		builder.addAttrib('lightCoord', 'vec2');
	} else {
		builder.addAttrib('texCoord', 'vec2');
	}

	var passFunc = 'vec2 ' + passName + '(vec4 worldPosition) {\n';
	passFunc += '	vec2 vTexCoord;\n';

	if (stage.tcGen === 'environment') {
		passFunc += [
			'	vec3 viewer = normalize(viewPosition - position);\n',
			'float d = dot(normal, viewer);\n',
			'vec3 reflected = normal*2.0*d - viewer;\n',
			'vTexCoord = vec2(0.5 + reflected.y * 0.5, 0.5 - reflected.z * 0.5);\n'
		].join('\n\t');
	} else {
		// Standard texturing
		if (stage.isLightmap) {
			passFunc += '	vTexCoord = lightCoord;\n';
		} else {
			passFunc += '	vTexCoord = texCoord;\n';
		}
	}

	switch (stage.alphaGen) {
		case 'lightingspecular':
			builder.addVertexLines([
				'vec3 lightOrigin = vec3(-960.0, 1980.0, 96.0);',
				'vec3 lightDir = normalize(lightOrigin - position);',
				'float d = dot(normal, lightDir);',
				'vec3 reflected = normal * 2.0 * d - lightDir;',
				'vec3 viewer = viewPosition - position;',
				'float ilength = inversesqrt(dot(viewer, viewer));',
				'float l = dot(reflected, viewer) * ilength;',
				'if (l > 0.0) {',
				'	l = l*l*l;',
				'} else {',
				'	l = 0.0;',
				'}',
				'vColor.a = min(l, 1.0);'
			]);
			break;
		default:
			break;
	}

	// tcMods
	for (var i = 0; i < stage.tcMods.length; i++) {
		var tcMod = stage.tcMods[i];
		switch (tcMod.type) {
			case 'rotate':
				passFunc += [
					'	float r = ' + tcMod.angle.toFixed(4) + ' * time;',
					'vTexCoord -= vec2(0.5, 0.5);',
					'vTexCoord = vec2(vTexCoord.s * cos(r) - vTexCoord.t * sin(r), vTexCoord.t * cos(r) + vTexCoord.s * sin(r));',
					'vTexCoord += vec2(0.5, 0.5);\n'
				].join('\n\t');
				break;
			case 'scroll':
				passFunc += '	vTexCoord += vec2(' + tcMod.sSpeed.toFixed(4) + ' * time, ' + tcMod.tSpeed.toFixed(4) + ' * time);\n';
				break;
			case 'scale':
				passFunc += '	vTexCoord *= vec2(' + tcMod.scaleX.toFixed(4) + ', ' + tcMod.scaleY.toFixed(4) + ');\n';
				break;
			case 'stretch':
				passFunc += [
					'	' + builder.createWaveform('stretchWave', tcMod.waveform, true),
					'stretchWave = 1.0 / stretchWave;',
					'vTexCoord *= stretchWave;',
					'vTexCoord += vec2(0.5 - (0.5 * stretchWave), 0.5 - (0.5 * stretchWave));\n'
				].join('\n\t');
				break;
			case 'turb':
				var tName = 'turbTime' + i;
				passFunc += [
					'	float ' + tName + ' = ' + tcMod.turbulance.phase.toFixed(4) + ' + time * ' + tcMod.turbulance.freq.toFixed(4) + ';',
					'vTexCoord.s += sin( ( ( position.x + position.z )* 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.turbulance.amp.toFixed(4) + ';',
					'vTexCoord.t += sin( ( position.y * 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.turbulance.amp.toFixed(4) + ';\n'
				].join('\n\t');
				break;
			default:
				break;
		}
	}

	passFunc += '	return vTexCoord;\n';
	passFunc += '}';

	builder.addVertexFunction(passName, passFunc);
	builder.addVertexLines([texCoordVar + ' = ' + passName + '(worldPosition);']);
}

/**
 * BuildFragmentPass
 */
function BuildFragmentPass(builder, script, stage, stageId) {
	var passName = 'fragPass' + stageId;
	var samplerVar = 'texSampler' + stageId;
	var texCoordVar = 'vTexCoord' + stageId;

	builder.addUniform(samplerVar, 'sampler2D');

	var passFunc = 'vec4 ' + passName + '(sampler2D texture, vec2 vTexCoord) {\n';
		passFunc += '	vec4 texColor = texture2D(texture, vTexCoord);\n';

	switch (stage.rgbGen) {
		case 'vertex':  // TODO vertex lighting should multiply by the identityLight constant
		case 'exactvertex':
		case 'entity':
		case 'lightingdiffuse':
			passFunc += '	vec3 rgb = texColor.rgb * vColor.rgb;\n';
			break;
		case 'wave':
			passFunc += '	' + builder.createWaveform('rgbWave', stage.rgbWaveform, false) + '\n';
			passFunc += '	vec3 rgb = texColor.rgb * rgbWave;\n';
			break;
		default:
			passFunc += '	vec3 rgb = texColor.rgb;\n';
			break;
	}

	switch (stage.alphaGen) {
		case 'vertex':
		case 'entity':
		case 'lightingspecular':
			passFunc += '	float alpha = texColor.a * vColor.a;\n';
			break;
		case 'wave':
			passFunc += '	' + builder.createWaveform('alphaWave', stage.alphaWaveform, false);
			passFunc += '	float alpha = texColor.a * alphaWave;\n';
			break;
		case 'portal':
			passFunc += '	float alpha = clamp(length(vPosition - viewPosition) / ' + script.portalRange.toFixed(1) + ', 0.0, 1.0);\n';
			break;
		default:
			passFunc += '	float alpha = texColor.a;\n';
			break;
	}

	if (stage.alphaFunc) {
		switch (stage.alphaFunc) {
			case 'GT0':
				passFunc += '	if (alpha == 0.0) { discard; }\n';
				break;
			case 'LT128':
				passFunc += '	if (alpha >= 0.5) { discard; }\n';
				break;
			case 'GE128':
				passFunc += '	if (alpha < 0.5) { discard; }\n';
				break;
			default:
				break;
		}
	}

	passFunc += '	return vec4(rgb, alpha);\n';
	passFunc += '}';

	builder.addFragmentFunction(passName, passFunc);

	if (stageId === 0 && !script.fog) {
		builder.addFragmentLines([
			'vec4 fragColor = ' + passName + '(' + samplerVar + ', ' + texCoordVar + ');'
		]);
	} else {
		builder.addFragmentLines([
			'passColor = ' + passName + '(' + samplerVar + ', ' + texCoordVar + ');',
			builder.createBlend('passColor', 'fragColor', stage.blendSrc, stage.blendDest)
		]);
	}
}

/**
 * CompileProgram
 *
 * Compilex vertex and fragment source into a WebGL
 * shader program, and properties to returned object
 * to easily modify shader parameters.
 */
function CompileProgram(vertexSrc, fragmentSrc) {
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, fragmentSrc);
	gl.compileShader(fragmentShader);

	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		log('Could not compile fragment shader:');
		log(gl.getShaderInfoLog(fragmentShader));
		log(vertexSrc);
		log(fragmentSrc);
		gl.deleteShader(fragmentShader);
		return null;
	}

	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexSrc);
	gl.compileShader(vertexShader);

	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		log('Could not compile vertex shader:');
		log(gl.getShaderInfoLog(vertexShader));
		log(vertexSrc);
		log(fragmentSrc);
		gl.deleteShader(vertexShader);
		return null;
	}

	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		log('Could not link shaders');
		log(vertexSrc);
		log(fragmentSrc);
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

	return shaderProgram;
}

/**
 * ShaderBuilder
 *
 * Helper to build GLSL compatible shaders.
 */
var ShaderBuilder = function() {
	this.attribs = {};
	this.varyings = {};
	this.uniforms = {};

	this.vertexFunctions = {};
	this.fragmentFunctions = {};

	this.vertexLines = [];
	this.fragmentLines = [];
};

ShaderBuilder.prototype.addAttrib = function(name, type) {
	this.attribs[name] = type;
};

ShaderBuilder.prototype.addVarying = function(name, type) {
	this.varyings[name] = type;
};

ShaderBuilder.prototype.addUniform = function(name, data) {
	this.uniforms[name] = data;
};

ShaderBuilder.prototype.addVertexFunction = function(name, src) {
	this.vertexFunctions[name] = src;
};

ShaderBuilder.prototype.addFragmentFunction = function(name, src) {
	this.fragmentFunctions[name] = src;
};

ShaderBuilder.prototype.addVertexLines = function(lines) {
	var i;
	for(i in lines) {
		this.vertexLines.push(lines[i]);
	}
};

ShaderBuilder.prototype.addFragmentLines = function(lines) {
	var i;
	for(i in lines) {
		this.fragmentLines.push(lines[i]);
	}
};

ShaderBuilder.prototype.createWaveform = function (name, wf, vertex) {
	if (!wf) {
		return 'float ' + name + ' = 0.0;';
	}
	if (typeof(wf.phase) === 'number') {
		wf.phase = wf.phase.toFixed(4);
	}

	var timeVar = 'time';
	var funcName;

	switch (wf.funcName) {
		case 'sin':
			return 'float ' + name + ' = ' + wf.base.toFixed(4) + ' + sin((' + wf.phase + ' + ' + timeVar + ' * ' + wf.freq.toFixed(4) + ') * 6.283) * ' + wf.amp.toFixed(4) + ';';
		case 'square': funcName = 'square'; this.addSquareFunc(vertex); break;
		case 'triangle': funcName = 'triangle'; this.addTriangleFunc(vertex); break;
		case 'sawtooth': funcName = 'fract'; break;
		case 'inversesawtooth': funcName = '1.0 - fract'; break;
		default:
			return 'float ' + name + ' = 0.0;';
	}
	return 'float ' + name + ' = ' + wf.base.toFixed(4) + ' + (' + funcName + '(' + wf.phase + ' + ' + timeVar + ' * ' + wf.freq.toFixed(4) + ')) * ' + wf.amp.toFixed(4) + ';';
};

ShaderBuilder.prototype.addSquareFunc = function(vertex) {
	var func = [
		'float square(float val) {',
		'	return (mod(floor(val*2.0)+1.0, 2.0) * 2.0) - 1.0;',
		'}'
	].join('\n');

	if (vertex) {
		this.addVertexFunction('square', func);
	} else {
		this.addFragmentFunction('square', func);
	}
};

ShaderBuilder.prototype.addTriangleFunc = function(vertex) {
	var func = [
		'float triangle(float val) {',
		'	return abs(2.0 * fract(val) - 1.0);',
		'}'
	].join('\n');

	if (vertex) {
		this.addVertexFunction('triangle', func);
	} else {
		this.addFragmentFunction('triangle', func);
	}
};

/**
 * FIXME
 *
 * When applying the shaders generated by this, we call glDepthFunc()
 * with the first stage's blend function. Then, we emulate blending
 * for each subsequent stage. This is not entirely accurate, to see
 * some examples of it breaking down, check out textures/sfx/portal_sfx_ring
 * and textures/sfx/portal_sfx which are used in Q3DM7's portal room.
 */
ShaderBuilder.prototype.createBlend = function(srcVar, destVar, srcFunc, destFunc) {
	var srcCode;
	var destCode;

	switch (srcFunc) {
		case 'GL_ZERO':                srcCode = ''; break;
		case 'GL_ONE':                 srcCode = srcVar; break;
		case 'GL_DST_COLOR':           srcCode = srcVar + ' * ' + destVar; break;
		case 'GL_ONE_MINUS_DST_COLOR': srcCode = srcVar + ' * (1.0 - ' + destVar + ')'; break;
		case 'GL_SRC_ALPHA':           srcCode = srcVar + ' * ' + srcVar + '.a'; break;
		case 'GL_ONE_MINUS_SRC_ALPHA': srcCode = srcVar + ' * (1.0 - ' + srcVar + '.a)'; break;
		case 'GL_DST_ALPHA':           srcCode = srcVar + ' * ' + destVar + '.a'; break;
		case 'GL_ONE_MINUS_DST_ALPHA': srcCode = srcVar + ' * (1.0 - ' + destVar + '.a)'; break;
		default:                       srcCode = srcVar; break;
	}

	switch (destFunc) {
		case 'GL_ZERO':                destCode = ''; break;
		case 'GL_ONE':                 destCode = destVar; break;
		case 'GL_SRC_COLOR':           destCode = destVar + ' * ' + srcVar; break;
		case 'GL_ONE_MINUS_SRC_COLOR': destCode = destVar + ' * (1.0 - ' + srcVar + ')'; break;
		case 'GL_SRC_ALPHA':           destCode = destVar + ' * ' + srcVar + '.a'; break;
		case 'GL_ONE_MINUS_SRC_ALPHA': destCode = destVar + ' * (1.0 - ' + srcVar + '.a)'; break;
		case 'GL_DST_ALPHA':           destCode = destVar + ' * ' + destVar + '.a'; break;
		case 'GL_ONE_MINUS_DST_ALPHA': destCode = destVar + ' * (1.0 - ' + destVar + '.a)'; break;
		default:                       destCode = destVar; break;
	}


	return destVar + ' = ' + srcCode + (srcCode !== '' && destCode !== '' ? ' + ' : '') + destCode + ';';
};

ShaderBuilder.prototype.getVertexSource = function() {
	var src = '#ifdef GL_ES\n' +
		'	precision highp float;\n' +
		'#endif\n';

	for (var i in this.attribs) {
		src += 'attribute ' + this.attribs[i] + ' ' + i + ';\n';
	}

	for (var i in this.varyings) {
		src += 'varying ' + this.varyings[i] + ' ' + i + ';\n';
	}

	for (var i in this.uniforms) {
		src += 'uniform ' + this.uniforms[i] + ' ' + i + ';\n';
	}

	src += '\n';

	for (var i in this.vertexFunctions) {
		src += this.vertexFunctions[i] + '\n';
	}

	src += 'void main() {\n\t';
	src += this.vertexLines.join('\n\t');
	src += '\n}\n';

	return src;
};

ShaderBuilder.prototype.getFragmentSource = function() {
	var src = '#ifdef GL_ES\n' +
		'	precision highp float;\n' +
		'#endif\n';

	for (var i in this.varyings) {
		src += 'varying ' + this.varyings[i] + ' ' + i + ';\n';
	}

	for (var i in this.uniforms) {
		src += 'uniform ' + this.uniforms[i] + ' ' + i + ';\n';
	}

	src += '\n';

	for (var i in this.fragmentFunctions) {
		src += this.fragmentFunctions[i] + '\n';
	}

	src += 'void main() {\n\t';
	src += this.fragmentLines.join('\n\t');
	src += '\n}\n';

	return src;
};

/**
 * ParseScript
 *
 * Parses a source q3 shader script.
 */
function ParseScript(shaderText, lightmapIndex) {
	var tokens = new TextTokenizer(shaderText);
	var script = new Script();
	script.name = tokens.next();
	script.lightmapIndex = lightmapIndex;

	// Sanity check.
	if (tokens.next() !== '{') return null;

	while (!tokens.EOF()) {
		var token = tokens.next().toLowerCase();

		if (token == '}') break;

		switch (token) {
			case '{': {
				var stage = ParseScriptStage(script, tokens);

				// I really really really don't like doing this, which basically just forces lightmaps to use the 'filter' blendmode
				// but if I don't a lot of textures end up looking too bright. I'm sure I'm just missing something, and this shouldn't
				// be needed.
				if (stage.isLightmap && stage.hasBlendFunc) {
					stage.blendSrc = 'GL_DST_COLOR';
					stage.blendDest = 'GL_ZERO';
				}

				script.stages.push(stage);
			} break;

			case 'sort':
				var sort = tokens.next().toLowerCase();
				switch (sort) {
					case 'portal':     script.sort = SS.PORTAL;          break;
					case 'sky':        script.sort = SS.ENVIRONMENT;     break;
					case 'opaque':     script.sort = SS.OPAQUE;          break;
					case 'decal':      script.sort = SS.DECAL;           break;
					case 'seeThrough': script.sort = SS.SEE_THROUGH;     break;
					case 'banner':     script.sort = SS.BANNER;          break;
					case 'additive':   script.sort = SS.BLEND1;          break;
					case 'nearest':    script.sort = SS.NEAREST;         break;
					case 'underwater': script.sort = SS.UNDERWATER;      break;
					default:           script.sort = parseInt(sort, 10); break;
				}
				break;

			case 'cull':
				script.cull = tokens.next();
				break;

			case 'deformvertexes':
				var deform = {
					type: tokens.next().toLowerCase()
				};

				switch (deform.type) {
					case 'wave':
						deform.spread = 1.0 / parseFloat(tokens.next());
						deform.waveform = ParseWaveform(tokens);
						break;
					default:
						deform = null;
						break;
				}

				if (deform) {
					script.vertexDeforms.push(deform);
				}
				break;

			case 'surfaceparm':
				script.surfaceParms.push(tokens.next().toLowerCase());
				continue;

			case 'polygonoffset':
				script.polygonOffset = true;
				break;

			// entityMergable, allowing sprite surfaces from multiple entities
			// to be merged into one batch.  This is a savings for smoke
			// puffs and blood, but can't be used for anything where the
			// shader calcs (not the surface function) reference the entity color or scroll
			case 'entitymergable':
				script.entityMergable = true;
				break;

			case 'portal':
				script.sort = SS.PORTAL;
				break;

			case 'fogparms':
				script.fog = true;
				script.sort = SS.FOG;
				break;

			// TODO Parse cloud size.
			case 'skyparms':
				script.sky = true;
				script.sort = SS.ENVIRONMENT;
				break;

			default: break;
		}
	}

	//
	// If the shader is using polygon offset,
	// it's a decal shader.
	//
	if (script.polygonOffset && !script.sort) {
		script.sort = SS.DECAL;
	}

	for (var i = 0; i < script.stages.length; i++) {
		var stage = script.stages[i];

		//
		// Determine sort order and fog color adjustment
		//
		if (script.stages[0].hasBlendFunc && stage.hasBlendFunc) {
			// Don't screw with sort order if this is a portal or environment.
			if (!script.sort) {
				// See through item, like a grill or grate.
				if (stage.depthWrite) {
					script.sort = SS.SEE_THROUGH;
				} else {
					script.sort = SS.BLEND0;
				}
			}
		}
	}

	// There are times when you will need to manually apply a sort to
	// opaque alpha tested shaders that have later blend passes.
	if (!script.sort) {
		script.sort = SS.OPAQUE;
	}

	return script;
}

/**
 * ParseScriptStage
 */
function ParseScriptStage(script, tokens) {
	var scriptStage = new ScriptStage();

	while (!tokens.EOF()) {
		var token = tokens.next();
		if (token == '}') {
			break;
		}

		switch (token.toLowerCase()) {
			case 'clampmap':
				scriptStage.clamp = true;
			case 'map':
				var map = tokens.next();
				if (!map) {
					error('WARNING: missing parameter for \'map\' keyword in script \'' + script.name + '\'');
				}
				if (map === '$whiteimage') {
					map = '*white';
				} else if (map == '$lightmap') {
					scriptStage.isLightmap = true;
					if (script.lightmapIndex < 0) {
						map = '*white';
					} else {
						map = '*lightmap';
					}
				}
				scriptStage.maps.push(map);
				break;

			case 'animmap':
				scriptStage.animFrame = 0;
				scriptStage.animFreq = parseFloat(tokens.next());
				var nextMap = tokens.next();
				while (nextMap.match(/\.[^\/.]+$/)) {
					var map = nextMap;
					scriptStage.maps.push(map);
					nextMap = tokens.next();
				}
				tokens.prev();
				break;

			case 'rgbgen':
				scriptStage.rgbGen = tokens.next().toLowerCase();
				switch (scriptStage.rgbGen) {
					case 'wave':
						scriptStage.rgbWaveform = ParseWaveform(tokens);
						if (!scriptStage.rgbWaveform) { scriptStage.rgbGen = 'identity'; }
						break;
				}
				break;

			case 'alphagen':
				scriptStage.alphaGen = tokens.next().toLowerCase();
				switch (scriptStage.alphaGen) {
					case 'wave':
						scriptStage.alphaWaveform = ParseWaveform(tokens);
						if (!scriptStage.alphaWaveform) { scriptStage.alphaGen = '1.0'; }
						break;
					case 'portal':
						script.portalRange = parseFloat(tokens.next().toLowerCase());
						break;
					default: break;
				}
				break;

			case 'alphafunc':
				scriptStage.alphaFunc = tokens.next().toUpperCase();
				break;

			case 'blendfunc':
				scriptStage.blendSrc = tokens.next().toUpperCase();
				scriptStage.hasBlendFunc = true;
				if (!scriptStage.depthWriteOverride) {
					scriptStage.depthWrite = false;
				}
				switch (scriptStage.blendSrc) {
					case 'ADD':
						scriptStage.blendSrc = 'GL_ONE';
						scriptStage.blendDest = 'GL_ONE';
						break;

					case 'BLEND':
						scriptStage.blendSrc = 'GL_SRC_ALPHA';
						scriptStage.blendDest = 'GL_ONE_MINUS_SRC_ALPHA';
						break;

					case 'FILTER':
						scriptStage.blendSrc = 'GL_DST_COLOR';
						scriptStage.blendDest = 'GL_ZERO';
						break;

					default:
						scriptStage.blendDest = tokens.next().toUpperCase();
						break;
				}
				break;

			case 'depthfunc':
				scriptStage.depthFunc = tokens.next().toLowerCase();
				break;

			case 'depthwrite':
				scriptStage.depthWrite = true;
				scriptStage.depthWriteOverride = true;
				break;

			case 'tcmod':
				var tcMod = {
					type: tokens.next().toLowerCase()
				};
				switch (tcMod.type) {
					case 'rotate':
						tcMod.angle = parseFloat(tokens.next()) * (3.1415/180);
						break;
					case 'scale':
						tcMod.scaleX = parseFloat(tokens.next());
						tcMod.scaleY = parseFloat(tokens.next());
						break;
					case 'scroll':
						tcMod.sSpeed = parseFloat(tokens.next());
						tcMod.tSpeed = parseFloat(tokens.next());
						break;
					case 'stretch':
						tcMod.waveform = ParseWaveform(tokens);
						if (!tcMod.waveform) { tcMod.type = null; }
						break;
					case 'turb':
						tcMod.turbulance = {
							base: parseFloat(tokens.next()),
							amp: parseFloat(tokens.next()),
							phase: parseFloat(tokens.next()),
							freq: parseFloat(tokens.next())
						};
						break;
					default: tcMod.type = null; break;
				}
				if (tcMod.type) {
					scriptStage.tcMods.push(tcMod);
				}
				break;
			case 'tcgen':
				scriptStage.tcGen = tokens.next();
				break;
			default: break;
		}
	}

	if (scriptStage.blendSrc == 'GL_ONE' && scriptStage.blendDest == 'GL_ZERO') {
		scriptStage.hasBlendFunc = false;
		scriptStage.depthWrite = true;
	}

	return scriptStage;
}

/**
 * ParseWaveform
 */
function ParseWaveform(tokens) {
	return {
		funcName: tokens.next().toLowerCase(),
		base: parseFloat(tokens.next()),
		amp: parseFloat(tokens.next()),
		phase: parseFloat(tokens.next()),
		freq: parseFloat(tokens.next())
	};
}