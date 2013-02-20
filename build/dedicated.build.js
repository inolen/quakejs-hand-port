({
	baseUrl: '../lib',
	optimize: 'uglify',
	paths: {
		'async':                'vendor/async',
		'BitBuffer':            'vendor/bit-buffer',
		'EventEmitter':         'vendor/EventEmitter',
		'gameshim':             'vendor/game-shim',
		'glmatrix':             'vendor/gl-matrix',
		'jquery':               'vendor/jquery-1.8.2',
		'knockout':             'vendor/knockout-latest',
		'state-machine':        'vendor/state-machine',
		'text':                 'vendor/text',
		'underscore':           'vendor/underscore',
		'client/cl':            'stub',
		'clipmap/cm':           'clipmap/cm.tmp',
		'common/com':           'common/com.tmp',
		'game/bg':              'game/bg.tmp',
		'game/gm':              'game/gm.tmp',
		'server/sv':            'server/sv.tmp',
		'system/dedicated/sys': 'system/dedicated/sys.tmp'
	},
	stubModules: [
		'text'
	]
})