define('common/shader-compiler', ['common/qshared', 'common/text-tokenizer'], function (QS, TextTokenizer) {

var SS = {
	BAD:            0,
	PORTAL:         1,                                     // mirrors, portals, viewscreens
	ENVIRONMENT:    2,                                     // sky box
	OPAQUE:         3,                                     // opaque
	DECAL:          4,                                     // scorch marks, etc.
	SEE_THROUGH:    5,                                     // ladders, grates, grills that may have small blended
	                                                       // edges in addition to alpha test
	BANNER:         6,
	FOG:            7,
	UNDERWATER:     8,                                     // for items that should be drawn in front of the water plane
	BLEND0:         9,                                     // regular transparency and filters
	BLEND1:         10,                                    // generally only used for additive type effects
	BLEND2:         11,
	BLEND3:         12,
	BLEND6:         13,
	STENCIL_SHADOW: 14,
	ALMOST_NEAREST: 15,                                    // gun smoke puffs
	NEAREST:        16                                     // blood blobs
};

var CONTENTS = QS.CONTENTS;
var SURF = QS.SURF;

var SurfaceParms = {
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

var Script = function () {
	this.name           = null;
	this.sort           = 0;
	this.surfaceFlags   = 0;
	this.contentFlags   = 0;
	this.cull           = 'front';
	this.sky            = false;
	this.fog            = false;
	this.polygonOffset  = false;
	this.entityMergable = false;
	this.positionLerp   = false;
	this.portalRange    = 0;
	this.vertexDeforms  = [];
	this.stages         = [];
};

var Deform = function () {
	this.type   = null;
	this.spread = 0.0;
	this.wave   = null;
};

var ScriptStage = function () {
	this.maps         = [];
	this.animFreq     = 0;
	this.clamp        = false;
	this.tcGen        = 'base';
	this.rgbGen       = 'identity';
	this.rgbWave      = null;
	this.alphaGen     = '1.0';
	this.alphaFunc    = null;
	this.alphaWave    = null;
	this.blendSrc     = 'GL_ONE';
	this.blendDest    = 'GL_ZERO';
	this.hasBlendFunc = false;
	this.depthFunc    = 'lequal';
	this.depthWrite   = true;
	this.isLightmap   = false;
	this.tcMods       = [];
};

var TexMod = function () {
	this.type   = null;
	this.wave   = null;
	this.scaleX = 0.0;
	this.scaleY = 0.0;
	this.sSpeed = 0.0;
	this.tSpeed = 0.0;
};

var Waveform = function () {
	this.funcName = null;
	this.base     = 0.0;
	this.amp      = 0.0;
	this.phase    = 0.0;
	this.freq     = 0.0;
};

/**********************************************************
 *
 * Generic helper for building GLSL shaders programmatically
 *
 **********************************************************/
var ShaderBuilder = function () {
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

/**********************************************************
 *
 * Parse shader scripts
 *
 **********************************************************/
var ShaderParser = {};

ShaderParser.parse = function (shaderText, lightmapIndex) {
	var tokens = new TextTokenizer(shaderText);

	var script = new Script();
	script.name = tokens.next();

	// Sanity check.
	if (tokens.next() !== '{') return null;

	while (!tokens.EOF()) {
		var token = tokens.next().toLowerCase();

		if (token == '}') break;

		switch (token) {
			case '{': {
				ShaderParser.parseStage(tokens, script, lightmapIndex);
			} break;

			case 'sort':
				ShaderParser.parseSort(tokens, script);
				break;

			case 'cull':
				script.cull = tokens.next();
				break;

			case 'deformvertexes':
				ShaderParser.parseDeform(tokens, script);
				break;

			case 'surfaceparm':
				ShaderParser.parseSurfaceparm(tokens, script);
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
};

ShaderParser.parseDeform = function (tokens, script) {
	var deform = new Deform();

	deform.type = tokens.next().toLowerCase();

	switch (deform.type) {
		case 'wave':
			deform.spread = 1.0 / parseFloat(tokens.next());
			deform.wave = ShaderParser.parseWaveForm(tokens);
			script.vertexDeforms.push(deform);
			break;
	}
};

ShaderParser.parseSort = function (tokens, script) {
	var val = tokens.next().toLowerCase();

	switch (val) {
		case 'portal':     script.sort = SS.PORTAL;         break;
		case 'sky':        script.sort = SS.ENVIRONMENT;    break;
		case 'opaque':     script.sort = SS.OPAQUE;         break;
		case 'decal':      script.sort = SS.DECAL;          break;
		case 'seeThrough': script.sort = SS.SEE_THROUGH;    break;
		case 'banner':     script.sort = SS.BANNER;         break;
		case 'additive':   script.sort = SS.BLEND1;         break;
		case 'nearest':    script.sort = SS.NEAREST;        break;
		case 'underwater': script.sort = SS.UNDERWATER;     break;
		default:           script.sort = parseInt(val, 10); break;
	}
};

ShaderParser.parseSurfaceparm = function (tokens, script) {
	var val = tokens.next().toLowerCase();

	var parm = SurfaceParms[val];

	if (!parm) {
		return;
	}

	script.surfaceFlags |= parm.surface;
	script.contentFlags |= parm.contents;
};

ShaderParser.parseStage = function (tokens, script, lightmapIndex) {
	var stage = new ScriptStage();

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
					error('WARNING: missing parameter for \'map\' keyword in script \'' + script.name + '\'');
				}
				if (map === '$whiteimage') {
					map = '*white';
				} else if (map == '$lightmap') {
					stage.isLightmap = true;
					if (lightmapIndex < 0) {
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
						stage.rgbWave = ShaderParser.parseWaveForm(tokens);
						if (!stage.rgbWave) { stage.rgbGen = 'identity'; }
						break;
				}
				break;

			case 'alphagen':
				stage.alphaGen = tokens.next().toLowerCase();
				switch (stage.alphaGen) {
					case 'wave':
						stage.alphaWave = ShaderParser.parseWaveForm(tokens);
						if (!stage.alphaWave) { stage.alphaGen = '1.0'; }
						break;
					case 'portal':
						script.portalRange = parseFloat(tokens.next().toLowerCase());
						break;
					default: break;
				}
				break;

			case 'alphafunc':
				stage.alphaFunc = tokens.next().toUpperCase();
				break;

			case 'blendfunc':
				stage.blendSrc = tokens.next().toUpperCase();
				stage.hasBlendFunc = true;
				if (!stage.depthWriteOverride) {
					stage.depthWrite = false;
				}
				switch (stage.blendSrc) {
					case 'ADD':
						stage.blendSrc = 'GL_ONE';
						stage.blendDest = 'GL_ONE';
						break;

					case 'BLEND':
						stage.blendSrc = 'GL_SRC_ALPHA';
						stage.blendDest = 'GL_ONE_MINUS_SRC_ALPHA';
						break;

					case 'FILTER':
						stage.blendSrc = 'GL_DST_COLOR';
						stage.blendDest = 'GL_ZERO';
						break;

					default:
						stage.blendDest = tokens.next().toUpperCase();
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
				ShaderParser.parseTexMod(tokens, stage);
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

	// I really really really don't like doing this, which basically just forces lightmaps to use the 'filter' blendmode
	// but if I don't a lot of textures end up looking too bright. I'm sure I'm just missing something, and this shouldn't
	// be needed.
	if (stage.isLightmap && stage.hasBlendFunc) {
		stage.blendSrc = 'GL_DST_COLOR';
		stage.blendDest = 'GL_ZERO';
	}

	script.stages.push(stage);
};

ShaderParser.parseTexMod = function (tokens, stage) {
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
			tcMod.wave = ShaderParser.parseWaveForm(tokens);
			if (!tcMod.wave) { tcMod.type = null; }
			break;

		case 'turb':
			tcMod.turbulance = {
				base: parseFloat(tokens.next()),
				amp: parseFloat(tokens.next()),
				phase: parseFloat(tokens.next()),
				freq: parseFloat(tokens.next())
			};
			break;

		default:
			tcMod.type = null;
			break;
	}

	if (tcMod.type) {
		stage.tcMods.push(tcMod);
	}
};

ShaderParser.parseWaveForm = function (tokens) {
	var wave = new Waveform();

	wave.funcName = tokens.next().toLowerCase();
	wave.base = parseFloat(tokens.next());
	wave.amp = parseFloat(tokens.next());
	wave.phase = parseFloat(tokens.next());
	wave.freq = parseFloat(tokens.next());

	return wave;
};

/**********************************************************
 *
 * Compiler parsed shader scripts into GLSL programs
 *
 **********************************************************/
var ShaderCompiler = {};

var programCache = {};

ShaderCompiler.compile = function (gl, script, numLights) {
	var key = ShaderCompiler.getScriptKey(script, numLights);

	if (programCache[key]) {
		return programCache[key];
	}

	var builder = ShaderCompiler.buildProgram(script, numLights);
	var fragmentSrc = builder.getFragmentSource();
	var vertexSrc = builder.getVertexSource();

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

	var shaderProgram = gl.createProgram();
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

	// Add to cache.
	programCache[key] = shaderProgram;

	return shaderProgram;
};

/**
 * Used to compare scripts for likeness before running them through buildProgram.
 * This is an incredibly naive approach, but it's an order of magnitude faster than
 * without.
 */
ShaderCompiler.getScriptKey = function (script, numLights) {
	// Lazy copy constructor.
	var json = JSON.stringify(script);
	var val = JSON.parse(json);

	// Ignore surfaceparms.
	delete val.surfaceFlags;
	delete val.contentFlags;

	// Ignore maps.
	for (var i = 0; i < val.stages.length; i++) {
		delete val.stages[i].maps;
	}

	// ... and stringify again to be used as a key.
	return JSON.stringify(val);
};

ShaderCompiler.buildProgram = function (script, numLights) {
	var builder = new ShaderBuilder();

	builder.addAttrib('position', 'vec3');
	builder.addAttrib('normal', 'vec3');

	builder.addVarying('vPosition', 'vec3');
	builder.addVarying('vNormal', 'vec3');

	builder.addUniform('modelViewMatrix', 'mat4');
	builder.addUniform('projectionMatrix', 'mat4');
	builder.addUniform('viewPosition', 'vec3');
	builder.addUniform('time', 'float');

	if (numLights > 0) {
		builder.addUniform('dlightCount', 'int');
		builder.addUniform('dlightPositions[' + numLights + ']', 'vec3');
		builder.addUniform('dlightInfo[' + numLights + ']', 'vec4');
	}

	//
	// Vertex Shader.
	//
	if (script.positionLerp) {
		builder.addAttrib('position2', 'vec3');
		builder.addAttrib('normal2', 'vec3');

		builder.addUniform('backlerp', 'float');

		builder.addVertexLines([
			'vec3 defPosition = position + backlerp * (position2 - position);',
			'vec3 defNormal = normal + backlerp * (normal2 - normal);'
		]);
	} else {
		builder.addVertexLines([
			'vec3 defPosition = position;',
			'vec3 defNormal = normal;'
		]);
	}

	builder.addVertexLines([
		'vPosition = defPosition;',
		'vNormal = defNormal;'
	]);

	// Add special varyings based on rgbGen / alphaGen states.
	var vColor = false;
	var vEntityColor = false;
	var vDiffuseColor = false;

	for (var i = 0; i < script.stages.length; i++) {
		var stage = script.stages[i];

		switch (stage.rgbGen) {
			case 'vertex':
			case 'exactvertex':
				vColor = true;
				break;
			case 'entity':
				vEntityColor = true;
				break;
			case 'lightingdiffuse':
				vDiffuseColor = true;
				break;
		}

		switch (stage.alphaGen) {
			case 'vertex':
			case 'lightingspecular':
				vColor = true;
				break;
			case 'entity':
				vEntityColor = true;
				break;
		}
	}

	if (vColor) {
		builder.addAttrib('color', 'vec4');
		builder.addVarying('vColor', 'vec4');
		builder.addVertexLines([ 'vColor = color;']);
	}

	if (vEntityColor) {
		builder.addUniform('entityColor', 'vec4');
	}

	if (vDiffuseColor) {
		builder.addUniform('lightDir', 'vec3');
		builder.addUniform('ambientLight', 'vec3');
		builder.addUniform('directedLight', 'vec3');

		builder.addVarying('vDiffuseScale', 'float');

		builder.addVertexLines([
			'vDiffuseScale = max(0.0, dot(defNormal, lightDir));'
		]);
	}

	for (var i = 0; i < script.vertexDeforms.length; i++) {
		var deform = script.vertexDeforms[i];

		switch (deform.type) {
			case 'wave':
				var name = 'deform' + i;
				var offName = 'deformOff' + i;

				builder.addVertexLines([
					'float ' + offName + ' = (position.x + position.y + position.z) * ' + deform.spread.toFixed(4) + ';'
				]);

				var phase = deform.wave.phase;
				deform.wave.phase = phase.toFixed(4) + ' + ' + offName;
				builder.addVertexLines([
					builder.createWaveform(name, deform.wave, true)
				]);
				deform.wave.phase = phase;

				builder.addVertexLines([
					'defPosition += defNormal * ' + name + ';'
				]);
				break;

			default:
				break;
		}
	}

	// Project sky onto far plane.
	var w = script.sky ? '0.0' : '1.0';
	builder.addVertexLines(['vec4 worldPosition = modelViewMatrix * vec4(defPosition, ' + w + ');']);

	for (var i = 0; i < script.stages.length; i++) {
		var stage = script.stages[i];
		ShaderCompiler.buildVertexPass(builder, script, stage, i);
	}

	builder.addVertexLines(['gl_Position = projectionMatrix * worldPosition;']);
	if (script.sky) {
		// Nudge it just in front of the far plane.
		builder.addVertexLines(['gl_Position.w = gl_Position.z + 0.001;']);
	}

	//
	// Fragment shader.
	//
	builder.addFragmentLines([
		'vec4 passColor;'
	]);

	// Add fog pass first.
	if (script.fog) {
		builder.addFragmentLines([
			'vec4 fragColor = vec4(1.0, 1.0, 1.0, 1.0);',
			'float z = (gl_FragCoord.z / gl_FragCoord.w) / 4000.0;',
			'fragColor.a = z;'
		]);
	}

	// Add individual stages.
	for (var i = 0; i < script.stages.length; i++) {
		var stage = script.stages[i];
		ShaderCompiler.buildFragmentPass(builder, script, stage, i);
	}

	// Add dlights as the final pass.
	// '		dir = normalize(dir);' +
	// '		float pointDiffuseWeight = max(dot(vNormal, dir), 0.0);\n' +
	// '		fragColor.rgb += dlightColor.rgb * pointDiffuseWeight * distance;\n' +
	if (numLights > 0) {
		var dlightFunc = 'vec4 dlightPass() {\n' +
						 '	vec4 fragColor = vec4(0.0, 0.0, 0.0, 1.0);\n' +
						 '	vec3 dir;\n' +
						 '	float distance;\n';

		// Manually unroll this loop, otherwise the performance
		// varies drastically across hardware.
		for (var i = 0; i < numLights; i++) {
			dlightFunc += '	if (dlightInfo[' + i + '].w > 0.0) {\n' +
						 '		dir = vPosition.xyz - dlightPositions[' + i + '].xyz;\n' +
						 '		distance = 1.0 - min((length(dir) / dlightInfo[' + i + '].w), 1.0);\n' +
						 '		fragColor.rgb += dlightInfo[' + i + '].rgb * distance;\n' +
						 '	}\n';
		}

		dlightFunc += '	return fragColor;\n' +
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

	return builder;
};

ShaderCompiler.buildVertexPass = function (builder, script, stage, stageId) {
	var passName = 'vertPass' + stageId;
	var texCoordVar = 'vTexCoord' + stageId;
	builder.addVarying(texCoordVar, 'vec2');

	if (stage.isLightmap) {
		builder.addAttrib('lightCoord', 'vec2');
	} else {
		builder.addAttrib('texCoord', 'vec2');
	}

	var passFunc = 'vec2 ' + passName + '(vec4 worldPosition, vec3 normal) {\n';
	passFunc += '	vec2 vTexCoord;\n';

	if (stage.tcGen === 'environment') {
		passFunc += [
			'	vec3 viewer = normalize(viewPosition - position);\n',
			'float d = dot(normal, viewer);\n',
			'vec3 reflected = normal * 2.0 * d - viewer;\n',
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
			builder.addVertexFunction('specular',
				'float specular() {\n' +
				'	vec3 lightOrigin = vec3(-960.0, 1980.0, 96.0);\n' +
				'	vec3 lightDir = normalize(lightOrigin - position);\n' +
				'	float d = dot(normal, lightDir);\n' +
				'	vec3 reflected = normal * 2.0 * d - lightDir;\n' +
				'	vec3 viewer = viewPosition - position;\n' +
				'	float ilength = inversesqrt(dot(viewer, viewer));\n' +
				'	float l = dot(reflected, viewer) * ilength;\n' +
				'	if (l > 0.0) {\n' +
				'		l = l*l*l;\n' +
				'	} else {\n' +
				'		l = 0.0;\n' +
				'	}\n' +
				'	return l;' +
				'}');
			builder.addVertexLines([
				'vColor.a = min(specular(), 1.0);'
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
					'	' + builder.createWaveform('stretchWave', tcMod.wave, true),
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
	builder.addVertexLines([texCoordVar + ' = ' + passName + '(worldPosition, defNormal);']);
};

ShaderCompiler.buildFragmentPass = function (builder, script, stage, stageId) {
	var passName = 'fragPass' + stageId;
	var samplerVar = 'texSampler' + stageId;
	var texCoordVar = 'vTexCoord' + stageId;

	builder.addUniform(samplerVar, 'sampler2D');

	var passFunc = 'vec4 ' + passName + '(sampler2D texture, vec2 vTexCoord) {\n';
		passFunc += '	vec4 texColor = texture2D(texture, vTexCoord);\n';

	switch (stage.rgbGen) {
		case 'vertex':  // TODO vertex lighting should multiply by the identityLight constant
		case 'exactvertex':
			passFunc += '	vec3 rgb = texColor.rgb * vColor.rgb;\n';
			break;
		case 'entity':
			passFunc += '	vec3 rgb = texColor.rgb * entityColor.rgb;\n';
			break;
		case 'lightingdiffuse':
			passFunc += '	vec3 diffuse = ambientLight + vDiffuseScale * directedLight;\n';
			passFunc += '	vec3 rgb = texColor.rgb * diffuse;\n';
			break;
		case 'wave':
			passFunc += '	' + builder.createWaveform('rgbWave', stage.rgbWave, false) + '\n';
			passFunc += '	vec3 rgb = texColor.rgb * rgbWave;\n';
			break;
		default:
			passFunc += '	vec3 rgb = texColor.rgb;\n';
			break;
	}

	switch (stage.alphaGen) {
		case 'vertex':
		case 'lightingspecular':
			passFunc += '	float alpha = texColor.a * vColor.a;\n';
			break;
		case 'entity':
			passFunc += '	float alpha = texColor.a * entityColor.a;\n';
			break;
		case 'wave':
			passFunc += '	' + builder.createWaveform('alphaWave', stage.alphaWave, false);
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
};

return {
	SS:          SS,

	Script:      Script,
	ScriptStage: ScriptStage,

	parse:       ShaderParser.parse,
	compile:     ShaderCompiler.compile
};

});