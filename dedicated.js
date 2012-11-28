var requirejs = require('requirejs');

requirejs.config({
	nodeRequire: require,
	baseUrl: 'lib',
	paths: {
		// 'underscore':           'vendor/underscore',
		// 'glmatrix':             'vendor/gl-matrix',
		// 'ByteBuffer':           'vendor/byte-buffer',
		// 'client/cl':            'stub',
		'system/dedicated/sys': '../bin/q3-dedicated-min'
	}
});

requirejs(['system/dedicated/sys'], function (sys) {
	sys.Init();
});