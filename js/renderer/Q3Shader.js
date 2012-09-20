define('renderer/Q3Shader', [], function () {
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

	/**
	 * Shader Parser Helpers
	 */
	var Q3Shader = {
		name: null,
		cull: 'back',
		sky: false,
		blend: false,
		opaque: false,
		sort: 0,
		stages: null,
		vertexDeforms: null
	};

	var ShaderParser = function (buffer, options) {
		options = options || {};

		this.tokens = new ShaderTokenizer(buffer);
		this.findImage = options.findImage;

		if (!this.findImage) {
			throw new Exception('Must provide a callback for findImage');
		}
	};

	ShaderParser.prototype._parseWaveform = function () {
		var tokens = this.tokens;

		return {
			funcName: tokens.next().toLowerCase(),
			base: parseFloat(tokens.next()),
			amp: parseFloat(tokens.next()),
			phase: parseFloat(tokens.next()),
			freq: parseFloat(tokens.next())
		};
	}

	ShaderParser.prototype._parseStage = function(shader) {
		var tokens = this.tokens;
		var findImage = this.findImage;

		var stage = {
			map: null,
			clamp: false,
			tcGen: 'base',
			rgbGen: 'identity',
			rgbWaveform: null,
			alphaGen: '1.0',
			alphaFunc: null,
			alphaWaveform: null,
			blendSrc: 'GL_ONE',
			blendDest: 'GL_ZERO',
			hasBlendFunc: false,
			tcMods: [],
			animMaps: [],
			animFreq: 0,
			depthFunc: 'lequal',
			depthWrite: true
		};

		// Parse a shader
		while (!tokens.EOF()) {
			var token = tokens.next();
			if(token == '}') { break; }

			switch(token.toLowerCase()) {
				case 'clampmap':
					stage.clamp = true;
				case 'map':
					stage.map = tokens.next().replace(/(\.jpg|\.tga)/, '.png');
					if (!stage.map) {
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
					}
					break;

				case 'animmap':
					stage.animFrame = 0;
					stage.animTexture = [];
					stage.animFreq = parseFloat(tokens.next());
					var nextMap = tokens.next();
					while (nextMap.match(/(\.jpg|\.tga)/)) {
						var map = nextMap.replace(/(\.jpg|\.tga)/, '.png');
						stage.animMaps.push(map);
						stage.animTexture.push(findImage(map, stage.clamp));
						nextMap = tokens.next();
					}
					tokens.prev();
					break;

				case 'rgbgen':
					stage.rgbGen = tokens.next().toLowerCase();;
					switch(stage.rgbGen) {
						case 'wave':
							stage.rgbWaveform = this._parseWaveform();
							if(!stage.rgbWaveform) { stage.rgbGen == 'identity'; }
							break;
					};
					break;

				case 'alphagen':
					stage.alphaGen = tokens.next().toLowerCase();
					switch(stage.alphaGen) {
						case 'wave':
							stage.alphaWaveform = this._parseWaveform();
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
							tcMod.waveform = this._parseWaveform();
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

		stage.isLightmap = stage.map == '$lightmap'

		return stage;
	}

	ShaderParser.prototype._parseShader = function () {
		var tokens = this.tokens;

		var shader = Object.create(Q3Shader);
		shader.name = tokens.next();
		shader.stages = [];
		shader.vertexDeforms = [];

		// Sanity check.
		if (tokens.next() !== '{') return null;

		while (!tokens.EOF()) {
			var token = tokens.next().toLowerCase();

			if (token == '}') break;

			switch (token) {
				case '{': {
					var stage = this._parseStage(shader);

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
							deform.waveform = this._parseWaveform();
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
						case 'portal': shader.sort = 1; break;
						case 'sky': shader.sort = 2; break;
						case 'opaque': shader.sort = 3; break;
						case 'banner': shader.sort = 6; break;
						case 'underwater': shader.sort = 8; break;
						case 'additive': shader.sort = 9; break;
						case 'nearest': shader.sort = 16; break;
						default: shader.sort = parseInt(sort); break;
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
			shader.sort = (shader.opaque ? 3 : 9);
		}

		return shader;
	}

	ShaderParser.prototype.next = function () {
		return this._parseShader();
	};

	return {
		Parser: ShaderParser
	};
});