var fs = require('fs');
var textureUtils = require('./texture-util');

var path = process.argv[2];

if(!path) {
    console.log('No base path specified');
    return;
}

function findFilesByExtension(dir, ext) {
    ext = ext.toLowerCase();

    var _find = function(dir) {
        var filenames = fs.readdirSync(dir),
            results = [];

        for (var i = 0, len = filenames.length; i < len; i++) {
            var filename = dir + '/' + filenames[i];

            if (filename.toLowerCase().lastIndexOf(ext) !== -1) {
                results.push(filename);
            }

            if (fs.statSync(filename).isDirectory()) {
                results = results.concat(_find(filename));
            }
        }

        return results;
    };

    return _find(dir);
};

console.log('Converting JPEG files');
var filenames = findFilesByExtension(path, '.jpg');
for (var i = 0, len = filenames.length; i < len; i++) {
    var filename = filenames[i],
        pngFilename = filename.replace('.jpg', '.png');

    console.log(' .. converting ' + filename + ' to ' + pngFilename);

    var canvas = textureUtils.loadJpegToCanvas(filename);
    if (canvas) {
        textureUtils.writeCanvasToPng(canvas, pngFilename);
    }
}

console.log('Converting TGA files');
var filenames = findFilesByExtension(path, '.tga');
for (var i = 0, len = filenames.length; i < len; i++) {
    var filename = filenames[i],
        pngFilename = filename.replace('.tga', '.png');

    console.log(' .. converting ' + filename + ' to ' + pngFilename);

    var canvas = textureUtils.loadTgaToCanvas(filename);
    if (canvas) {
        textureUtils.writeCanvasToPng(canvas, pngFilename);
    }
}