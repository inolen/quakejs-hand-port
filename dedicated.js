var _ = require('underscore');
var url = require('url');
var requirejs = require('./build/r.js');

function main() {
	var cfg = loadConfig();
	launchServer(cfg);
}

function loadConfig() {
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

	return config;
}

function launchServer(cfg) {
	// Format the content server URL.
	var contentUrl = url.format({
		protocol: 'http',
		hostname: cfg.content.host,
		port: cfg.content.port
	});

	requirejs.config({
		nodeRequire: require,
		Release config.
		baseUrl: 'lib',
		paths: {
			'system/dedicated/sys': '../bin/quakejs-dedicated-min'
		}
	});

	requirejs(['system/dedicated/sys'], function (sys) {
		var assetsUrl = contentUrl + '/assets';
		sys.Init(assetsUrl, cfg.gamePort, cfg.rconPort);
	});
}

main();