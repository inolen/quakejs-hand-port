var opt = require('optimist');
var requirejs = require('./build/r.js');
var url = require('url');

var argv = opt
	.usage('Launch a dedicated quakejs server.\nUsage: $0')
	.describe('filecdn', 'CDN root for files').default('filecdn', 'http://content.quakejs.com')
	.argv;

if (argv.h || argv.help) {
	opt.showHelp();
	return;
}

function main() {
	requirejs.config({
		nodeRequire: require,
		baseUrl: 'lib',
		paths: {
			'system/dedicated/sys': '../bin/quakejs-dedicated-min'
		}
	});

	requirejs(['system/dedicated/sys'], function (sys) {
		sys.Init(argv.filecdn);
	});
}

main();