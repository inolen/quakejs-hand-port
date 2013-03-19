var fs = require('fs');
var httpsync = require('httpsync');
var requirejs = require('requirejs');
var vm = require('vm');

var argv = require('optimist')
	.describe('config', 'Location of the configuration file').default('config', './dedicated.json')
	.describe('dev', 'Launch with dev configuration').default('dev', true)
	.argv;

if (argv.h || argv.help) {
	opt.showHelp();
	return;
}

function main() {
	var opts = { nodeRequire: require };

	if (argv.dev) {
		var config = loadConfig();

		opts.baseUrl = 'http://' + config.content.host + ':' + config.content.port + '/lib';
		opts.paths = {
			'client/cl': 'stub'
		};

		// Override default load to support loading these
		// modules from the content server. This means we
		// don't need to recompile the bin when launching
		// the dedicated server during dev.
		requirejs.load = loadHTTP(requirejs.load);
	} else {
		opts.paths = {
			'system/dedicated/sys': 'bin/quakejs-dedicated-min'
		};
	}

	requirejs.config(opts);

	requirejs(['system/dedicated/sys'], function (sys) {
		sys.Init();
	});
}

/**
 * Development use only.
 */
function loadConfig() {
	var config = {
		content: {
			host: 'localhost',
			port: 9000
		}
	};
	try {
		console.log('Loading config file from ' + argv.config + '..');
		var data = require(argv.config);
		_.extend(config, data);
	} catch (e) {
	}

	return config;
}

function loadHTTP(fn) {
	return function (context, moduleName, url) {
		var req = httpsync.get(url);
		var res = req.end();

		if (res.statusCode === 200) {
			var contents = res.data.toString('utf8');

			contents = this.makeNodeWrapper(contents);

			try {
				vm.runInThisContext(contents, url);

				context.completeLoad(moduleName);
				return;
			} catch (e) {
			}
		}

		return fn(context, moduleName, url);
	};
}

main();