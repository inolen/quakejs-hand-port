var requirejs = require('requirejs');

requirejs.config({
	nodeRequire: require,
	baseUrl: 'js',
	paths: {
		'client/cl':            'stub',
		'ui/ui':                'stub',
		'underscore':           'vendor/underscore',
		'glmatrix':             'vendor/gl-matrix',
		'ByteBuffer':           'vendor/byte-buffer',
		'system/dedicated/sys': '../bin/q3-dedicated-min'
	}
});

requirejs(['system/dedicated/sys'], function (sys) {
	sys.Init();
});