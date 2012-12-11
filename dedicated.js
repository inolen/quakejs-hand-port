var _ = require('underscore');
var url = require('url');
var requirejs = require('requirejs');

/**
 * Load config
 */
var config = {
	gamePort: 9001,
	rconPort: 9002,
	content: {
		host: 'localhost',
		port: 9000
	}
};
try {
	var data = require('./dedicated.json');
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
		hostname: config.content.host,
		port: config.content.port,
		pathname: '/assets'
	});

	sys.Init(assetsUrl, config.gamePort, config.rconPort);
});