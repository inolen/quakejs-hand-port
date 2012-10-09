// TODO We really need to clean up these q3shader/glshader differences.
function InitShaders() {
	ScanAndLoadShaderFiles();
}

function FindShader(shaderName, lightmapIndex) {
	var shader;

	if ((shader = re.compiledShaders[shaderName])) {
		return shader;
	}

	if (!(shader = re.parsedShaders[shaderName])) {
		// There is no shader for this name, let's create a default
		// diffuse shader and assume the name references a texture.
		var shader = new Q3Shader();
		var stage = new Q3ShaderStage();
		var map = shaderName !== '*default' ? shaderName + '.png' : shaderName;
		shader.name = map;
		shader.opaque = true;
		stage.map = map;
		shader.stages.push(stage);

		re.parsedShaders[shaderName] = shader;
	}

	// Go ahead and load the texture maps for this shader.
	// TODO We load shader textures here because we don't want to load images
	// for every shader when it's parsed (as we parse a lot of unused shaders).
	// If we made LoadShaderFile cache of key/value pairs of shader names
	// and their text, and delay parsing until in here, we can remove this
	// and reinstate it as part of ParseShader().
	LoadTexturesForShader(shader);

	shader.glshader = CompileShader(shader, lightmapIndex);

	// Add the shader to the sorted cache.
	SortShader(shader);

	return (re.compiledShaders[shaderName] = shader);
}

function LoadTexturesForShader(shader) {
	for(var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];

		LoadTexturesForShaderStage(shader, stage);
	}
}

function LoadTexturesForShaderStage(shader, stage) {
	if (stage.animFreq) {
		stage.animTextures = _.map(stage.animMaps, function (map) {
			return FindImage(map, stage.clamp);
		});
	} else {
		if (!stage.map) {
			stage.texture = FindImage('*white');
		} else if (stage.map == '$lightmap') {
			if (shader.lightmap < 0) {
				stage.texture = FindImage('*white');
			} else {
				stage.texture = FindImage('*lightmap');
			}
		} else if (stage.map == '$whiteimage') {
			stage.texture = FindImage('*white');
		} else {
			stage.texture = FindImage(stage.map, stage.clamp);
		}
	}
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
	var request = new XMLHttpRequest();

	request.onreadystatechange = function () {
		if (request.readyState !== 4 || request.status !== 200) {
			return;
		}
		
		var tokens = new ShaderTokenizer(request.responseText);

		var shader;
		while ((shader = ParseShader(tokens))) {
			re.parsedShaders[shader.name] = shader;
		};
	};

	request.open('GET', url, true);
	request.setRequestHeader('Content-Type', 'text/plain');
	request.send(null);
}

/**
 * Shader parser
 */
var Q3Shader = function () {
	this.name          = null;
	this.cull          = 'front';
	this.sky           = false;
	this.blend         = false;
	this.opaque        = false;
	this.sort          = 0;
	this.stages        = [];
	this.vertexDeforms = [];
};

var Q3ShaderStage = function (map) {
	this.map           = null;
	this.clamp         = false;
	this.tcGen         = 'base';
	this.rgbGen        = 'identity';
	this.rgbWaveform   = null;
	this.alphaGen      = '1.0';
	this.alphaFunc     = null;
	this.alphaWaveform = null;
	this.blendSrc      = 'GL_ONE';
	this.blendDest     = 'GL_ZERO';
	this.hasBlendFunc  = false;
	this.tcMods        = [];
	this.animMaps      = [];
	this.animFreq      = 0;
	this.depthFunc     = 'lequal';
	this.depthWrite    = true;
	this.isLightmap    = false;
};

function ParseWaveform(tokens) {
	return {
		funcName: tokens.next().toLowerCase(),
		base: parseFloat(tokens.next()),
		amp: parseFloat(tokens.next()),
		phase: parseFloat(tokens.next()),
		freq: parseFloat(tokens.next())
	};
}

function ParseStage(tokens) {
	var stage = new Q3ShaderStage();

	// Parse a shader
	while (!tokens.EOF()) {
		var token = tokens.next();
		if(token == '}') { break; }

		switch(token.toLowerCase()) {
			case 'clampmap':
				stage.clamp = true;
			case 'map':
				stage.map = tokens.next().replace(/(\.jpg|\.tga)/, '.png');
				/*if (!stage.map) {
					stage.texture = findImage('*white');
				} else if (stage.map == '$lightmap') {
					if (shader.lightmap < 0) {
						stage.texture = findImage('*white');
					} else {
						stage.texture = findImage('*lightmap');
					}
				} else if (stage.map == '$whiteimage') {
					stage.texture = findImage('*white');
				} else {
					stage.texture = findImage(stage.map, stage.clamp);
				}*/
				break;

			case 'animmap':
				stage.animFrame = 0;
				stage.animFreq = parseFloat(tokens.next());
				var nextMap = tokens.next();
				while (nextMap.match(/(\.jpg|\.tga)/)) {
					var map = nextMap.replace(/(\.jpg|\.tga)/, '.png');
					stage.animMaps.push(map);
					//stage.animTexture.push(findImage(map, stage.clamp));
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

	if(stage.blendSrc == 'GL_ONE' && stage.blendDest == 'GL_ZERO') {
		stage.hasBlendFunc = false;
		stage.depthWrite = true;
	}

	stage.isLightmap = stage.map == '$lightmap';

	return stage;
}

function ParseShader(tokens) {
	var shader = new Q3Shader();
	shader.name = tokens.next();

	// Sanity check.
	if (tokens.next() !== '{') return null;

	while (!tokens.EOF()) {
		var token = tokens.next().toLowerCase();

		if (token == '}') break;

		switch (token) {
			case '{': {
				var stage = ParseStage(tokens);

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
		if (pStage->stateBits & GLS_DEPTHMASK_TRUE ) {
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
 * Shader Tokenizer
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