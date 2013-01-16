// HACK - Map baseq3 textures to similar textures for external maps.
var textureMap = {
	"textures/base_trim/techborder":              "textures/base_trim/basemetalsupport",
	"textures/gothic_block/blocks15_c":           "textures/gothic_block/blocks20b",
	"textures/gothic_block/blocks15_relief2":     "textures/gothic_block/gkc15b",
	"textures/gothic_block/blocks15cgeomtrn":     "textures/gothic_block/demon_block15fx",
	"textures/gothic_block/blocks17j":            "textures/gothic_block/blocks17g",
	"textures/gothic_block/blocks17k":            "textures/gothic_block/killblock_i",
	"textures/gothic_block/killblock_i2":         "textures/gothic_block/killblock_i",
	"textures/gothic_block/killblock_i3":         "textures/gothic_block/killblock_i",
	"textures/gothic_block/killblock_j":          "textures/gothic_block/killblock_i",
	"textures/gothic_block/killblock_j2":         "textures/gothic_block/killblock_i",
	"textures/gothic_block/killblock_k":          "textures/gothic_block/killblock_i",
	"textures/gothic_ceiling/ceilingtech_big":    "textures/gothic_ceiling/ceilingtech02_d",
	"textures/gothic_door/metal_door_a":          "textures/gothic_door/skull_door_e",
	"textures/gothic_door/metal_door_b":          "textures/gothic_door/skull_door_c",
	"textures/gothic_door/metal_door_c":          "textures/gothic_door/skull_door_b",
	"textures/gothic_door/metal_door_d":          "textures/gothic_door/skull_door_a",
	"textures/gothic_floor/blocks17floor":        "textures/gothic_floor/blocks17floor2",
	"textures/gothic_floor/largerblock3b2":       "textures/gothic_floor/largerblock3b3",
	"textures/gothic_floor/largerblock3b3dim":    "textures/gothic_floor/largerblock3b3",
	"textures/gothic_floor/largerblock3b3x128":   "textures/gothic_floor/largerblock3b3",
	"textures/gothic_floor/q1metal7_97":          "textures/gothic_floor/q1metal7_99",
	"textures/gothic_floor/q1metal7_98d_256x256": "textures/gothic_floor/q1metal7_99",
	"textures/gothic_floor/xstepborder3_alpha":   "textures/gothic_floor/xstepborder3",
	"textures/gothic_floor/xstepborder3_shiney":  "textures/gothic_floor/xstepborder3",
	"textures/gothic_floor/xstepborder5":         "textures/gothic_floor/xstairtop6",
	"textures/gothic_light/skulllight01":         "textures/gothic_light/ironcrosslt2",
	"textures/gothic_light/gothic_light2_2k":     "textures/gothic_light/gothic_light3_2k",
	"textures/gothic_trim/baseboard01":           "textures/gothic_trim/baseboard04",
	"textures/gothic_trim/baseboard10":           "textures/gothic_trim/baseboard10_d",
	"textures/gothic_trim/baseboard10_e":         "textures/gothic_trim/baseboard10_d",
	"textures/gothic_trim/baseboard9c_com_b":     "textures/gothic_trim/baseboard09_c3",
	"textures/gothic_trim/border2":               "textures/gothic_trim/window_a_base",
	"textures/gothic_trim/border6":               "textures/gothic_trim/baseboard04",
	"textures/gothic_trim/border10":              "textures/gothic_trim/baseboard09_g",
	"textures/gothic_trim/border11":              "textures/gothic_trim/baseboard09_g",
	"textures/gothic_trim/metalsupport4":         "textures/gothic_trim/metalsupport4b",
	"textures/gothic_trim/metalsupport4c":        "textures/gothic_trim/metalsupport4b",
	"textures/gothic_trim/metalsupport4g":        "textures/gothic_trim/km_arena1tower4",
	"textures/gothic_trim/metalsupport4g_1":      "textures/gothic_trim/km_arena1tower4",
	"textures/gothic_trim/metalsupport4i_bit":    "textures/gothic_trim/km_arena1tower4",
	"textures/gothic_trim/metalsupport4j":        "textures/gothic_trim/km_arena1tower4",
	"textures/gothic_trim/metalsupport4small":    "textures/gothic_trim/metalsupsolid",
	"textures/gothic_trim/metlsupport4i_shiney":  "textures/gothic_trim/xsupportborderside_shiney",
	"textures/gothic_trim/baseboard01":           "textures/gothic_trim/baseboard04",
	"textures/gothic_trim/pitted_roof":           "textures/gothic_trim/metalsupport4b",
	"textures/gothic_trim/pitted_rustblack":      "textures/gothic_trim/pitted_rust3",
	"textures/gothic_trim/pitted_rust3_black":    "textures/gothic_trim/pitted_rust3",
	"textures/gothic_trim/q1metal7_12":           "textures/gothic_trim/q1metal7",
	"textures/gothic_trim/supportborderside_rot": "textures/gothic_trim/supportborderside",
	"textures/gothic_trim/zinc":                  "textures/gothic_trim/metalsupsolid",
	"textures/gothic_wall/iron01_c5":             "textures/gothic_wall/iron01_b",
	"textures/gothic_wall/xpipecolumn_gray128":   "textures/gothic_wall/xiantourneycolumn_b4",
	"textures/sfx/bounce_concrete":               "textures/sfx/bouncepad01block18b",
	"textures/sfx/bounce_largeblock3" :           "textures/sfx/bouncepad01block18b",
	"textures/sfx/bounce_largeblock3b":           "textures/sfx/bouncepad01block18b",
	"textures/sfx/bounce_xq1metalbig":            "textures/sfx/bouncepad1q1metal7_99",
	"textures/sfx/blackness":                     "gfx/colors/black",
	"textures/skin/skin5":                        "textures/skin/skin6",
	"textures/skies/pjbasesky":                   "textures/skies/topclouds"
};

/**
 * InitTextures
 */
function InitTextures() {
	re.ext_s3tc = GetGLExtension('WEBGL_compressed_texture_s3tc');

	// if (!re.ext_s3tc) {
	// 	error('WEBGL_compressed_texture_s3tc extension is required.');
	// 	return;
	// }

	SetColorMappings();

	re.textures = new AssetCache();
	re.textures.on('load', LoadTexture);

	RegisterDefaultTexture();
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
	re.overbrightBits = r_overBrightBits();
	re.identityLight = 1 / (1 << re.overbrightBits);
}

/**
 * RegisterDefaultTexture
 */
function RegisterDefaultTexture() {
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

	CreateTexture('*default', data, 64, 64);
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
	// Strip extension.
	name = name.replace(/\.[^\/.]+$/, '');

	if (textureMap[name]) {
		name = textureMap[name];
	}

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

	sys.ReadFile(name, 'binary', function (err, data) {
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
	re.skins = new AssetCache();
	re.skins.on('load', LoadSkin);

	RegisterDefaultSkin();
}

/**
 * RegisterDefaultSkin
 */
function RegisterDefaultSkin() {
	var skin = new Skin();
	skin.name = '<default skin>';

	var surface = new SkinSurface();
	surface.shader = re.defaultShader;

	re.skins.register(skin);
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
	// // If not a .skin file, load as a single shader.
	// if (filename.indexOf('.skin') === -1) {
	// 	var skin = new Skin();
	// 	skin.name = filename;

	// 	var surface = new SkinSurface();
	// 	skin.surfaces.push(surface);

	// 	FindShaderByName(filename, SF.LIGHTMAP_GRID | SF.POSITION_LERP, function (shader) {
	// 		surface.shader = shader;

	// 		re.skins.push(skin);

	// 		callback(skin);
	// 	});

	// 	return;
	// }

	var filename = name + '.skin';

	sys.ReadFile(filename, 'utf8', function (err, data) {
		if (err) {
			log('Failed to load skin', name);
			return callback(err);
		}

		var skin = new Skin();
		skin.name = name;

		var steps = [];

		// Trim before we split.
		var lines = data.replace(/^\s+|\s+$/g,'').split(/\r\n/);

		lines.forEach(function (line) {
			var split = line.split(/,/);
			var surfaceName = split[0].toLowerCase();
			var shaderName = split[1];

			if (surfaceName.indexOf('tag_') !== -1) {
				return;
			}

			var surface = new SkinSurface();
			surface.name = surfaceName;

			skin.surfaces.push(surface);

			steps.push(function (cb) {
				FindShaderByName(shaderName, SF.LIGHTMAP_GRID | SF.POSITION_LERP, function (shader) {
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