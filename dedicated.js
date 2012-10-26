var requirejs = require('requirejs');

requirejs.config({
	nodeRequire: require,
	baseUrl: 'js/bin',
	paths: {
		'client/cl':    'stub',
		'ui/ui':        'stub',
		'underscore':   'vendor/underscore',
		'glmatrix':     'vendor/gl-matrix',
		'ByteBuffer':   'vendor/byte-buffer',
		'system/sys':   'system/dedicated/sys'
	}
});

requirejs(['system/sys'], function (sys) {
	sys.Init();
});