var images = {};
var parsedShaders = {};
var compiledShaders = {};

function InitImages() {
	BuildWhiteTexture();
	BuildDefaultTexture();
}

function FindImage(name, clamp) {
	// Try to find the image in our cache.
	var image;
	if ((image = images[name])) {
		return image;
	} else {
		var image =  images[name] = Object.create(ReImage);
		image.imgName = name;
	}

	// Load the image using the Image() class.
	var el = new Image(),
		retry = true;
	el.onerror = function () {
		if (!retry) return;
		// If we failed to load the .png, try the .jpg (and vice versa)
		var ext = name.indexOf('.png') === -1 ? '.png' : '.jpg';
		name = name.replace(/\.[^\.]+$/, ext);
		retry = false;
		el.src = Q3W_BASE_FOLDER + '/' + name;
	};
	el.onload = function() {
		image.texnum = BuildTexture(el, null, null, clamp);
	};
	//el.src = Q3W_BASE_FOLDER + '/' + name;
	el.src = Q3W_BASE_FOLDER + '/' + '/webgl/no-shader.png';

	return image;
}

function BuildWhiteTexture() {
	CreateImage('*white', new Uint8Array([255,255,255,255]), 1, 1);
}

function BuildDefaultTexture() {
	var image =  images['*default'] = Object.create(ReImage);
	image.imgName = name;

	var el = new Image();
	el.onload = function() {
		image.texnum = BuildTexture(el);
	};
	el.src = Q3W_BASE_FOLDER + '/webgl/no-shader.png';
}

function BuildTexture(bufferOrImage, width, height, clamp) {
	var texture = gl.createTexture();

	gl.bindTexture(gl.TEXTURE_2D, texture);
	if (bufferOrImage instanceof Image) {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bufferOrImage);
	} else {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bufferOrImage);
	}
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	if (clamp) {
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}
	gl.generateMipmap(gl.TEXTURE_2D);

	return texture;
}

function CreateImage(name, buffer, width, height, clamp) {
	var image =  images[name] = Object.create(ReImage);
	image.imgName = name;
	image.texnum = BuildTexture(buffer, width, height, clamp);

	return image;
}

/**
 * GL Shaders
 */
function SetShader(shader) {
	if (!shader) {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
	} else if (shader.cull && !shader.sky) {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(shader.cull);
	} else {
		gl.disable(gl.CULL_FACE);
	}

	return true;
}

function SetShaderStage(shader, stage, time) {
	if (stage.animFreq) {
		// Texture animation seems like a natural place for setInterval, but that approach has proved error prone.
		// It can easily get out of sync with other effects (like rgbGen pulses and whatnot) which can give a
		// jittery or flat out wrong appearance. Doing it this way ensures all effects are synced.
		var animFrame = Math.floor(time*stage.animFreq) % stage.animTexture.length;
		stage.texture = stage.animTexture[animFrame];
	}

	gl.blendFunc(stage.blendSrc, stage.blendDest);

	if (stage.depthWrite && !shader.sky) {
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

/**
 * Q3 Shaders
 */
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