var _ = require('underscore');
var url = require('url');
var requirejs = require('requirejs');

/**
 * Load config
 */
var config = {
	port: 9001,
	assets: {
		host: 'localhost',
		port: 9000
	}
};
try {
	var data = require('dedicated.json');
	_.extend(config, data);
} catch (e) {
}

/** 
 * Create game server.
 */
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
	var assetsUrl = url.format({
		protocol: 'http',
		hostname: config.assets.host,
		port: config.assets.port
	});

	sys.Init(assetsUrl, config.port);
});