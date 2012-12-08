/**
 * Dedicated server for game.
 *
 * This dedicated server script will load an instance of 
 * the actual game, resulting in a HTTP server being created
 * to handle WebSocket connections.
 *
 * In addition, it will load up content.js to provide assets
 * to connecting clients.
 */
var _ = require('underscore');
var fs = require('fs');
var requirejs = require('requirejs');
var assets = require('./assets');

var config = loadConfig('config.json');

function loadConfig(filename) {
	var defaults = {
		"gamePort": 9001
	};

	var data = '{}';
	try {
		data = fs.readFileSync(filename, 'utf8');
	} catch (e) {
	}

	var json = JSON.parse(data);

	return _.extend({}, defaults, json);
}

// Create the asset server.
assets.createServer();

// Create the game server.
requirejs.config({
	nodeRequire: require,
	baseUrl: 'lib',
	paths: {
		// 'underscore':           'vendor/underscore',
		// 'glmatrix':             'vendor/gl-matrix',
		// 'ByteBuffer':           'vendor/byte-buffer',
		// 'client/cl':            'stub',
		'system/dedicated/sys': '../bin/quakejs-dedicated-min'
	}
});

requirejs(['system/dedicated/sys'], function (sys) {
	// Fake fs module that runs paths through assets lib first.
	var fakefs = {
		readFile: function (path, encoding, callback) {
			path = assets.getAbsolutePath(path);

			if (typeof(encoding) === 'function') {
				callback = encoding;
				return fs.readFile(path, callback);
			}

			return fs.readFile(path, encoding, callback);
		}
	};

	sys.Init(fakefs, config.gamePort);
});