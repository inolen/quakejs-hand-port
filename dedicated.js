var fs = require('fs');
var requirejs = require('./build/r.js');

// HACK! However, this seems silly to have configurable.
// We want to load the game lib from bin/ for development,
// but from the current directory when ran on a true
// dedicated server.
var modulePath = 'bin/quakejs-dedicated-min';

if (!fs.existsSync(modulePath + '.js')) {
	modulePath = 'quakejs-dedicated-min';
}

function main() {
	requirejs.config({
		nodeRequire: require,
		paths: {
			'system/dedicated/sys': modulePath
		}
	});

	requirejs(['system/dedicated/sys'], function (sys) {
		sys.Init();
	});
}

main();