define(function (require) {

var cache = {};

function compile(gl, vertexSrc, fragmentSrc) {
	var shaderProgram;

	// Try and find it from our cache.
	if ((shaderProgram = cache[vertexSrc + fragmentSrc])) {
		return shaderProgram;
	}

	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, fragmentSrc);
	gl.compileShader(fragmentShader);

	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		var err = new Error('Could not compile fragment shader:\n' +
			gl.getShaderInfoLog(fragmentShader) + '\n' +
			vertexSrc + '\n' +
			fragmentSrc + '\n');

		gl.deleteShader(fragmentShader);

		throw err;
	}

	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexSrc);
	gl.compileShader(vertexShader);

	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		var err = new Error('Could not compile vertex shader:\n' +
			gl.getShaderInfoLog(vertexShader) + '\n' +
			vertexSrc + '\n' +
			fragmentSrc + '\n');;

		gl.deleteShader(vertexShader);

		throw err;
	}

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		gl.deleteProgram(shaderProgram);
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);

		throw new Error('Could not link shaders:\n' +
			vertexSrc + '\n' +
			fragmentSrc + '\n');
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
	cache[vertexSrc + fragmentSrc] = shaderProgram;

	return shaderProgram;
}

return {
	compile: compile
};

});