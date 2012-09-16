/*
 * Q3RShader.js - Parses Quake 3 shader files (.shader)
 */

/*
 * Copyright (c) 2009 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

define('renderer/r-shader', ['common/com-defines'], function (q_com_def) {
	return function () {
		var re = this;
		var parsedShaders = {};
		var compiledShaders = {};

		/**
		 * Shader Tokenizer
		 */
		var shaderTokenizer = function (src) {
			// Strip out comments
			src = src.replace(/\/\/.*$/mg, ''); // C++ style (//...)
			src = src.replace(/\/\*[^*\/]*\*\//mg, ''); // C style (/*...*/) (Do the shaders even use these?)
			this.tokens = src.match(/[^\s\n\r\"]+/mg);

			this.offset = 0;
		};

		shaderTokenizer.prototype.EOF = function() {
			if(this.tokens === null) { return true; }
			var token = this.tokens[this.offset];
			while(token === '' && this.offset < this.tokens.length) {
				this.offset++;
				token = this.tokens[this.offset];
			}
			return this.offset >= this.tokens.length;
		};

		shaderTokenizer.prototype.next = function() {
			if(this.tokens === null) { return ; }
			var token = '';
			while(token === '' && this.offset < this.tokens.length) {
				token = this.tokens[this.offset++];
			}
			return token;
		};

		shaderTokenizer.prototype.prev = function() {
			if(this.tokens === null) { return ; }
			var token = '';
			while(token === '' && this.offset >= 0) {
				token = this.tokens[this.offset--];
			}
			return token;
		};

		/**
		 * Parsing helpers.
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

		function ParseStage(shader, tokens) {
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
			while(!tokens.EOF()) {
				var token = tokens.next();
				if(token == '}') { break; }

				switch(token.toLowerCase()) {
					case 'clampmap':
						stage.clamp = true;
					case 'map':
						stage.map = tokens.next().replace(/(\.jpg|\.tga)/, '.png');
						if (!stage.map) {
							stage.texture = re.FindImage('*white');
						} else if (stage.map == '$lightmap') {
							if (shader.lightmap < 0) {
								stage.texture = re.FindImage('*white');
							} else {
								stage.texture = re.FindImage('*lightmap');
							}
						} else if (stage.map == '$whiteimage') {
							stage.texture = re.FindImage('*white');
						} else {
							stage.texture = re.FindImage(stage.map, stage.clamp);
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
							stage.animTexture.push(re.FindImage(map, stage.clamp));
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

			stage.isLightmap = stage.map == '$lightmap'

			return stage;
		};

		function ParseShader(name, tokens) {
			var brace = tokens.next();
			if(brace != '{') {
				return null;
			}

			var shader = {
				name: name,
				cull: 'back',
				sky: false,
				blend: false,
				opaque: false,
				sort: 0,
				vertexDeforms: [],
				stages: []
			};

			// Parse a shader
			while(!tokens.EOF()) {
				var token = tokens.next().toLowerCase();
				if(token == '}') { break; }

				switch (token) {
					case '{': {
						var stage = ParseStage(shader, tokens);

						// I really really really don't like doing this, which basically just forces lightmaps to use the 'filter' blendmode
						// but if I don't a lot of textures end up looking too bright. I'm sure I'm jsut missing something, and this shouldn't
						// be needed.
						if(stage.isLightmap && (stage.hasBlendFunc)) {
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

						switch(deform.type) {
							case 'wave':
								deform.spread = 1.0 / parseFloat(tokens.next());
								deform.waveform = ParseWaveform(tokens);
								break;
							default: deform = null; break;
						}

						if(deform) { shader.vertexDeforms.push(deform); }
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
		};

		/**
		 * Initialization helpers.
		 */
		function ParseShaders(buffer) {
			var tokens = new shaderTokenizer(buffer);

			while (!tokens.EOF()) {
				var name = tokens.next();
				var shader = ParseShader(name, tokens);

				parsedShaders[name] = shader;
			}
		}

		function LoadShader(url, onload) {
			var request = new XMLHttpRequest();

			request.onreadystatechange = function () {
				if (request.readyState == 4 && request.status == 200) {
					ParseShaders(request.responseText);
				}
			};

			request.open('GET', url, true);
			request.setRequestHeader('Content-Type', 'text/plain');
			request.send(null);
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
				var path = q_com_def.Q3W_BASE_FOLDER + '/' + allShaders[i];
				LoadShader(path);
			}
		}

		return {
			InitShaders: function () {
				ScanAndLoadShaderFiles();
			},

			FindShader: function (shaderName) {
				var gl = re.gl;

				var shader;

				if ((shader = compiledShaders[shaderName])) {
					return shader;
				}

				if ((shader = parsedShaders[shaderName])) {
					return (compiledShaders[shaderName] = re.BuildGLShaderForShader(shader));
				}

				// Build default diffuse shader.
				var texture = shaderName !== '*default' ? shaderName + '.png' : shaderName;
				return (compiledShaders[shaderName] = re.BuildGLShaderForTexture(texture));
			}
		};
	};
});