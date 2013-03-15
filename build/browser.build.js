({
	baseUrl: '../lib',
	optimize: 'none',
	paths: {
		'async':                'vendor/async',
		'BitBuffer':            'vendor/bit-buffer',
		'DOMEventsLevel3':      'vendor/DOMEventsLevel3.shim',
		'EventEmitter':         'vendor/EventEmitter',
		'GameShim':             'vendor/game-shim',
		'glmatrix':             'vendor/gl-matrix',
		'knockout':             'vendor/knockout-latest',
		'state-machine':        'vendor/state-machine',
		'text':                 'vendor/text',
		'underscore':           'vendor/underscore',
		'cgame/cg':             'cgame/cg.tmp',
		'client/cl':            'client/cl.tmp',
		'clipmap/cm':           'clipmap/cm.tmp',
		'common/com':           'common/com.tmp',
		'game/bg':              'game/bg.tmp',
		'game/gm':              'game/gm.tmp',
		'renderer/re':          'renderer/re.tmp',
		'server/sv':            'server/sv.tmp',
		'sound/snd':            'sound/snd.tmp',
		'system/browser/sys':   'system/browser/sys.tmp',
		'ui/ui':                'ui/ui.tmp'
	},
	stubModules: [
		'text'
	]
})