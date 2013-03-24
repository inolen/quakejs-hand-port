/**
 * InitTextures
 */
function InitTextures() {
	re.ext_s3tc = GetGLExtension('WEBGL_compressed_texture_s3tc');

	if (!re.ext_s3tc) {
		error('WEBGL_compressed_texture_s3tc extension is required.');
		return;
	}

	SetColorMappings();

	re.textures = new AssetCache(GetDefaultTexture());
	re.textures.onload = LoadTexture;

	RegisterWhiteTexture();
}

/**
 * DeleteTextures
 */
function DeleteTextures() {
	/*for (var i = 0; i < tr.numTextures ; i++) {
		qglDeleteTextures( 1, &tr.images[i]->texnum );
	}

	Com_Memset( tr.images, 0, sizeof( tr.images ) );

	tr.numTextures = 0;

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
 * SetColorMappings
 */
function SetColorMappings() {
	// Setup the overbright lighting.
	re.overbrightBits = r_overBrightBits.get();
	re.identityLight = 1 / (1 << re.overbrightBits);
}

/**
 * GetDefaultTexture
 */
function GetDefaultTexture() {
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

	var texture = new Texture();
	texture.texnum = BuildTexture(data, 64, 64, false);

	return texture;
}

/**
 * RegisterWhiteTexture
 */
function RegisterWhiteTexture() {
	CreateTexture('*white', new Uint8Array([255,255,255,255]), 1, 1);
}

/**
 * FindTextureByName
 */
function FindTextureByName(name, clamp, callback) {
	// Strip extension and lowercase.
	name = name.replace(/\.[^\.]+$/, '').toLowerCase();

	re.textures.findByName(name, clamp, callback);
}

/**
 * LoadTexture
 */
function LoadTexture(name, clamp, callback) {
	if (!name) {
		return callback(new Error('Empty texture name'));
	}

	// Only load .dds files. Retrying on missing files is an expensive
	// operation in the browser.
	name += '.dds';

	SYS.ReadFile(name, 'binary', function (err, data) {
		if (err) {
			log('Failed to load texture', name);
			return callback(err);
		}

		var texture = new Texture();
		texture.name = name;
		texture.texnum = BuildTexture(data, null, null, clamp);

		return callback(null, texture);
	}, 'renderer');
}

/**
 * CreateTexture
 */
function CreateTexture(name, buffer, width, height, clamp) {
	var texture = new Texture();
	texture.name = name;
	texture.texnum = BuildTexture(buffer, width, height, clamp);

	re.textures.register(name, texture);
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
	DDSD_QPITCH = 0x8,
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
		log('Invalid magic number in DDS header');
		return 0;
	}

	if (!header[DXTOFF_PFFLAGS] & DDPF_FOURCC) {
		log('Unsupported format, must contain a FourCC code');
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
			log('Unsupported FourCC code:', Int32ToFourCC(fourCC));
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
	re.skins = new AssetCache(GetDefaultSkin());
	re.skins.onload = LoadSkin;
}

/**
 * GetDefaultSkin
 */
function GetDefaultSkin() {
	var skin = new SkinLoader.Skin();

	var surface = new SkinLoader.SkinSurface();
	surface.shader = re.defaultShader;

	return skin;
}

/**
 * RegisterSkin
 */
function RegisterSkin(name, callback) {
	// Strip extension.
	name = name.replace(/\.[^\/.]+$/, '');

	re.skins.load(name, callback);
}

/**
 * FindSkinByHandle
 */
function FindSkinByHandle(hSkin) {
	return re.skins.findByHandle(hSkin);
}

/**
 * LoadSkin
 */
function LoadSkin(name, callback) {
	var filename = name + '.skin';

	SYS.ReadFile(filename, 'utf8', function (err, data) {
		if (err) {
			log('Failed to load skin', name);
			return callback(err);
		}

		var skin = SkinLoader.load(data);

		var steps = [];

		skin.surfaces.forEach(function (surface) {
			steps.push(function (cb) {
				FindShaderByName(surface.shaderName, -2, CFLAGS.POSITION_LERP, function (shader) {
					surface.shader = shader;
					cb(null);
				});
			});
		});

		// Process al the shaders and trigger the callback when we're done.
		async.parallel(steps, function () {
			callback(null, skin);
		});
	}, 'renderer');
}