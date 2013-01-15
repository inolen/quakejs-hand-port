({
	paths: {
		'async':        'vendor/async',
		'backbone':     'vendor/backbone',
		'ByteBuffer':   'vendor/byte-buffer',
		'EventEmitter': 'vendor/EventEmitter',
		'gameshim':     'vendor/game-shim',
		'glmatrix':     'vendor/gl-matrix',
		'jquery':       'vendor/jquery-1.8.2',
		'underscore':   'vendor/underscore',
	},
	shim:  {
		backbone: {
			'deps': ['underscore', 'jquery'],
			'exports': 'Backbone'
		}
	}
})