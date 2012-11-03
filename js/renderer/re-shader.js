/**
 * InitShaders
 */
function InitShaders(callback) {
	// TODO there are some serious race conditions here, as we don't wait for these to finish loading
	// Thankfully these almost always finish before the map loads.
	ScanAndLoadShaderPrograms(function () {
		InitDefaultShaders();

		ScanAndLoadShaderScripts(function () {
			if (callback) callback();
		});
	});
}

/**
 * InitDefaultShaders
 */
function InitDefaultShaders() {
	// These default programs are used to render textures without a shader.
	re.programDefault = CompileShaderProgram(re.programBodies['default.vp'], re.programBodies['default.fp']);
	re.programNoLightmap = CompileShaderProgram(re.programBodies['default.vp'], re.programBodies['nolightmap.fp']);

	// Default shader.
	var shader = re.defaultShader = new Shader();
	var stage = new ShaderStage();
	shader.name = '<default>';
	stage.program = re.programDefault;
	stage.texture = FindImage('*default');
	shader.stages.push(stage);
	RegisterShader(shader.name, shader);

	// Register green debug shader.
	shader = new Shader();
	stage = new ShaderStage();
	shader.mode = gl.LINE_LOOP;
	shader.name = 'debugGreenShader';
	stage.program = CompileShaderProgram(re.programBodies['default.vp'], re.programBodies['green.fp']);
	shader.stages.push(stage);
	RegisterShader(shader.name, shader);
}

/**
 * FindShader
 */
function FindShader(shaderName, lightmapIndex) {
	var mapName = shaderName;

	// Never use file extension for shader lookup.
	shaderName = shaderName.replace(/\.[^\.]+$/, '');

	for (var i = 0; i < re.shaders.length; i++) {
		if (re.shaders[i].name === shaderName) {
			return re.shaders[i];
		}
	}

	var shader;
	// TODO We should free up these shader bodies, they occupy ~4 MB of memory for no reason.
	if (re.shaderBodies[shaderName]) {
		var shaderText = re.shaderBodies[shaderName];
		var q3shader = ParseShader(shaderText, lightmapIndex);

		shader = TranslateShader(q3shader);
	} else {
		// There is no shader for this name, let's create a default.
		shader = new Shader();
		shader.name = shaderName;

		var stage = new ShaderStage();
		stage.texture = FindImage(mapName);

		if (lightmapIndex === LightmapType.VERTEX || lightmapIndex === LightmapType.NONE) {
			stage.program = re.programNoLightmap;
		} else {
			stage.program = re.programDefault;
		}
		
		shader.stages.push(stage);
	}

	RegisterShader(shaderName, shader);

	return shader;
}

/**
 * RegisterShader
 */
function RegisterShader(shaderName, shader) {
	if (re.sortedShaders.length === MAX_SHADERS) {
		console.warn('RegisterShader - MAX_SHADERS hit');
		return FindShader('*default');
	}

	shader.index = re.shaders.length;
	re.shaders.push(shader);

	SortShader(shader);

	return shader.index;
}

/**
 * SortShader
 */
function SortShader(shader) {
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
 * GetShaderByHandle
 */
function GetShaderByHandle(hShader) {
	if (hShader < 0) {
		console.warn('GetShaderByHandle: out of range hShader \'' + hShader + '\'');
		return re.defaultShader;
	}
	if (hShader >= re.shaders.length) {
		console.warn('GetShaderByHandle: out of range hShader \'' + hShader + '\'');
		return re.defaultShader;
	}

	return re.shaders[hShader];
}

/**
 * ScanAndLoadShaderScripts
 */
function ScanAndLoadShaderScripts(callback) {
	var allShaders = [
		'scripts/base.shader', 'scripts/base_button.shader', 'scripts/base_floor.shader',
		'scripts/base_light.shader', 'scripts/base_object.shader', 'scripts/base_support.shader',
		'scripts/base_trim.shader', 'scripts/base_wall.shader', 'scripts/common.shader',
		'scripts/ctf.shader', 'scripts/eerie.shader', 'scripts/gfx.shader',
		'scripts/gothic_block.shader', 'scripts/gothic_floor.shader', 'scripts/gothic_light.shader',
		'scripts/gothic_trim.shader', 'scripts/gothic_wall.shader', 'scripts/hell.shader',
		'scripts/liquid.shader', 'scripts/menu.shader', 'scripts/models.shader',
		'scripts/organics.shader', 'scripts/sfx.shader', 'scripts/shrine.shader',
		'scripts/skin.shader', 'scripts/sky.shader', 'scripts/test.shader'
	];

	var done = 0;

	var shaderLoaded = function () {
		// Trigger callback if we've processed all the programs.
		if (++done === allShaders.length) {
			if (callback) callback();
		}
	};

	for (var i = 0; i < allShaders.length; i++) {
		LoadShaderScript(allShaders[i], shaderLoaded);
	}
}

/**
 * LoadShaderScript
 */
function LoadShaderScript(path, callback) {
	sys.ReadFile(path, 'utf8', function (err, data) {
		if (err) throw err;

		// Tokenize the file and spit out the shader names / bodies
		// into a hashtable.
		var tokens = new ShaderTokenizer(data);

		while (!tokens.EOF()) {
			var shaderName = tokens.next();

			var depth = 0;
			var shaderText = shaderName + ' ';
			do {
				var token = tokens.next();

				if (token === '{') {
					depth++;
				} else if (token === '}') {
					depth--;
				}

				shaderText += token + ' ';
			} while (depth && !tokens.EOF());

			re.shaderBodies[shaderName] = shaderText;
		}

		if (callback) callback();
	});
}

/**
 * ScanAndLoadShaderPrograms
 */
function ScanAndLoadShaderPrograms(callback) {
	var allPrograms = [
		'programs/default.vp',
		'programs/default.fp', 'programs/nolightmap.fp', 'programs/green.fp'
	];

	var done = 0;

	var programLoaded = function () {
		// Trigger callback if we've processed all the programs.
		if (++done === allPrograms.length) {
			if (callback) return callback();
		}
	};

	for (var i = 0; i < allPrograms.length; i++) {
		LoadShaderProgram(allPrograms[i], programLoaded);
	}
}

/**
 * LoadShaderProgram
 */
function LoadShaderProgram(path, callback) {
	sys.ReadFile(path, 'utf8', function (err, data) {
		if (err) throw err;
		
		// Use basename as name.
		var programName = path.replace(/.*\//, '');
		re.programBodies[programName] = data;
		if (callback) return callback();
	});
}

/**
 * CompileShaderProgram
 *
 * Compilex vertex and fragment source into a WebGL
 * shader program, and properties to returned object
 * to easily modify shader parameters.
 */
function CompileShaderProgram(vertexSrc, fragmentSrc) {
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, fragmentSrc);
	gl.compileShader(fragmentShader);

	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		console.debug('Could not compile fragment shader:');
		console.debug(gl.getShaderInfoLog(fragmentShader));
		console.debug(vertexSrc);
		console.debug(fragmentSrc);
		gl.deleteShader(fragmentShader);
		return null;
	}

	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexSrc);
	gl.compileShader(vertexShader);

	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		console.debug('Could not compile vertex shader:');
		console.debug(gl.getShaderInfoLog(vertexShader));
		console.debug(vertexSrc);
		console.debug(fragmentSrc);
		gl.deleteShader(vertexShader);
		return null;
	}

	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		console.debug('Could not link shaders');
		console.debug(vertexSrc);
		console.debug(fragmentSrc);
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

/**********************************************************
 *
 * Q3 Shader parser
 *
 **********************************************************/

/**
 * ParseShader
 */
function ParseShader(shaderText, lightmapIndex) {
	var tokens = new ShaderTokenizer(shaderText);
	var shader = new Q3Shader();
	shader.name = tokens.next();
	shader.lightmapIndex = lightmapIndex;

	// Sanity check.
	if (tokens.next() !== '{') return null;

	while (!tokens.EOF()) {
		var token = tokens.next().toLowerCase();

		if (token == '}') break;

		switch (token) {
			case '{': {
				var stage = ParseShaderStage(shader, tokens);

				// I really really really don't like doing this, which basically just forces lightmaps to use the 'filter' blendmode
				// but if I don't a lot of textures end up looking too bright. I'm sure I'm jsut missing something, and this shouldn't
				// be needed.
				if (stage.isLightmap && (stage.hasBlendFunc)) {
					stage.blendSrc = 'GL_DST_COLOR';
					stage.blendDest = 'GL_ZERO';
				}

				// I'm having a ton of trouble getting lightingSpecular to work properly,
				// so this little hack gets it looking right till I can figure out the problem
				if(stage.alphaGen == 'lightingspecular') {
					stage.blendSrc = 'GL_ONE';
					stage.blendDest = 'GL_ZERO';
					stage.hasBlendFunc = false;
					stage.depthWrite = true;
					shader.stages = [];
				}

				if(stage.hasBlendFunc) { shader.blend = true; } else { shader.opaque = true; }

				shader.stages.push(stage);
			} break;

			case 'cull':
				shader.cull = tokens.next();
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
					shader.vertexDeforms.push(deform);
				}
				break;

			case 'sort':
				var sort = tokens.next().toLowerCase();
				switch(sort) {
					case 'portal':     shader.sort = ShaderSort.PORTAL;         break;
					case 'sky':        shader.sort = ShaderSort.ENVIRONMENT;    break;
					case 'opaque':     shader.sort = ShaderSort.OPAQUE;         break;
					case 'decal':      shader.sort = ShaderSort.DECAL;          break;
					case 'seeThrough': shader.sort = ShaderSort.SEE_THROUGH;    break;
					case 'banner':     shader.sort = ShaderSort.BANNER;         break;
					case 'additive':   shader.sort = ShaderSort.BLEND1;         break;
					case 'nearest':    shader.sort = ShaderSort.NEAREST;        break;
					case 'underwater': shader.sort = ShaderSort.UNDERWATER;     break;
					default:           shader.sort = parseInt(sort, 10);        break;
				}
				break;

			case 'surfaceparm':
				var param = tokens.next().toLowerCase();

				switch (param) {
					case 'sky':
						shader.sky = true;
						break;
					default: break;
				}
				break;

			default: break;
		}
	}

	if (!shader.sort) {
		/*// see through item, like a grill or grate
		if (pStage->stateBits & GLS_DEPTHContentMasks.TRUE ) {
			shader.sort = ShaderSort.SEE_THROUGH;
		} else {
			shader.sort = ShaderSort.BLEND0;
		}*/
		if (shader.opaque) {
			shader.sort = ShaderSort.OPAQUE;
		} else {
			shader.sort = ShaderSort.BLEND0;
		}
	}

	return shader;
}

/**
 * ParseShaderStage
 */
function ParseShaderStage(shader, tokens) {
	var stage = new Q3ShaderStage();

	// Parse a shader
	while (!tokens.EOF()) {
		var token = tokens.next();
		if (token == '}') {
			break;
		}

		switch (token.toLowerCase()) {
			case 'clampmap':
				stage.clamp = true;
			case 'map':
				stage.map = tokens.next();
				if (!stage.map) {
					throw new Error('WARNING: missing parameter for \'map\' keyword in shader \'' + shader.name + '\'');
				}
				if (stage.map === '$whiteimage') {
					stage.texture = FindImage('*white');
				} else if (stage.map == '$lightmap') {
					stage.isLightmap = true;

					if (shader.lightmapIndex < 0) {
						stage.texture = FindImage('*white');
					} else {
						stage.texture = FindImage('*lightmap');
					}
				} else {
					stage.texture = FindImage(stage.map, stage.clamp);
				}
				break;

			case 'animmap':
				stage.animFrame = 0;
				stage.animFreq = parseFloat(tokens.next());
				var nextMap = tokens.next();
				stage.animTextures = [];
				while (nextMap.match(/\.[^\/.]+$/)) {
					var map = nextMap;
					stage.animMaps.push(map);
					stage.animTextures.push(FindImage(map, stage.clamp));
					nextMap = tokens.next();
				}
				tokens.prev();
				break;

			case 'rgbgen':
				stage.rgbGen = tokens.next().toLowerCase();
				switch (stage.rgbGen) {
					case 'wave':
						stage.rgbWaveform = ParseWaveform(tokens);
						if(!stage.rgbWaveform) { stage.rgbGen == 'identity'; }
						break;
				}
				break;

			case 'alphagen':
				stage.alphaGen = tokens.next().toLowerCase();
				switch (stage.alphaGen) {
					case 'wave':
						stage.alphaWaveform = ParseWaveform(tokens);
						if(!stage.alphaWaveform) { stage.alphaGen == '1.0'; }
						break;
					default: break;
				}
				break;

			case 'alphafunc':
				stage.alphaFunc = tokens.next().toUpperCase();
				break;

			case 'blendfunc':
				stage.blendSrc = tokens.next();
				stage.hasBlendFunc = true;
				if(!stage.depthWriteOverride) {
					stage.depthWrite = false;
				}
				switch(stage.blendSrc) {
					case 'add':
						stage.blendSrc = 'GL_ONE';
						stage.blendDest = 'GL_ONE';
						break;

					case 'blend':
						stage.blendSrc = 'GL_SRC_ALPHA';
						stage.blendDest = 'GL_ONE_MINUS_SRC_ALPHA';
						break;

					case 'filter':
						stage.blendSrc = 'GL_DST_COLOR';
						stage.blendDest = 'GL_ZERO';
						break;

					default:
						stage.blendDest = tokens.next();
						break;
				}
				break;

			case 'depthfunc':
				stage.depthFunc = tokens.next().toLowerCase();
				break;

			case 'depthwrite':
				stage.depthWrite = true;
				stage.depthWriteOverride = true;
				break;

			case 'tcmod':
				var tcMod = {
					type: tokens.next().toLowerCase()
				};
				switch(tcMod.type) {
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
				if(tcMod.type) {
					stage.tcMods.push(tcMod);
				}
				break;
			case 'tcgen':
				stage.tcGen = tokens.next();
				break;
			default: break;
		}
	}

	if (stage.blendSrc == 'GL_ONE' && stage.blendDest == 'GL_ZERO') {
		stage.hasBlendFunc = false;
		stage.depthWrite = true;
	}

	return stage;
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


/**
 * TranslateShader
 * 
 * Translate a parsed q3 shader into WebGL ready shaders.
 */
function TranslateShader(q3shader) {
	var shader = new Shader();

	shader.name = q3shader.name;
	shader.sort = q3shader.sort;
	shader.cull = TranslateCull(q3shader.cull);
	shader.blend = q3shader.blend;
	shader.sky = q3shader.sky;

	for (var i = 0; i < q3shader.stages.length; i++) {
		var q3stage = q3shader.stages[i];
		var stage = new ShaderStage();

		stage.texture = q3stage.texture;
		stage.animFreq = q3stage.animFreq;
		stage.animTextures = q3stage.animTextures;
		stage.blendSrc = TranslateBlend(q3stage.blendSrc);
		stage.blendDest = TranslateBlend(q3stage.blendDest);
		stage.depthFunc = TranslateDepthFunc(q3stage.depthFunc);
		stage.depthWrite = q3stage.depthWrite;

		var vs = GenerateVertexShader(q3shader, q3stage);
		var fs = GenerateFragmentShader(q3shader, q3stage);
		// TODO affect these based on ShaderFlag.MESH, maybe GenerateVertexShader should
		// take in a root builder?
		stage.program = CompileShaderProgram(vs.getSource(), fs.getSource());

		shader.stages.push(stage);
	}

	return shader;
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
 * TranslateBlend
 */
function TranslateBlend(blend) {
	if (!blend) { return gl.ONE; }

	switch (blend.toUpperCase()) {
		case 'GL_ONE': return gl.ONE;
		case 'GL_ZERO': return gl.ZERO;
		case 'GL_DST_COLOR': return gl.DST_COLOR;
		case 'GL_ONE_MINUS_DST_COLOR': return gl.ONE_MINUS_DST_COLOR;
		case 'GL_SRC_ALPHA ': return gl.SRC_ALPHA;
		case 'GL_ONE_MINUS_SRC_ALPHA': return gl.ONE_MINUS_SRC_ALPHA;
		case 'GL_SRC_COLOR': return gl.SRC_COLOR;
		case 'GL_ONE_MINUS_SRC_COLOR': return gl.ONE_MINUS_SRC_COLOR;
		default: return gl.ONE;
	}
}

/**
 * GenerateVertexShader
 */
function GenerateVertexShader(q3shader, stage) {
	var builder = new ShaderBuilder();

	builder.addAttribs({
		xyz: 'vec3',
		xyz2: 'vec3',
		norm: 'vec3',
		norm2: 'vec3',
		color: 'vec4'
	});

	builder.addVaryings({
		vTexCoord: 'vec2',
		vColor: 'vec4'
	});

	builder.addUniforms({
		modelViewMat: 'mat4',
		projectionMat: 'mat4',
		backlerp: 'float',
		time: 'float'
	});

	if (stage.isLightmap) {
		builder.addAttribs({ lightCoord: 'vec2' });
	} else {
		builder.addAttribs({ texCoord: 'vec2' });
	}

	builder.addLines([
		'vec3 position = xyz;',
		'vec3 normal = norm;',
		'if (backlerp != 0.0) {',
		'	position = xyz + backlerp * (xyz2 - xyz);',
		'	normal = norm + backlerp * (norm2 - norm);',
		'}'
	]);

	for(var i = 0; i < q3shader.vertexDeforms.length; ++i) {
		var deform = q3shader.vertexDeforms[i];

		switch(deform.type) {
			case 'wave':
				var name = 'deform' + i;
				var offName = 'deformOff' + i;

				builder.addLines([
					'float ' + offName + ' = (xyz.x + xyz.y + xyz.z) * ' + deform.spread.toFixed(4) + ';'
				]);

				var phase = deform.waveform.phase;
				deform.waveform.phase = phase.toFixed(4) + ' + ' + offName;
				builder.addWaveform(name, deform.waveform);
				deform.waveform.phase = phase;

				builder.addLines(['position += normal * ' + name + ';']);
				break;
			default: break;
		}
	}

	builder.addLines(['vec4 worldPosition = modelViewMat * vec4(position, 1.0);']);
	builder.addLines(['vColor = color;']);

	if (stage.tcGen == 'environment') {
		builder.addLines([
			'vec3 viewer = normalize(-worldPosition.xyz);',
			'float d = dot(normal, viewer);',
			'vec3 reflected = normal*2.0*d - viewer;',
			'vTexCoord = vec2(0.5, 0.5) + reflected.xy * 0.5;'
		]);
	} else {
		// Standard texturing
		if (stage.isLightmap) {
			builder.addLines(['vTexCoord = lightCoord;']);
		} else {
			builder.addLines(['vTexCoord = texCoord;']);
		}
	}

	// tcMods
	for (var i = 0; i < stage.tcMods.length; i++) {
		var tcMod = stage.tcMods[i];
		switch(tcMod.type) {
			case 'rotate':
				builder.addLines([
					'float r = ' + tcMod.angle.toFixed(4) + ' * time;',
					'vTexCoord -= vec2(0.5, 0.5);',
					'vTexCoord = vec2(vTexCoord.s * cos(r) - vTexCoord.t * sin(r), vTexCoord.t * cos(r) + vTexCoord.s * sin(r));',
					'vTexCoord += vec2(0.5, 0.5);'
				]);
				break;
			case 'scroll':
				builder.addLines([
					'vTexCoord += vec2(' + tcMod.sSpeed.toFixed(4) + ' * time, ' + tcMod.tSpeed.toFixed(4) + ' * time);'
				]);
				break;
			case 'scale':
				builder.addLines([
					'vTexCoord *= vec2(' + tcMod.scaleX.toFixed(4) + ', ' + tcMod.scaleY.toFixed(4) + ');'
				]);
				break;
			case 'stretch':
				builder.addWaveform('stretchWave', tcMod.waveform);
				builder.addLines([
					'stretchWave = 1.0 / stretchWave;',
					'vTexCoord *= stretchWave;',
					'vTexCoord += vec2(0.5 - (0.5 * stretchWave), 0.5 - (0.5 * stretchWave));'
				]);
				break;
			case 'turb':
				var tName = 'turbTime' + i;
				builder.addLines([
					'float ' + tName + ' = ' + tcMod.turbulance.phase.toFixed(4) + ' + time * ' + tcMod.turbulance.freq.toFixed(4) + ';',
					'vTexCoord.s += sin( ( ( xyz.x + xyz.z )* 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.turbulance.amp.toFixed(4) + ';',
					'vTexCoord.t += sin( ( xyz.y * 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.turbulance.amp.toFixed(4) + ';'
				]);
				break;
			default:
				break;
		}
	}

	switch (stage.alphaGen) {
		case 'lightingspecular':
			builder.addAttribs({ lightCoord: 'vec2' });
			builder.addVaryings({ vLightCoord: 'vec2' });
			builder.addLines([ 'vLightCoord = lightCoord;' ]);
			break;
		default:
			break;
	}

	builder.addLines(['gl_Position = projectionMat * worldPosition;']);

	return builder;
}

/**
 * GenerateFragmentShader
 */
function GenerateFragmentShader(q3shader, stage) {
	var builder = new ShaderBuilder();

	builder.addVaryings({
		vTexCoord: 'vec2',
		vColor: 'vec4'
	});

	builder.addUniforms({
		texture: 'sampler2D',
		time: 'float'
	});

	builder.addLines(['vec4 texColor = texture2D(texture, vTexCoord.st);']);

	switch (stage.rgbGen) {
		case 'vertex':
			builder.addLines(['vec3 rgb = texColor.rgb * vColor.rgb;']);
			break;
		case 'wave':
			builder.addWaveform('rgbWave', stage.rgbWaveform);
			builder.addLines(['vec3 rgb = texColor.rgb * rgbWave;']);
			break;
		default:
			builder.addLines(['vec3 rgb = texColor.rgb;']);
			break;
	}

	switch (stage.alphaGen) {
		case 'wave':
			builder.addWaveform('alpha', stage.alphaWaveform);
			break;
		case 'lightingspecular':
			// For now this is VERY special cased. May not work well with all instances of lightingSpecular
			builder.addUniforms({
				lightmap: 'sampler2D'
			});
			builder.addVaryings({
				vLightCoord: 'vec2',
				vLight: 'float'
			});
			builder.addLines([
				'vec4 light = texture2D(lightmap, vLightCoord.st);',
				'rgb *= light.rgb;',
				'rgb += light.rgb * texColor.a * 0.6;', // This was giving me problems, so I'm ignorning an actual specular calculation for now
				'float alpha = 1.0;'
			]);
			break;
		default:
			builder.addLines(['float alpha = texColor.a;']);
			break;
	}

	if (stage.alphaFunc) {
		switch (stage.alphaFunc) {
			case 'GT0':
				builder.addLines(['if(alpha == 0.0) { discard; }']);
				break;
			case 'LT128':
				builder.addLines(['if(alpha >= 0.5) { discard; }']);
				break;
			case 'GE128':
				builder.addLines(['if(alpha < 0.5) { discard; }']);
				break;
			default:
				break;
		}
	}

	builder.addLines(['gl_FragColor = vec4(rgb, alpha);']);

	return builder;
}


/**
 * ShaderBuilder
 * 
 * Helper class for writing WebGL shaders
 */
var ShaderBuilder = function () {
	this.attrib = {};
	this.varying = {};
	this.uniform = {};
	this.functions = {};
	this.statements = [];
};

ShaderBuilder.prototype.addAttribs = function (attribs) {
	for (var name in attribs) {
		this.attrib[name] = 'attribute ' + attribs[name] + ' ' + name + ';';
	}
};

ShaderBuilder.prototype.addVaryings = function (varyings) {
	for (var name in varyings) {
		this.varying[name] = 'varying ' + varyings[name] + ' ' + name + ';';
	}
};

ShaderBuilder.prototype.addUniforms = function (uniforms) {
	for (var name in uniforms) {
		this.uniform[name] = 'uniform ' + uniforms[name] + ' ' + name + ';';
	}
};

ShaderBuilder.prototype.addFunction = function (name, lines) {
	this.functions[name] = lines.join('\n');
};

ShaderBuilder.prototype.addLines = function (statements) {
	for (var i = 0; i < statements.length; ++i) {
		this.statements.push(statements[i]);
	}
};

ShaderBuilder.prototype.getSource = function () {
	var src = '\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n';

	for (var i in this.attrib) {
		src += this.attrib[i] + '\n';
	}

	for (var i in this.varying) {
		src += this.varying[i] + '\n';
	}

	for (var i in this.uniform) {
		src += this.uniform[i] + '\n';
	}

	for (var i in this.functions) {
		src += this.functions[i] + '\n';
	}

	src += 'void main(void) {\n\t';
	src += this.statements.join('\n\t');
	src += '\n}\n';

	return src;
};

ShaderBuilder.prototype.addWaveform = function(name, wf, timeVar) {
	if (!wf) {
		this.statements.push('float ' + name + ' = 0.0;');
		return;
	}

	if (!timeVar) { timeVar = 'time'; }

	if (typeof(wf.phase) == "number") {
		wf.phase = wf.phase.toFixed(4);
	}

	switch (wf.funcName) {
		case 'sin':
			this.statements.push('float ' + name + ' = ' + wf.base.toFixed(4) + ' + sin((' + wf.phase + ' + ' + timeVar + ' * ' + wf.freq.toFixed(4) + ') * 6.283) * ' + wf.amp.toFixed(4) + ';');
			return;
		case 'square':
			funcName = 'square';
			this.addSquareFunc();
			break;
		case 'triangle':
			funcName = 'triangle';
			this.addTriangleFunc();
			break;
		case 'sawtooth':
			funcName = 'fract';
			break;
		case 'inversesawtooth':
			funcName = '1.0 - fract';
			break;
		default:
			this.statements.push('float ' + name + ' = 0.0;');
			return;
	}

	this.statements.push('float ' + name + ' = ' + wf.base.toFixed(4) + ' + ' + funcName + '(' + wf.phase + ' + ' + timeVar + ' * ' + wf.freq.toFixed(4) + ') * ' + wf.amp.toFixed(4) + ';');
};

ShaderBuilder.prototype.addSquareFunc = function() {
	this.addFunction('square', [
		'float square(float val) {',
		'   return (mod(floor(val*2.0)+1.0, 2.0) * 2.0) - 1.0;',
		'}'
	]);
};

ShaderBuilder.prototype.addTriangleFunc = function() {
	this.addFunction('triangle', [
		'float triangle(float val) {',
		'   return abs(2.0 * fract(val) - 1.0);',
		'}'
	]);
};
/**
 * ShaderTokenizer
 * 
 * Help tokenize q3 shaders.
 */
var ShaderTokenizer = function (src) {
	// Strip out comments
	src = src.replace(/\/\/.*$/mg, ''); // C++ style (//...)
	src = src.replace(/\/\*[^*\/]*\*\//mg, ''); // C style (/*...*/) (Do the shaders even use these?)
	this.tokens = src.match(/[^\s\n\r\"]+/mg);

	this.offset = 0;
};

ShaderTokenizer.prototype.EOF = function() {
	if(this.tokens === null) { return true; }
	var token = this.tokens[this.offset];
	while(token === '' && this.offset < this.tokens.length) {
		this.offset++;
		token = this.tokens[this.offset];
	}
	return this.offset >= this.tokens.length;
};

ShaderTokenizer.prototype.next = function() {
	if(this.tokens === null) { return ; }
	var token = '';
	while(token === '' && this.offset < this.tokens.length) {
		token = this.tokens[this.offset++];
	}
	return token;
};

ShaderTokenizer.prototype.prev = function() {
	if(this.tokens === null) { return ; }
	var token = '';
	while(token === '' && this.offset >= 0) {
		token = this.tokens[this.offset--];
	}
	return token;
};