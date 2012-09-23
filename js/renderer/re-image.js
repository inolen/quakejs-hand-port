var images = {};

function InitImages() {
	BuildWhiteTexture();
	BuildDefaultTexture();
}

function FindImage(name, clamp) {
	// Only load .png files. Retrying on missing files is an expensive
	// operation in the browser.
	name = name.replace(/\.[^\.]+$/, '.png');

	// Try to find the image in our cache.
	var image;
	if ((image = images[name])) {
		return image;
	} else {
		var image = images[name] = new Texture();
		image.name = name;
		image.texnum = FindImage('*default').texnum;
	}

	// Load the image using the Image() class.
	var el = new Image();
	el.onload = function() {
		image.texnum = BuildTexture(el, null, null, clamp);
	};

	el.src = Q3W_BASE_FOLDER + '/' + name;
	//el.src = Q3W_BASE_FOLDER + '/' + '/webgl/no-shader.png';

	return image;
}

function BuildWhiteTexture() {
	CreateImage('*white', new Uint8Array([255,255,255,255]), 1, 1);
}

function BuildDefaultTexture() {
	var image = images['*default'] = new Texture();
	image.name = name;

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
	var image;

	// Since we load images asynchronously, if we're creating an image that
	// some surfaces may already reference, don't trash the reference.
	if (!(image = images[name])) {
		image = images[name] = new Texture();
		image.name = name;
	}

	image.texnum = BuildTexture(buffer, width, height, clamp);

	return image;
}