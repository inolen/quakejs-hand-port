/**
 * InitShaders
 */
function InitShaders(callback) {
	// TODO there are some serious race conditions here, as we don't wait for these to finish loading
	// Thankfully these almost always finish before the map loads.
	InitDefaultShaders();

	ScanAndLoadShaderScripts(function () {
		if (callback) callback();
	});
}

/**
 * InitDefaultShaders
 */
function InitDefaultShaders() {
	BuildDefaultProgram();
	BuildNoLightmapProgram();
	BuildDebugProgram();

	// Register green debug shader.
	shader = re.debugShader = new Shader();
	stage = new ShaderStage();
	shader.name = '<debug>';
	shader.cull = null;
	stage.program = re.programDebug;
	shader.stages.push(stage);
	SortShader(shader);

	// Default shader.
	var shader = re.shaders[0] = new Shader();
	var stage = new ShaderStage();
	shader.name = '<default>';
	stage.program = re.programNoLightmap;
	stage.textures[0] = re.defaultTexture;
	shader.stages.push(stage);
	SortShader(shader);
}

/**
 * BuildDefaultProgram
 */
function BuildDefaultProgram() {
	var vs = '#ifdef GL_ES\n' +
				'precision highp float;\n' +
			'#endif\n' +
			'attribute vec3 xyz;\n' +
			'attribute vec3 normal;\n' +
			'attribute vec2 texCoord;\n' +
			'attribute vec2 lightCoord;\n' +
			'attribute vec4 color;\n' +
			'varying vec3 vXyz;\n' +
			'varying vec2 vTexCoord;\n' +
			'varying vec2 vLightmapCoord;\n' +
			'varying vec4 vColor;\n' +
			'uniform vec3 viewPosition;\n' +
			'uniform mat4 modelViewMat;\n' +
			'uniform mat4 projectionMat;\n' +
			'void main(void) {\n' +
				'vec4 worldPosition = modelViewMat * vec4(xyz, 1.0);\n' +
				'vXyz = xyz;\n' +
				'vColor = color / 255.0;\n' +
				'vTexCoord = texCoord;\n' +
				'vLightmapCoord = lightCoord;\n' +
				'gl_Position = projectionMat * worldPosition;\n' +
			'}';

	var fs = '#ifdef GL_ES\n' +
				'precision highp float;\n' +
			'#endif\n' +
			'varying vec3 vXyz;\n' +
			'varying vec2 vTexCoord;\n' +
			'varying vec2 vLightmapCoord;\n' +
			'uniform sampler2D texture;\n' +
			'uniform sampler2D lightmap;\n' +
			'uniform vec4 dlightPos[32];\n' +
			'uniform vec4 dlightColor[32];\n' +
			'uniform int dlightBits;\n' +
			'vec3 getDlightColor() {\n' +
				'vec3 color = vec3(0.0, 0.0, 0.0);\n' +
				'for (int i = 0; i < 32; i++) {\n' +
					// WHY U NO HAVE BITWISE MASKS
					'if (int(mod(floor(float(dlightBits) / pow(float(2), float(i))), 2.0)) == 0) {\n' +
						'continue;\n' +
					'}\n' +
					'float lightDist = length(dlightPos[i].xyz - vXyz);\n' +
					'color += dlightColor[i].rgb * max(1.0 - (lightDist / dlightColor[i].w), 0.0);\n' +
				'}\n' +
				'return color;\n' +
			'}\n' +
			'void main(void) {\n' +
				'vec4 diffuseColor = texture2D(texture, vTexCoord);\n' +
				'vec4 lightmapColor = texture2D(lightmap, vLightmapCoord);\n' +
				'vec3 dlightColor = getDlightColor();\n' +

				'gl_FragColor = vec4(diffuseColor.rgb * lightmapColor.rgb + dlightColor, diffuseColor.a);\n' +
			'}';

	re.programDefault = CompileShaderProgram(vs, fs);
}

/**
 * BuildNoLightmapProgram
 */
function BuildNoLightmapProgram() {
	var vs = '#ifdef GL_ES\n' +
				'precision highp float;\n' +
			'#endif\n' +
			'attribute vec3 xyz;\n' +
			'attribute vec3 normal;\n' +
			'attribute vec2 texCoord;\n' +
			'attribute vec4 color;\n' +
			'varying vec2 vTexCoord;\n' +
			'varying vec4 vColor;\n' +
			'uniform vec3 viewPosition;\n' +
			'uniform mat4 modelViewMat;\n' +
			'uniform mat4 projectionMat;\n' +
			'void main(void) {\n' +
				'vec4 worldPosition = modelViewMat * vec4(xyz, 1.0);\n' +
				'vColor = color / 255.0;\n' +
				'vTexCoord = texCoord;\n' +
				'gl_Position = projectionMat * worldPosition;\n' +
			'}';

	var fs = '#ifdef GL_ES\n' +
				'precision highp float;\n' +
			'#endif\n' +
			'varying vec2 vTexCoord;\n' +
			'varying vec4 vColor;\n' +
			'uniform sampler2D texture;\n' +
			'void main(void) {\n' +
				'vec4 diffuseColor = texture2D(texture, vTexCoord);\n' +
				'gl_FragColor = vec4(diffuseColor.rgb * vColor.rgb, diffuseColor.a);\n' +
			'}';

	re.programNoLightmap = CompileShaderProgram(vs, fs);
}

/**
 * BuildDebugProgram
 */
function BuildDebugProgram() {
	var vs = '#ifdef GL_ES\n' +
			     'precision highp float;\n' +
			 '#endif\n' +
			 'attribute vec3 xyz;\n' +
			 'uniform mat4 modelViewMat;\n' +
			 'uniform mat4 projectionMat;\n' +
			 'void main(void) {\n' +
			     'vec4 worldPosition = modelViewMat * vec4(xyz, 1.0);\n' +
			     'gl_Position = projectionMat * worldPosition;\n' +
			 '}';

	var fs = '#ifdef GL_ES\n' +
			     'precision highp float;\n' +
			 '#endif\n' +
			 'void main(void) {\n' +
			     'gl_FragColor = vec4 (0.0, 1.0, 0.0, 0.5);\n' +
			 '}';

	re.programDebug = CompileShaderProgram(vs, fs);
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

	// // TODO We should free up these shader bodies, they occupy loads of memory for no reason.
	if (re.shaderBodies[shaderName]) {
		var shaderText = re.shaderBodies[shaderName];
		var q3shader = ParseShader(shaderText, lightmapIndex);

		shader = re.shaders[hShader] = TranslateShader(q3shader);
	}
	// There is no shader for this name, let's create a default.
	else {
		shader = re.shaders[hShader] = CreateDefaultShader(shaderName, lightmapIndex);
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
 * ScanAndLoadShaderScripts
 */
function ScanAndLoadShaderScripts(callback) {
	// Since we can't scan directories, load the special all.shader
	// from the server which will return a concatenated list of shaders.
	sys.ReadFile('scripts/all.shader', 'utf8', function (err, data) {
		LoadShaderScript(data);

		if (callback) {
			callback();
		}
	});
}

/**
 * LoadShaderScript
 */
function LoadShaderScript(data, callback) {
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


/**
 * CreateDefaultShader
 */
function CreateDefaultShader(shaderName, lightmapIndex, callback) {
	var shader = new Shader();
	shader.name = shaderName;

	var stage = shader.stages[0] = new ShaderStage();

	// Load the texture.
	stage.textures[0] = FindTextureByName(shaderName, false);

	// Assign a vertex / fragment shader program.
	if (lightmapIndex < 0) {
		stage.program = re.programNoLightmap;
	} else {
		stage.program = re.programDefault;
	}

	return shader;
}

/**********************************************************
 *
 * Q3 Shader parser
 *
 * TODO All of this code needs to be moved into a build script
 * converting these shaders to JSON / GLSL shaders that we slurp
 * in.
 *
 **********************************************************/

/**
 * TranslateShader
 *
 * Translate a parsed q3 shader into WebGL ready shaders.
 */
function TranslateShader(q3shader, callback) {
	var shader = new Shader();

	shader.name = q3shader.name;
	shader.sort = q3shader.sort;
	shader.surfaceFlags = q3shader.surfaceFlags;
	shader.contentFlags = q3shader.contentFlags;
	shader.cull = TranslateCull(q3shader.cull);
	shader.polygonOffset = q3shader.polygonOffset;
	shader.entityMergable = q3shader.entityMergable;
	shader.sky = q3shader.sky;
	shader.portalRange = q3shader.portalRange;

	for (var i = 0; i < q3shader.stages.length; i++) {
		var q3stage = q3shader.stages[i];
		var stage = new ShaderStage();

		// Convert maps to textures.
		for (var j = 0; j < q3stage.maps.length; j++) {
			stage.textures[j] = FindTextureByName(q3stage.maps[j], q3stage.clamp);
		}

		stage.animFreq = q3stage.animFreq;
		stage.blendSrc = TranslateBlend(q3stage.blendSrc);
		stage.blendDest = TranslateBlend(q3stage.blendDest);
		stage.depthFunc = TranslateDepthFunc(q3stage.depthFunc);
		stage.depthWrite = q3stage.depthWrite;

		var vs = GenerateVertexShader(q3shader, q3stage);
		var fs = GenerateFragmentShader(q3shader, q3stage);
		// stage.vs = vs.getSource();
		// stage.fs = fs.getSource();
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
		case 'GL_SRC_ALPHA': return gl.SRC_ALPHA;
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
		normal: 'vec3'
	});

	builder.addVaryings({
		vTexCoord: 'vec2'
	});

	builder.addUniforms({
		modelViewMat: 'mat4',
		projectionMat: 'mat4',
		viewPosition: 'vec3',
		time: 'float'
	});

	// Sky surfaces don't have vertex colors.
	if (!q3shader.sky) {
		builder.addAttribs({ color: 'vec4' });
		builder.addVaryings({ vColor: 'vec4' });

		// Colors are always passed in as uint8s, scale them.
		builder.addLines(['vColor = color / 255.0;']);
	}

	if (stage.isLightmap) {
		builder.addAttribs({ lightCoord: 'vec2' });
	} else {
		builder.addAttribs({ texCoord: 'vec2' });
	}

	builder.addLines([
		'vec3 position = xyz;'
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

	// Disable far plane clipping for skies.
	if (q3shader.sky) {
		builder.addLines(['vec4 worldPosition = modelViewMat * vec4(position, 0.0);']);
	} else {
		builder.addLines(['vec4 worldPosition = modelViewMat * vec4(position, 1.0);']);
	}

	if (stage.tcGen == 'environment') {
		builder.addLines([
			'vec3 viewer = normalize(viewPosition - position);',
			'float d = dot(normal, viewer);',
			'vec3 reflected = normal*2.0*d - viewer;',
			'vTexCoord = vec2(0.5 + reflected.y * 0.5, 0.5 - reflected.z * 0.5);'
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
		case 'portal':
			builder.addVaryings({ vPortalScale: 'float' });
			builder.addLines(['vPortalScale = length(position - viewPosition) / ' + q3shader.portalRange.toFixed(1) + ';']);
			break;
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
		vTexCoord: 'vec2'
	});

	builder.addUniforms({
		texture: 'sampler2D',
		time: 'float'
	});

	// Sky surfaces don't have vertex colors.
	if (!q3shader.sky) {
		builder.addVaryings({ vColor: 'vec4' });
	}

	builder.addLines(['vec4 texColor = texture2D(texture, vTexCoord.st);']);

	switch (stage.rgbGen) {
		case 'vertex':  // TODO vertex lighting should multiply by the identityLight constant
		case 'exactvertex':
		case 'entity':
		case 'lightingdiffuse':
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
		case 'vertex':
		case 'entity':
			builder.addLines(['float alpha = texColor.a * vColor.a;']);
			break;
		case 'wave':
			builder.addWaveform('alphaWave', stage.alphaWaveform);
			builder.addLines(['float alpha = texColor.a * alphaWave;']);
			break;
		case 'portal':
			builder.addVaryings({ vPortalScale: 'float' });
			builder.addLines(['float alpha = vPortalScale;']);
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
				builder.addLines(['if (alpha == 0.0) { discard; }']);
				break;
			case 'LT128':
				builder.addLines(['if (alpha >= 0.5) { discard; }']);
				break;
			case 'GE128':
				builder.addLines(['if (alpha < 0.5) { discard; }']);
				break;
			default:
				break;
		}
	}

	builder.addLines(['gl_FragColor = vec4(rgb, alpha);']);

	return builder;
}

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
				if (stage.isLightmap && stage.hasBlendFunc) {
					stage.blendSrc = 'GL_DST_COLOR';
					stage.blendDest = 'GL_ZERO';
				}

				// I'm having a ton of trouble getting lightingSpecular to work properly,
				// so this little hack gets it looking right till I can figure out the problem
				if (stage.alphaGen == 'lightingspecular') {
					stage.blendSrc = 'GL_ONE';
					stage.blendDest = 'GL_ZERO';
					stage.hasBlendFunc = false;
					stage.depthWrite = true;
					shader.stages = [];
				}

				shader.stages.push(stage);
			} break;

			case 'sort':
				var sort = tokens.next().toLowerCase();
				switch(sort) {
					case 'portal':     shader.sort = SS.PORTAL;          break;
					case 'sky':        shader.sort = SS.ENVIRONMENT;     break;
					case 'opaque':     shader.sort = SS.OPAQUE;          break;
					case 'decal':      shader.sort = SS.DECAL;           break;
					case 'seeThrough': shader.sort = SS.SEE_THROUGH;     break;
					case 'banner':     shader.sort = SS.BANNER;          break;
					case 'additive':   shader.sort = SS.BLEND1;          break;
					case 'nearest':    shader.sort = SS.NEAREST;         break;
					case 'underwater': shader.sort = SS.UNDERWATER;      break;
					default:           shader.sort = parseInt(sort, 10); break;
				}
				break;

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

			case 'surfaceparm':
				ParseSurfaceParm(shader, tokens.next().toLowerCase());
				continue;

			case 'polygonoffset':
				shader.polygonOffset = true;
				break;

			// entityMergable, allowing sprite surfaces from multiple entities
			// to be merged into one batch.  This is a savings for smoke
			// puffs and blood, but can't be used for anything where the
			// shader calcs (not the surface function) reference the entity color or scroll
			case 'entitymergable':
				shader.entityMergable = true;
				break;

			case 'portal':
				shader.sort = SS.PORTAL;
				continue;

			// TODO Merge all surfaceparms into shader.surfaceFlagsand shader.contentFlags.
			case 'surfaceparm':
				var param = tokens.next().toLowerCase();
				break;

			// TODO Parse cloud size.
			case 'skyparms':
				shader.sky = true;
				break;

			default: break;
		}
	}

	//
	// Set sky stuff appropriate.
	//
	if (shader.sky) {
		shader.sort = SS.ENVIRONMENT;
	}

	//
	// If the shader is using polygon offset,
	// it's a decal shader.
	//
	if (shader.polygonOffset && !shader.sort) {
		shader.sort = SS.DECAL;
	}

	for (var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];

		//
		// Determine sort order and fog color adjustment
		//
		if (shader.stages[0].hasBlendFunc && stage.hasBlendFunc) {
			// Don't screw with sort order if this is a portal or environment.
			if (!shader.sort) {
				// See through item, like a grill or grate.
				if (stage.depthWrite) {
					shader.sort = SS.SEE_THROUGH;
				} else {
					shader.sort = SS.BLEND0;
				}
			}
		}
	}

	// There are times when you will need to manually apply a sort to
	// opaque alpha tested shaders that have later blend passes.
	if (!shader.sort) {
		shader.sort = SS.OPAQUE;
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
				var map = tokens.next();
				if (!map) {
					com.Error(ERR.DROP, 'WARNING: missing parameter for \'map\' keyword in shader \'' + shader.name + '\'');
				}
				if (map === '$whiteimage') {
					map = '*white';
				} else if (map == '$lightmap') {
					stage.isLightmap = true;
					if (shader.lightmapIndex < 0) {
						map = '*white';
					} else {
						map = '*lightmap';
					}
				}
				stage.maps.push(map);
				break;

			case 'animmap':
				stage.animFrame = 0;
				stage.animFreq = parseFloat(tokens.next());
				var nextMap = tokens.next();
				while (nextMap.match(/\.[^\/.]+$/)) {
					var map = nextMap;
					stage.maps.push(map);
					nextMap = tokens.next();
				}
				tokens.prev();
				break;

			case 'rgbgen':
				stage.rgbGen = tokens.next().toLowerCase();
				switch (stage.rgbGen) {
					case 'wave':
						stage.rgbWaveform = ParseWaveform(tokens);
						if(!stage.rgbWaveform) { stage.rgbGen = 'identity'; }
						break;
				}
				break;

			case 'alphagen':
				stage.alphaGen = tokens.next().toLowerCase();
				switch (stage.alphaGen) {
					case 'wave':
						stage.alphaWaveform = ParseWaveform(tokens);
						if(!stage.alphaWaveform) { stage.alphaGen = '1.0'; }
						break;
					case 'portal':
						shader.portalRange = parseFloat(tokens.next().toLowerCase());
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
				if (!stage.depthWriteOverride) {
					stage.depthWrite = false;
				}
				switch (stage.blendSrc) {
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
 * ParseSurfaceParm
 */
// This table is also present in q3map.
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

function ParseSurfaceParm(shader, name) {
	var parm = surfaceParms[name];

	if (!parm) {
		return;
	}

	shader.surfaceFlags |= parm.surface;
	shader.contentFlags |= parm.contents;
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

	var funcName;

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