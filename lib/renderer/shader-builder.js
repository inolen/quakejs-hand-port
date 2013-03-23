define(function (require) {

/**********************************************************
 *
 * Generic helper for building GLSL shaders programmatically
 *
 **********************************************************/
var ShaderBuilder = function () {
	this.defines = {};
	this.attribs = {};
	this.varyings = {};
	this.uniforms = {};

	this.vertexFunctions = {};
	this.fragmentFunctions = {};

	this.vertexLines = [];
	this.fragmentLines = [];
};

ShaderBuilder.prototype.addDefine = function (name, data) {
	this.defines[name] = data;
};

ShaderBuilder.prototype.addAttrib = function(name, type) {
	this.attribs[name] = type;
};

ShaderBuilder.prototype.addVarying = function(name, type) {
	this.varyings[name] = type;
};

ShaderBuilder.prototype.addUniform = function (name, data, prefix, suffix) {
	this.uniforms[name] = {
		data: data,
		prefix: prefix,
		suffix: suffix
	};
};

ShaderBuilder.prototype.addVertexFunction = function (name, src) {
	this.vertexFunctions[name] = src;
};

ShaderBuilder.prototype.addFragmentFunction = function (name, src) {
	this.fragmentFunctions[name] = src;
};

ShaderBuilder.prototype.addVertexLines = function (lines) {
	for (var i = 0; i < lines.length; i++) {
		this.vertexLines.push(lines[i]);
	}
};

ShaderBuilder.prototype.addFragmentLines = function (lines) {
	for (var i = 0; i < lines.length; i++) {
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

	for (var i in this.defines) {
		src += '#define ' + i + ' ' + this.defines[i] + '\n';
	}

	for (var i in this.attribs) {
		src += 'attribute ' + this.attribs[i] + ' ' + i + ';\n';
	}

	for (var i in this.varyings) {
		src += 'varying ' + this.varyings[i] + ' ' + i + ';\n';
	}

	for (var i in this.uniforms) {
		var uniform = this.uniforms[i];
		if (uniform.prefix) {
			src += uniform.prefix + '\n';
		}
		src += 'uniform ' + uniform.data + ' ' + i + ';\n';
		if (uniform.suffix) {
			src += uniform.suffix + '\n';
		}
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

	for (var i in this.defines) {
		src += '#define ' + i + ' ' + this.defines[i] + '\n';
	}

	for (var i in this.varyings) {
		src += 'varying ' + this.varyings[i] + ' ' + i + ';\n';
	}

	for (var i in this.uniforms) {
		var uniform = this.uniforms[i];
		if (uniform.prefix) {
			src += uniform.prefix + '\n';
		}
		src += 'uniform ' + uniform.data + ' ' + i + ';\n';
		if (uniform.suffix) {
			src += uniform.suffix + '\n';
		}
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

return ShaderBuilder;

});