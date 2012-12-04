({
	paths: {
		'underscore': 'vendor/underscore',
		'backbone':   'vendor/backbone',
		'jquery':     'vendor/jquery-1.8.2',
		'gameshim':   'vendor/game-shim',
		'glmatrix':   'vendor/gl-matrix',
		'ByteBuffer': 'vendor/byte-buffer'
	},
	shim:  {
		backbone: {
			'deps': ['underscore', 'jquery'],
			'exports': 'Backbone'
		}
	}
})