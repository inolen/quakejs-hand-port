var requirejs = require('requirejs');

requirejs.config({
	nodeRequire: require,
	baseUrl: 'js/bin',
	paths: {
		'underscore':   'vendor/underscore',
		'EventEmitter': 'vendor/EventEmitter',
		'glmatrix':     'vendor/gl-matrix',
		'jsstruct':     'vendor/js-struct',
					'ByteBuffer':   'vendor/byte-buffer'
	}
});

requirejs(['system/dedicated/sys'], function (sys) {
	console.log(sys);
	sys.Init();
});