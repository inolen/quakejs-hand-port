/**
 * InitImages
 */
function InitImages() {
	re.ext_s3tc = GetGLExtension('WEBGL_compressed_texture_s3tc');

	SetColorMappings();
	BuildWhiteTexture();
	BuildDefaultTexture();
}

/**
 * SetColorMappings
 */
function SetColorMappings() {	
	// Setup the overbright lighting.
	re.overbrightBits = r_overBrightBits();
	re.identityLight = 1 / (1 << re.overbrightBits);
}

/**
 * DeleteTextures
 */
function DeleteTextures() {
	/*for (var i = 0; i < tr.numImages ; i++) {
		qglDeleteTextures( 1, &tr.images[i]->texnum );
	}

	Com_Memset( tr.images, 0, sizeof( tr.images ) );

	tr.numImages = 0;

	Com_Memset( glState.currenttextures, 0, sizeof( glState.currenttextures ) );

	if ( qglActiveTextureARB ) {
		GL_SelectTexture( 1 );
		qglBindTexture( GL_TEXTURE_2D, 0 );
		GL_SelectTexture( 0 );
		qglBindTexture( GL_TEXTURE_2D, 0 );
	} else {
		qglBindTexture( GL_TEXTURE_2D, 0 );
	}*/
}

/**
 * FindImage
 */
function FindImage(name, clamp) {
	// Only load .dds files. Retrying on missing files is an expensive
	// operation in the browser.
	if (name.match(/\.[^\.]+$/)) {
		name = name.replace(/\.[^\.]+$/, '.dds');
	} else if (name.charAt(0) !== '*') {
		name += '.dds';
	}

	// Try to find the image in our cache.
	var image;
	if ((image = re.textures[name])) {
		return image;
	} else {
		var image = re.textures[name] = new Texture();
		image.name = name;
		image.texnum = re.defaultTexture.texnum;
	}

	sys.ReadFile(name, 'binary', function (err, data) {
		if (err) {
			console.warn(err.message);
			return;
		}

		image.texnum = BuildTexture(data, null, null, clamp);
	});

	return image;
}

/**
 * BuildWhiteTexture
 */
function BuildWhiteTexture() {
	re.whiteTexture = CreateImage('*white', new Uint8Array([255,255,255,255]), 1, 1);
}

/**
 * BuildDefaultTexture
 */
function BuildDefaultTexture() {
	var data = new Uint8Array(64*64*4);

	var offset = 0;
	for (var i = 0; i < 64; i++) {
		for (var j = 0; j < 64; j++) {
			if ((i%16 < 8 && j%16 < 8) || (i%16 >= 8 && j%16 >= 8)) {
				data[offset++] = 127;
				data[offset++] = 168;
				data[offset++] = 255;
				data[offset++] = 255;
			} else {
				data[offset++] = 255;
				data[offset++] = 255;
				data[offset++] = 255;
				data[offset++] = 255;
			}
		}
	}

	re.defaultTexture = CreateImage('*default', data, 64, 64);
}

/**
 * BuildTexture
 */
function BuildTexture(buffer, width, height, clamp) {
	var texture = gl.createTexture();
	var mipmaps = 1;

	gl.bindTexture(gl.TEXTURE_2D, texture);

	// DXT compressed textures.
	if (buffer instanceof ArrayBuffer) {
		mipmaps = UploadDDSLevels(gl, re.ext_s3tc, buffer, true);
		
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps > 1 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
	}
	// Default textures.
	else if (buffer instanceof Uint8Array) {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	}
	// Lightmaps.
	else {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		for (var i = 0; i < buffer.length; i++) {
			var sub = buffer[i];
			gl.texSubImage2D(gl.TEXTURE_2D, 0, sub.x, sub.y, sub.width, sub.height, gl.RGBA, gl.UNSIGNED_BYTE, sub.buffer);
		}

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	}
	
	if (clamp) {
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}

	if (mipmaps <= 1) {
		gl.generateMipmap(gl.TEXTURE_2D);
	}

	return texture;
}

/**
 * CreateImage
 */
function CreateImage(name, buffer, width, height, clamp) {
	var image;

	// Since we load images asynchronously, if we're creating an image that
	// some surfaces may already reference, don't trash the reference.
	if (!(image = re.textures[name])) {
		image = re.textures[name] = new Texture();
		image.name = name;
	}

	image.texnum = BuildTexture(buffer, width, height, clamp);

	return image;
}

/**********************************************************
 *
 * DXT compressed textures
 *
 **********************************************************/

// All values and structures referenced from:
// http://msdn.microsoft.com/en-us/library/bb943991.aspx/
var DDS_MAGIC = 0x20534444;

var DDSD_CAPS = 0x1,
	DDSD_HEIGHT = 0x2,
	DDSD_WIDTH = 0x4,
	DDSD_PITCH = 0x8,
	DDSD_PIXELFORMAT = 0x1000,
	DDSD_MIPMAPCOUNT = 0x20000,
	DDSD_LINEARSIZE = 0x80000,
	DDSD_DEPTH = 0x800000;

var DDSCAPS_COMPLEX = 0x8,
	DDSCAPS_MIPMAP = 0x400000,
	DDSCAPS_TEXTURE = 0x1000;
	
var DDSCAPS2_CUBEMAP = 0x200,
	DDSCAPS2_CUBEMAP_POSITIVEX = 0x400,
	DDSCAPS2_CUBEMAP_NEGATIVEX = 0x800,
	DDSCAPS2_CUBEMAP_POSITIVEY = 0x1000,
	DDSCAPS2_CUBEMAP_NEGATIVEY = 0x2000,
	DDSCAPS2_CUBEMAP_POSITIVEZ = 0x4000,
	DDSCAPS2_CUBEMAP_NEGATIVEZ = 0x8000,
	DDSCAPS2_VOLUME = 0x200000;

var DDPF_ALPHAPIXELS = 0x1,
	DDPF_ALPHA = 0x2,
	DDPF_FOURCC = 0x4,
	DDPF_RGB = 0x40,
	DDPF_YUV = 0x200,
	DDPF_LUMINANCE = 0x20000;

function FourCCToInt32(value) {
	return value.charCodeAt(0) +
		(value.charCodeAt(1) << 8) +
		(value.charCodeAt(2) << 16) +
		(value.charCodeAt(3) << 24);
}

function Int32ToFourCC(value) {
	return String.fromCharCode(
		value & 0xff,
		(value >> 8) & 0xff,
		(value >> 16) & 0xff,
		(value >> 24) & 0xff
	);
}

var FOURCC_DXT1 = FourCCToInt32("DXT1");
var FOURCC_DXT3 = FourCCToInt32("DXT3");
var FOURCC_DXT5 = FourCCToInt32("DXT5");

// Header length and offsets.
var dxtHeaderLength = 31;
var DXTOFF_MAGIC       = 0,
	DXTOFF_SIZE        = 1,
	DXTOFF_FLAGS       = 2,
	DXTOFF_HEIGHT      = 3,
	DXTOFF_WIDTH       = 4,
	DXTOFF_MIPMAPCOUNT = 7,
	DXTOFF_PFFLAGS     = 20,
	DXTOFF_PFFOURCC    = 21;

function DxtToRgb565(src, src16Offset, width, height) {
	var c = new Uint16Array(4);
	var dst = new Uint16Array(width * height);
	var nWords = (width * height) / 4;
	var m = 0;
	var dstI = 0;
	var i = 0;
	var r0 = 0, g0 = 0, b0 = 0, r1 = 0, g1 = 0, b1 = 0;

	var blockWidth = width / 4;
	var blockHeight = height / 4;
	for (var blockY = 0; blockY < blockHeight; blockY++) {
		for (var blockX = 0; blockX < blockWidth; blockX++) {
			i = src16Offset + 4 * (blockY * blockWidth + blockX);
			c[0] = src[i];
			c[1] = src[i + 1];
			r0 = c[0] & 0x1f;
			g0 = c[0] & 0x7e0;
			b0 = c[0] & 0xf800;
			r1 = c[1] & 0x1f;
			g1 = c[1] & 0x7e0;
			b1 = c[1] & 0xf800;
			// Interpolate between c0 and c1 to get c2 and c3.
			// Note that we approximate 1/3 as 3/8 and 2/3 as 5/8 for
			// speed.  This also appears to be what the hardware DXT
			// decoder in many GPUs does :)
			c[2] = ((5 * r0 + 3 * r1) >> 3)
				| (((5 * g0 + 3 * g1) >> 3) & 0x7e0)
				| (((5 * b0 + 3 * b1) >> 3) & 0xf800);
			c[3] = ((5 * r1 + 3 * r0) >> 3)
				| (((5 * g1 + 3 * g0) >> 3) & 0x7e0)
				| (((5 * b1 + 3 * b0) >> 3) & 0xf800);
			m = src[i + 2];
			dstI = (blockY * 4) * width + blockX * 4;
			dst[dstI] = c[m & 0x3];
			dst[dstI + 1] = c[(m >> 2) & 0x3];
			dst[dstI + 2] = c[(m >> 4) & 0x3];
			dst[dstI + 3] = c[(m >> 6) & 0x3];
			dstI += width;
			dst[dstI] = c[(m >> 8) & 0x3];
			dst[dstI + 1] = c[(m >> 10) & 0x3];
			dst[dstI + 2] = c[(m >> 12) & 0x3];
			dst[dstI + 3] = c[(m >> 14)];
			m = src[i + 3];
			dstI += width;
			dst[dstI] = c[m & 0x3];
			dst[dstI + 1] = c[(m >> 2) & 0x3];
			dst[dstI + 2] = c[(m >> 4) & 0x3];
			dst[dstI + 3] = c[(m >> 6) & 0x3];
			dstI += width;
			dst[dstI] = c[(m >> 8) & 0x3];
			dst[dstI + 1] = c[(m >> 10) & 0x3];
			dst[dstI + 2] = c[(m >> 12) & 0x3];
			dst[dstI + 3] = c[(m >> 14)];
		}
	}
	return dst;
}

function UploadDDSLevels(gl, ext, arrayBuffer, loadMipmaps) {
	var header = new Int32Array(arrayBuffer, 0, dxtHeaderLength),
		fourCC, blockBytes, internalFormat,
		width, height, dataLength, dataOffset,
		rgb565Data, byteArray, mipmapCount, i;

	if (header[DXTOFF_MAGIC] !== DDS_MAGIC) {
		console.error("Invalid magic number in DDS header");
		return 0;
	}
	
	if (!header[DXTOFF_PFFLAGS] & DDPF_FOURCC) {
		console.error("Unsupported format, must contain a FourCC code");
		return 0;
	}

	fourCC = header[DXTOFF_PFFOURCC];
	switch (fourCC) {
		case FOURCC_DXT1:
			blockBytes = 8;
			internalFormat = ext ? ext.COMPRESSED_RGB_S3TC_DXT1_EXT : null;
			break;

		case FOURCC_DXT3:
			blockBytes = 16;
			internalFormat = ext ? ext.COMPRESSED_RGBA_S3TC_DXT3_EXT : null;
			break;

		case FOURCC_DXT5:
			blockBytes = 16;
			internalFormat = ext ? ext.COMPRESSED_RGBA_S3TC_DXT5_EXT : null;
			break;

		default:
			console.error("Unsupported FourCC code:", Int32ToFourCC(fourCC));
			return null;
	}

	mipmapCount = 1;
	if (header[DXTOFF_FLAGS] & DDSD_MIPMAPCOUNT && loadMipmaps !== false) {
		mipmapCount = Math.max(1, header[DXTOFF_MIPMAPCOUNT]);
	}

	width = header[DXTOFF_WIDTH];
	height = header[DXTOFF_HEIGHT];
	dataOffset = header[DXTOFF_SIZE] + 4;

	if (ext) {
		for (i = 0; i < mipmapCount; ++i) {
			dataLength = Math.max( 4, width )/4 * Math.max( 4, height )/4 * blockBytes;
			byteArray = new Uint8Array(arrayBuffer, dataOffset, dataLength);

			gl.compressedTexImage2D(gl.TEXTURE_2D, i, internalFormat, width, height, 0, byteArray);
			dataOffset += dataLength;
			width = Math.max( width * 0.5, 1 );
			height = Math.max( height * 0.5, 1 );
		}
	} else {
		if (fourCC == FOURCC_DXT1) {
			dataLength = Math.max( 4, width )/4 * Math.max( 4, height )/4 * blockBytes;
			byteArray = new Uint16Array(arrayBuffer);
			rgb565Data = DxtToRgb565(byteArray, dataOffset / 2, width, height);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_SHORT_5_6_5, rgb565Data);
			if(loadMipmaps) {
				gl.generateMipmap(gl.TEXTURE_2D);
			}
		} else {
			console.error('No manual decoder for', Int32ToFourCC(fourCC), 'and no native support');
			return 0;
		}
	}

	return mipmapCount;
}

/**********************************************************
 *
 * Skins
 *
 **********************************************************/

/**
 * InitSkins
 */
function InitSkins() {
	var skin = new Skin();
	skin.name = '<default skin>';

	var surface = new SkinSurface();
	surface.shader = re.defaultShader;
	
	re.skins[1] = skin;
}

/**
 * RegisterSkin
 */
function RegisterSkin(filename) {
	if (!filename) {
		console.log('Empty name passed to RegisterSkin');
		return 0;
	}

	// See if the skin is already loaded.
	var skin;
	var hSkin;

	for (var hSkin = 1; hSkin < re.skins.length; hSkin++) {
		skin = re.skins[hSkin];

		if (skin.name == name) {
			// if (skin.numSurfaces === 0) {
			// 	return 0;  // default skin
			// }
			return hSkin;
		}
	}

	// We're adding this on to the end.
	hSkin = re.skins.length;

	// Allocate new skin.
	skin = new Skin();
	skin.name = filename;
	re.skins.push(skin);

	// If not a .skin file, load as a single shader.
	if (filename.indexOf('.skin') === -1) {
		var surface = new SkinSurface();
		surface.shader = FindShader(filename, LightmapType.NONE);
		skin.surfaces.push(surface);
		return hSkin;
	}

	console.log('Loading skin', filename);

	// Load and parse the skin file
	sys.ReadFile(filename, 'utf8', function (err, data) {
		// Trim before we split.
		var lines = data.replace(/^\s+|\s+$/g,'').split(/\r\n/);

		for (var i = 0; i < lines.length; i++) {
			var split = lines[i].split(/,/);

			var surfaceName = split[0].toLowerCase();
			if (surfaceName.indexOf('tag_') !== -1) {
				continue;
			}

			var shaderName = split[1];
			var surface = new SkinSurface();
			surface.name = surfaceName;
			surface.shader = FindShader(shaderName, LightmapType.NONE);
			skin.surfaces.push(surface);
		}

		// // Never let a skin have 0 shaders
		// if (skin.surfaces.length === 0) {
		// 	return 0;  // use default skin
		// }
	});

	return hSkin;
}

/**
 * GetSkinByHandle
 */
function GetSkinByHandle(hSkin) {
	if (hSkin < 1 || hSkin >= re.skins.length) {
		return re.skins[0];
	}

	return re.skins[hSkin];
}