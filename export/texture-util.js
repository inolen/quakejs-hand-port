var fs = require('fs');
var Canvas = require('canvas');

var utils = module.exports = {};

function decodeTga(content) {
    var contentOffset = 18 + content[0];  //[0] = size of ID field
    var imagetype = content[2]; // 0=none,1=indexed,2=rgb,3=grey,+8=rle packed
    var width = content[13]*256 + content[12];
    var height = content[15]*256 + content[14];
    var bpp = content[16];  // should be 8,16,24,32

    var bytesPerPixel = bpp / 8;
    var bytesPerRow = width * bytesPerPixel;
    var byteCount = width * height * bytesPerPixel;

    var blueOffset = 0;
    var greenOffset = 1;
    var redOffset = 2;
    var alphaOffset = 3;

    if(!width || !height) {
        console.log("Invalid dimensions");
        return null;
    }

    if (imagetype != 2) {
        console.log("Unsupported TGA format:", imagetype);
        return null;
    }

    var canvas = new Canvas(width, height);
    var ctx = canvas.getContext('2d');
    var imageData = ctx.createImageData(width, height);

    var i = contentOffset, j, x, y;

    var validAlpha = 0;

    // Oy, with the flipping of the rows...
    for(y = height-1; y >= 0; --y) {
        for(x = 0; x < width; ++x, i += bytesPerPixel) {
            j = (x * bytesPerPixel) + (y * bytesPerRow);
            imageData.data[j] = content[i+redOffset];
            imageData.data[j+1] = content[i+greenOffset];
            imageData.data[j+2] = content[i+blueOffset];
            imageData.data[j+3] = (bpp === 32 ? content[i+alphaOffset] : 255);
            validAlpha = validAlpha || imageData.data[j+3];
        }
    }

    // This really sucks, but occasionally an image will come through with nothing but 0s in the alpha channel
    // The canvas stream to PNG premultiplies the alpha values, and so the image comes out empty
    // I'm not sure this is the right way to fix it, but it seems to work for the moment
    if(!validAlpha) {
        i = imageData.data.length;
        for(j = 3; j < i; j += 4) {
            imageData.data[j] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);

    return canvas;
}

function nextPowerOfTwo(n) {
    --n;
    n = n | (n >> 1);
    n = n | (n >> 2);
    n = n | (n >> 4);
    n = n | (n >> 8);
    n = n | (n >> 16);
    return ++n;
}

utils.loadJpegToCanvas = function (filename) {
    var img = new Canvas.Image();
    img.src = filename;

    var potWidth = nextPowerOfTwo(img.width);
    var potHeight = nextPowerOfTwo(img.height);

    var canvas = new Canvas(potWidth, potHeight);
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, potWidth, potHeight);

    return canvas;
};

utils.loadTgaToCanvas = function (filename) {
    var buffer = fs.readFileSync(filename);
    return decodeTga(buffer);
};

utils.writeCanvasToPng = function (canvas, filename) {
    fs.writeFileSync(filename, canvas.toBuffer());
};