var requirejs = require('requirejs');

requirejs.config({
	nodeRequire: require,
	baseUrl: 'js/bin',
	paths: {
		'text':         'vendor/text',
		'underscore':   'vendor/underscore',
		'backbone':     'vendor/backbone',
		'jquery':       'vendor/jquery-1.8.2',
		'glmatrix':     'vendor/gl-matrix',
		'ByteBuffer':   'vendor/byte-buffer',
		'system/sys':   'system/dedicated/sys'
	},
	shim:  {
		backbone: {
			'deps': ['underscore', 'jquery'],
			'exports': 'Backbone'
		}
	}
});

requirejs(['system/sys'], function (sys) {
	sys.Init();
});