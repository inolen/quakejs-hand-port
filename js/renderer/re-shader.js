var shaderTexts = {};

var defaultProgram = null;
var modelProgram = null;

function InitShaders() {
	ScanAndLoadShaderFiles();

	defaultProgram = CompileShaderProgram(defaultVertexShaderSrc, defaultFragmentShaderSrc);
	modelProgram = CompileShaderProgram(defaultVertexShaderSrc, modelFragmnetShaderSrc);
}

function FindShader(shaderName, lightmapIndex) {
	var shader;

	if ((shader = re.compiledShaders[shaderName])) {
		return shader;
	}

	if (shaderTexts[shaderName]) {
		var shaderText = shaderTexts[shaderName];
		var q3shader = ParseShader(shaderText, lightmapIndex);
		shader = TranslateShader(q3shader);
	} else {
		// There is no shader for this name, let's create a default.
		shader = new Shader();
		shader.name = shaderName !== '*default' ? shaderName + '.png' : shaderName;

		var stage = new ShaderStage();
		stage.texture = FindImage(shader.name);
		stage.program = lightmapIndex === LightmapType.VERTEX ? modelProgram : defaultProgram;
		shader.stages.push(stage);
	}

	// Add the shader to the sorted cache.
	SortShader(shader);

	return (re.compiledShaders[shaderName] = shader);
}

function RegisterShader(shaderName, shader) {

}

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

function ScanAndLoadShaderFiles() {
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

	for (var i = 0; i < allShaders.length; ++i) {
		var path = Q3W_BASE_FOLDER + '/' + allShaders[i];
		LoadShaderFile(path);
	}
}

function LoadShaderFile(url, onload) {
	cl.ReadFile(url, 'utf8', function (data) {
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

			shaderTexts[shaderName] = shaderText;
		}
	});
}

/**
 * Compilex vertex and fragment source into a WebGL
 * shader program, and properties to returned object
 * to easily modify shader parameters.
 */
function CompileShaderProgram(vertexSrc, fragmentSrc) {
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, fragmentSrc);
	gl.compileShader(fragmentShader);

	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		gl.deleteShader(fragmentShader);
		return null;
	}

	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexSrc);
	gl.compileShader(vertexShader);

	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		gl.deleteShader(vertexShader);
		return null;
	}

	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
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

function SetShader(shader) {
	if (!shader) {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
	} else if (shader.cull) {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(shader.cull);
	} else {
		gl.disable(gl.CULL_FACE);
	}

	return true;
}

function SetShaderStage(shader, stage, time) {
	gl.blendFunc(stage.blendSrc, stage.blendDest);

	if (stage.depthWrite) {
		gl.depthMask(true);
	} else {
		gl.depthMask(false);
	}

	gl.depthFunc(stage.depthFunc);
	gl.useProgram(stage.program);

	var texture;
	if (stage.animFreq) {
		var animFrame = Math.floor(time * stage.animFreq) % stage.animTextures.length;
		texture = stage.animTextures[animFrame];
	} else {
		texture = stage.texture;
	}

	gl.activeTexture(gl.TEXTURE0);
	gl.uniform1i(stage.program.uniform.texture, 0);
	gl.bindTexture(gl.TEXTURE_2D, texture.texnum);

	if (stage.program.uniform.lightmap) {
		var lightmap = FindImage('*lightmap');
		gl.activeTexture(gl.TEXTURE1);
		gl.uniform1i(stage.program.uniform.lightmap, 1);;
		gl.bindTexture(gl.TEXTURE_2D, lightmap.texnum);
	}

	if (stage.program.uniform.time) {
		gl.uniform1f(stage.program.uniform.time, time);
	}
}

/**********************************************************
 * Q3 Shader parser
 **********************************************************/
function ParseShader(shaderText, lightmapIndex) {
	var tokens = new ShaderTokenizer(shaderText);
	var shader = new Q3Shader();
	shader.name = tokens.next();
	shader.lightmapIndex = lightmapIndex;

	var debug = shader.name === 'models/mapobjects/spotlamp/beam';

	// Sanity check.
	if (tokens.next() !== '{') return null;

	while (!tokens.EOF()) {
		var token = tokens.next().toLowerCase();

		if (token == '}') break;

		switch (token) {
			case '{': {
				var stage = ParseQ3ShaderStage(shader, tokens);

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
					default:           shader.sort = parseInt(sort);    break;
				};
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

function ParseQ3ShaderStage(shader, tokens) {
	var stage = new Q3ShaderStage();

	// Parse a shader
	while (!tokens.EOF()) {
		var token = tokens.next();
		if (token == '}') {
			break;
		}

		switch(token.toLowerCase()) {
			case 'clampmap':
				stage.clamp = true;
			case 'map':
				stage.map = tokens.next().replace(/(\.jpg|\.tga)/, '.png');
				if (!stage.map) {
					throw new Error('WARNING: missing parameter for \'map\' keyword in shader \'' + shader.name + '\'');
				}
				if (stage.map === '$whiteimage') {
					stage.texture = FindImage('*white');
				} else if (stage.map == '$lightmap') {
					stage.isLightmap = true;

					if ( shader.lightmapIndex < 0) {
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
				while (nextMap.match(/(\.jpg|\.tga)/)) {
					var map = nextMap.replace(/(\.jpg|\.tga)/, '.png');
					stage.animMaps.push(map);
					stage.animTextures.push(FindImage(map, stage.clamp));
					nextMap = tokens.next();
				}
				tokens.prev();
				break;

			case 'rgbgen':
				stage.rgbGen = tokens.next().toLowerCase();;
				switch(stage.rgbGen) {
					case 'wave':
						stage.rgbWaveform = ParseWaveform(tokens);
						if(!stage.rgbWaveform) { stage.rgbGen == 'identity'; }
						break;
				};
				break;

			case 'alphagen':
				stage.alphaGen = tokens.next().toLowerCase();
				switch(stage.alphaGen) {
					case 'wave':
						stage.alphaWaveform = ParseWaveform(tokens);
						if(!stage.alphaWaveform) { stage.alphaGen == '1.0'; }
						break;
					default: break;
				};
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
				}
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
						if(!tcMod.waveform) { tcMod.type == null; }
						break;
					case 'turb':
						tcMod.turbulance = {
							base: parseFloat(tokens.next()),
							amp: parseFloat(tokens.next()),
							phase: parseFloat(tokens.next()),
							freq: parseFloat(tokens.next())
						};
						break;
					default: tcMod.type == null; break;
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

function ParseWaveform(tokens) {
	return {
		funcName: tokens.next().toLowerCase(),
		base: parseFloat(tokens.next()),
		amp: parseFloat(tokens.next()),
		phase: parseFloat(tokens.next()),
		freq: parseFloat(tokens.next())
	};
}

/**********************************************************
 * Translate the shaders into WebGL ready shaders.
 **********************************************************/
function TranslateShader(q3shader) {
	var shader = new Shader();

	shader.name = q3shader.name;
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

		var vertexSrc = GenerateVertexShader(q3shader, q3stage);
		var fragmentSrc = GenerateFragmentShader(q3shader, q3stage);
		stage.program = CompileShaderProgram(vertexSrc, fragmentSrc);

		shader.stages.push(stage);
	}

	return shader;
}

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

function TranslateCull(cull) {
	if (!cull) { return gl.FRONT; }

	switch (cull.toLowerCase()) {
		case 'none':
		case 'twosided':
		case 'disable':
			return null;
		case 'back':
		case 'backside':
		case 'backsided':
			return gl.BACK
	}
}

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

function GenerateVertexShader(stageShader, stage) {
	var shader = new ShaderBuilder();

	shader.addAttribs({
		position: 'vec3',
		normal: 'vec3',
		color: 'vec4',
	});

	shader.addVaryings({
		vTexCoord: 'vec2',
		vColor: 'vec4',
	});

	shader.addUniforms({
		modelViewMat: 'mat4',
		projectionMat: 'mat4',
		time: 'float',
	});

	if (stage.isLightmap) {
		shader.addAttribs({ lightCoord: 'vec2' });
	} else {
		shader.addAttribs({ texCoord: 'vec2' });
	}

	shader.addLines(['vec3 defPosition = position;']);

	for(var i = 0; i < stageShader.vertexDeforms.length; ++i) {
		var deform = stageShader.vertexDeforms[i];

		switch(deform.type) {
			case 'wave':
				var name = 'deform' + i;
				var offName = 'deformOff' + i;

				shader.addLines([
					'float ' + offName + ' = (position.x + position.y + position.z) * ' + deform.spread.toFixed(4) + ';'
				]);

				var phase = deform.waveform.phase;
				deform.waveform.phase = phase.toFixed(4) + ' + ' + offName;
				shader.addWaveform(name, deform.waveform);
				deform.waveform.phase = phase;

				shader.addLines(['defPosition += normal * ' + name + ';']);
				break;
			default: break;
		}
	}

	shader.addLines(['vec4 worldPosition = modelViewMat * vec4(defPosition, 1.0);']);
	shader.addLines(['vColor = color;']);

	if (stage.tcGen == 'environment') {
		shader.addLines([
			'vec3 viewer = normalize(-worldPosition.xyz);',
			'float d = dot(normal, viewer);',
			'vec3 reflected = normal*2.0*d - viewer;',
			'vTexCoord = vec2(0.5, 0.5) + reflected.xy * 0.5;'
		]);
	} else {
		// Standard texturing
		if (stage.isLightmap) {
			shader.addLines(['vTexCoord = lightCoord;']);
		} else {
			shader.addLines(['vTexCoord = texCoord;']);
		}
	}

	// tcMods
	for (var i = 0; i < stage.tcMods.length; i++) {
		var tcMod = stage.tcMods[i];
		switch(tcMod.type) {
			case 'rotate':
				shader.addLines([
					'float r = ' + tcMod.angle.toFixed(4) + ' * time;',
					'vTexCoord -= vec2(0.5, 0.5);',
					'vTexCoord = vec2(vTexCoord.s * cos(r) - vTexCoord.t * sin(r), vTexCoord.t * cos(r) + vTexCoord.s * sin(r));',
					'vTexCoord += vec2(0.5, 0.5);',
				]);
				break;
			case 'scroll':
				shader.addLines([
					'vTexCoord += vec2(' + tcMod.sSpeed.toFixed(4) + ' * time, ' + tcMod.tSpeed.toFixed(4) + ' * time);'
				]);
				break;
			case 'scale':
				shader.addLines([
					'vTexCoord *= vec2(' + tcMod.scaleX.toFixed(4) + ', ' + tcMod.scaleY.toFixed(4) + ');'
				]);
				break;
			case 'stretch':
				shader.addWaveform('stretchWave', tcMod.waveform);
				shader.addLines([
					'stretchWave = 1.0 / stretchWave;',
					'vTexCoord *= stretchWave;',
					'vTexCoord += vec2(0.5 - (0.5 * stretchWave), 0.5 - (0.5 * stretchWave));',
				]);
				break;
			case 'turb':
				var tName = 'turbTime' + i;
				shader.addLines([
					'float ' + tName + ' = ' + tcMod.turbulance.phase.toFixed(4) + ' + time * ' + tcMod.turbulance.freq.toFixed(4) + ';',
					'vTexCoord.s += sin( ( ( position.x + position.z )* 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.turbulance.amp.toFixed(4) + ';',
					'vTexCoord.t += sin( ( position.y * 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.turbulance.amp.toFixed(4) + ';'
				]);
				break;
			default:
				break;
		}
	}

	switch(stage.alphaGen) {
		case 'lightingspecular':
			shader.addAttribs({ lightCoord: 'vec2' });
			shader.addVaryings({ vLightCoord: 'vec2' });
			shader.addLines([ 'vLightCoord = lightCoord;' ]);
			break;
		default:
			break;
	}

	shader.addLines(['gl_Position = projectionMat * worldPosition;']);

	return shader.getSource();
}

function GenerateFragmentShader(stageShader, stage) {
	var shader = new ShaderBuilder();

	shader.addVaryings({
		vTexCoord: 'vec2',
		vColor: 'vec4',
	});

	shader.addUniforms({
		texture: 'sampler2D',
		time: 'float',
	});

	shader.addLines(['vec4 texColor = texture2D(texture, vTexCoord.st);']);

	switch (stage.rgbGen) {
		case 'vertex':
			shader.addLines(['vec3 rgb = texColor.rgb * vColor.rgb;']);
			break;
		case 'wave':
			shader.addWaveform('rgbWave', stage.rgbWaveform);
			shader.addLines(['vec3 rgb = texColor.rgb * rgbWave;']);
			break;
		default:
			shader.addLines(['vec3 rgb = texColor.rgb;']);
			break;
	}

	switch (stage.alphaGen) {
		case 'wave':
			shader.addWaveform('alpha', stage.alphaWaveform);
			break;
		case 'lightingspecular':
			// For now this is VERY special cased. May not work well with all instances of lightingSpecular
			shader.addUniforms({
				lightmap: 'sampler2D'
			});
			shader.addVaryings({
				vLightCoord: 'vec2',
				vLight: 'float'
			});
			shader.addLines([
				'vec4 light = texture2D(lightmap, vLightCoord.st);',
				'rgb *= light.rgb;',
				'rgb += light.rgb * texColor.a * 0.6;', // This was giving me problems, so I'm ignorning an actual specular calculation for now
				'float alpha = 1.0;'
			]);
			break;
		default:
			shader.addLines(['float alpha = texColor.a;']);
			break;
	}

	if (stage.alphaFunc) {
		switch (stage.alphaFunc) {
			case 'GT0':
				shader.addLines(['if(alpha == 0.0) { discard; }']);
				break;
			case 'LT128':
				shader.addLines(['if(alpha >= 0.5) { discard; }']);
				break;
			case 'GE128':
				shader.addLines(['if(alpha < 0.5) { discard; }']);
				break;
			default:
				break;
		}
	}

	shader.addLines(['gl_FragColor = vec4(rgb, alpha);']);

	return shader.getSource();
}

/**********************************************************
 * Helper class for writing WebGL shaders
 **********************************************************/
var ShaderBuilder = function () {
	this.attrib = {};
	this.varying = {};
	this.uniform = {};
	this.functions = {};
	this.statements = [];
};

ShaderBuilder.prototype.addAttribs = function (attribs) {
	for (var name in attribs) {
		this.attrib[name] = 'attribute ' + attribs[name] + ' ' + name + ';'
	}
};

ShaderBuilder.prototype.addVaryings = function (varyings) {
	for (var name in varyings) {
		this.varying[name] = 'varying ' + varyings[name] + ' ' + name + ';'
	}
};

ShaderBuilder.prototype.addUniforms = function (uniforms) {
	for (var name in uniforms) {
		this.uniform[name] = 'uniform ' + uniforms[name] + ' ' + name + ';'
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
		wf.phase = wf.phase.toFixed(4)
	}

	switch (wf.funcName) {
		case 'sin':
		this.statements.push('float ' + name + ' = ' + wf.base.toFixed(4) + ' + sin((' + wf.phase + ' + ' + timeVar + ' * ' + wf.freq.toFixed(4) + ') * 6.283) * ' + wf.amp.toFixed(4) + ';');
		return;
		case 'square': funcName = 'square'; this.addSquareFunc(); break;
		case 'triangle': funcName = 'triangle'; this.addTriangleFunc(); break;
		case 'sawtooth': funcName = 'fract'; break;
		case 'inversesawtooth': funcName = '1.0 - fract'; break;
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
		'}',
	]);
};

ShaderBuilder.prototype.addTriangleFunc = function() {
	this.addFunction('triangle', [
		'float triangle(float val) {',
		'   return abs(2.0 * fract(val) - 1.0);',
		'}',
	]);
};

/**********************************************************
 * Tokenize q3 shaders
 **********************************************************/
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