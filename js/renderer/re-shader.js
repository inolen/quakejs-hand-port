var parsedShaders = {};
var compiledShaders = {};

function InitShaders() {
	ScanAndLoadShaderFiles();
}

function FindShader(shaderName) {
	var shader;

	if ((shader = compiledShaders[shaderName])) {
		return shader;
	}

	if ((shader = parsedShaders[shaderName])) {
		return (compiledShaders[shaderName] = GLShader.FromShader(gl, shader));
	}

	// Build default diffuse shader.
	var map = shaderName !== '*default' ? shaderName + '.png' : shaderName;
	var texture = FindImage(map);
	return (compiledShaders[shaderName] = GLShader.FromTexture(gl, map, texture));
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
		
		var parser = new Q3Shader.Parser(request.responseText, {
			findImage: FindImage
		});
		var shader;
		while ((shader = parser.next())) {
			parsedShaders[shader.name] = shader;
		};
	};

	request.open('GET', url, true);
	request.setRequestHeader('Content-Type', 'text/plain');
	request.send(null);
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
	if (stage.animFreq) {
		// Texture animation seems like a natural place for setInterval, but that approach has proved error prone.
		// It can easily get out of sync with other effects (like rgbGen pulses and whatnot) which can give a
		// jittery or flat out wrong appearance. Doing it this way ensures all effects are synced.
		var animFrame = Math.floor(time*stage.animFreq) % stage.animTexture.length;
		stage.texture = stage.animTexture[animFrame];
	}

	gl.blendFunc(stage.blendSrc, stage.blendDest);

	if (stage.depthWrite && !glshader.sky) {
		gl.depthMask(true);
	} else {
		gl.depthMask(false);
	}

	gl.depthFunc(stage.depthFunc);

	gl.useProgram(stage.program);

	var texture = stage.texture || FindImage('*default');

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