var _ = require('underscore');
var url = require('url');
var requirejs = require('./build/r.js');

function main() {
	var cfg = loadConfig();
	launchServer(cfg.gamePort, cfg.rconPort, cfg.content.host, cfg.content.port);
}

function loadConfig() {
	var cfg = {
		gamePort: 9001,
		rconPort: 9002,
		content: {
			host: 'localhost',
			port: 9000
		},
		masters: [
			'master.quakejs.com'
		]
	};
	try {
		var data = require('./dedicated.json');
		_.extend(config, data);
	} catch (e) {
	}

	return cfg;
}

function launchServer(gamePort, rconPort, contentHost, contentPort) {
	// Format the content server URL.
	var contentUrl = url.format({
		protocol: 'http',
		hostname: contentHost,
		port: contentPort
	});

	requirejs.config({
		nodeRequire: require,
		baseUrl: 'lib',
		paths: {
			'system/dedicated/sys': '../bin/quakejs-dedicated-min'
		}
	});

	requirejs(['system/dedicated/sys'], function (sys) {
		var assetsUrl = contentUrl + '/assets';
		sys.Init(assetsUrl, gamePort, rconPort);
	});
}

main();