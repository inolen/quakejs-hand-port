var defaultVertexShaderSrc = '\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n\
	attribute vec3 position; \n\
	attribute vec3 normal; \n\
	attribute vec2 texCoord; \n\
	attribute vec2 lightCoord; \n\
	attribute vec4 color; \n\
\n\
	varying vec2 vTexCoord; \n\
	varying vec2 vLightmapCoord; \n\
	varying vec4 vColor; \n\
\n\
	uniform mat4 modelViewMat; \n\
	uniform mat4 projectionMat; \n\
\n\
	void main(void) { \n\
		vec4 worldPosition = modelViewMat * vec4(position, 1.0); \n\
		vTexCoord = texCoord; \n\
		vColor = color; \n\
		vLightmapCoord = lightCoord; \n\
		gl_Position = projectionMat * worldPosition; \n\
	} \n\
';

var defaultFragmentShaderSrc = '\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n\
	varying vec2 vTexCoord; \n\
	varying vec2 vLightmapCoord; \n\
	uniform sampler2D texture; \n\
	uniform sampler2D lightmap; \n\
\n\
	void main(void) { \n\
		vec4 diffuseColor = texture2D(texture, vTexCoord); \n\
		vec4 lightColor = texture2D(lightmap, vLightmapCoord); \n\
		gl_FragColor = vec4(diffuseColor.rgb * lightColor.rgb, diffuseColor.a); \n\
	} \n\
';

var modelFragmnetShaderSrc = '\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n\
	varying vec2 vTexCoord; \n\
	varying vec4 vColor; \n\
	uniform sampler2D texture; \n\
\n\
	void main(void) { \n\
		vec4 diffuseColor = texture2D(texture, vTexCoord); \n\
		gl_FragColor = vec4(diffuseColor.rgb * vColor.rgb, diffuseColor.a); \n\
	} \n\
';

/**
 * WebGL Shader builder utility
 */
var ShaderBuilder = function() {
	this.attrib = {};
	this.varying = {};
	this.uniform = {};
	this.functions = {};
	this.statements = [];
};

ShaderBuilder.prototype.addAttribs = function(attribs) {
	for (var name in attribs) {
		this.attrib[name] = 'attribute ' + attribs[name] + ' ' + name + ';'
	}
};

ShaderBuilder.prototype.addVaryings = function(varyings) {
	for (var name in varyings) {
		this.varying[name] = 'varying ' + varyings[name] + ' ' + name + ';'
	}
};

ShaderBuilder.prototype.addUniforms = function(uniforms) {
	for (var name in uniforms) {
		this.uniform[name] = 'uniform ' + uniforms[name] + ' ' + name + ';'
	}
};

ShaderBuilder.prototype.addFunction = function(name, lines) {
	this.functions[name] = lines.join('\n');
};

ShaderBuilder.prototype.addLines = function(statements) {
	for (var i = 0; i < statements.length; ++i) {
		this.statements.push(statements[i]);
	}
};

ShaderBuilder.prototype.getSource = function() {
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

/**
 * WebGL Shader program compilation.
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

				shader.addLines([
					'defPosition += normal * ' + name + ';'
				]);
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
		if(stage.isLightmap) {
			shader.addLines(['vTexCoord = lightCoord;']);
		} else {
			shader.addLines(['vTexCoord = texCoord;']);
		}
	}

	// tcMods
	for(var i = 0; i < stage.tcMods.length; ++i) {
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
		default: break;
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

	switch(stage.rgbGen) {
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

	switch(stage.alphaGen) {
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

	if(stage.alphaFunc) {
		switch(stage.alphaFunc) {
		case 'GT0':
			shader.addLines([
			'if(alpha == 0.0) { discard; }'
			]);
			break;
		case 'LT128':
			shader.addLines([
			'if(alpha >= 0.5) { discard; }'
			]);
			break;
		case 'GE128':
			shader.addLines([
			'if(alpha < 0.5) { discard; }'
			]);
			break;
		default:
			break;
		}
	}

	shader.addLines(['gl_FragColor = vec4(rgb, alpha);']);

	return shader.getSource();
}

/**
 * Helper translation functions.
 */
function TranslateDepthFunc(depth) {
	if(!depth) { return gl.LEQUAL; }

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

	cull = cull.toLowerCase();

	if (cull == 'none' || cull == 'twosided' || cull == 'disable') {
		return null;
	} else if (cull == 'back' || cull == 'backside' || cull == 'backsided') {
		return gl.BACK;
	}
}

function TranslateBlend(blend) {
	if(!blend) { return gl.ONE; }

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

var GLShader = function () {
	this.name   = null;
	this.cull   = gl.FRONT;
	this.blend  = false;
	this.stages = [];
};

var defaultProgram = null;
var modelProgram = null;

function CompileShader(shader, lightmapIndex) {
	if (!defaultProgram) defaultProgram = CompileShaderProgram(defaultVertexShaderSrc, defaultFragmentShaderSrc);
	if (!modelProgram) modelProgram = CompileShaderProgram(defaultVertexShaderSrc, modelFragmnetShaderSrc);

	var glshader = new GLShader();

	glshader.name = shader.name;
	glshader.cull = TranslateCull(shader.cull);
	glshader.sort = shader.sort;
	glshader.blend = shader.blend;
	glshader.sky = shader.sky;
	glshader.lightmap = shader.lightmap;

	for (var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];

		var glstage = _.clone(stage);
		glstage.blendSrc = TranslateBlend(stage.blendSrc);
		glstage.blendDest = TranslateBlend(stage.blendDest);
		glstage.depthFunc = TranslateDepthFunc(stage.depthFunc);

		// Optimize and use default programs when we can.
		// TODO We should move the default shaders over to re-shader instead of this hack.
		if (shader.stages.length === 1 && shader.opaque === true) {
			glstage.program = lightmapIndex === LightmapType.VERTEX ? modelProgram : defaultProgram;
		} else {
			var vertexSrc = GenerateVertexShader(shader, stage);
			var fragmentSrc = GenerateFragmentShader(shader, stage);
			glstage.program = CompileShaderProgram(vertexSrc, fragmentSrc);
		}

		glshader.stages.push(glstage);
	}

	return glshader;
}

function SetShader(glshader) {
	if (!glshader) {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
	} else if (glshader.cull && !glshader.sky) {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(glshader.cull);
	} else {
		gl.disable(gl.CULL_FACE);
	}

	return true;
}

function SetShaderStage(glshader, stage, time) {
	gl.blendFunc(stage.blendSrc, stage.blendDest);

	if (stage.depthWrite && !glshader.sky) {
		gl.depthMask(true);
	} else {
		gl.depthMask(false);
	}

	gl.depthFunc(stage.depthFunc);
	gl.useProgram(stage.program);

	var texture;
	if (stage.animFreq) {
		var animFrame = Math.floor(time * stage.animFreq) % stage.animMaps.length;
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