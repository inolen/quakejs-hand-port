var requirejs = require('requirejs');

requirejs.config({
	nodeRequire: require,
	baseUrl: 'js/bin',
	paths: {
		'underscore':   'vendor/underscore',
		'glmatrix':     'vendor/gl-matrix',
		'jsstruct':     'vendor/js-struct',
		'ByteBuffer':   'vendor/byte-buffer',
		'system/sys':   'system/dedicated/sys'
	}
});

requirejs(['system/sys'], function (sys) {
	sys.Init();
});