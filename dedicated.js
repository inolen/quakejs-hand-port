var _ = require('underscore');
var url = require('url');
var requirejs = require('./build/r.js');

function main() {
	requirejs.config({
		nodeRequire: require,
		baseUrl: 'lib',
		paths: {
			'system/dedicated/sys': '../bin/quakejs-dedicated-min'
		}
	});

	requirejs(['system/dedicated/sys'], function (sys) {
		sys.Init();
	});
}

main();