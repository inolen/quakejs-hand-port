({
	baseUrl: '../lib',
	optimize: 'none',
	paths: {
		'async':                'vendor/async',
		'BitBuffer':            'vendor/bit-buffer',
		'EventEmitter':         'vendor/EventEmitter',
		'glmatrix':             'vendor/gl-matrix',
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