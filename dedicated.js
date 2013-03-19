var ejs = require('ejs');
var fs = require('fs');
var path = require('path');
var requirejs = require('requirejs');
var vm = require('vm');

var argv = require('optimist')
	.describe('dev', 'Launch with dev configuration').default('dev', true)
	.argv;

if (argv.h || argv.help) {
	opt.showHelp();
	return;
}

function main() {
	var opts = { nodeRequire: require };

	if (argv.dev) {
		opts.baseUrl = path.join(__dirname, 'lib');
		opts.paths = { 'client/cl': 'stub' };

		// Override default load to support hook in our
		// module pre-processing.
		requirejs.load = preprocessorLoad(requirejs.load);
	} else {
		opts.paths = { 'system/dedicated/sys': 'bin/quakejs-dedicated-min' };
	}

	requirejs.config(opts);

	requirejs(['system/dedicated/sys'], function (sys) {
		sys.Init();
	});
}

function preprocessorLoad(fn) {
	return function (context, moduleName, url) {
		// See if an ejs template exists for this module
		// that we should preprocess
		var ejsPath = url.replace('.js', '.ejs.js');

		if (fs.existsSync(ejsPath)) {
			var data = fs.readFileSync(ejsPath, 'utf8');
			var contents = ejs.render(data, { filename: ejsPath });

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