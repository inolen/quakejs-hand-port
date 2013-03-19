({
	baseUrl: '../lib',
	optimize: 'uglify',
	paths: {
		'cgame/cg':           'cgame/cg.tmp',
		'client/cl':          'client/cl.tmp',
		'clipmap/cm':         'clipmap/cm.tmp',
		'common/com':         'common/com.tmp',
		'game/bg':            'game/bg.tmp',
		'game/gm':            'game/gm.tmp',
		'renderer/re':        'renderer/re.tmp',
		'server/sv':          'server/sv.tmp',
		'sound/snd':          'sound/snd.tmp',
		'system/browser/sys': 'system/browser/sys.tmp',
		'ui/ui':              'ui/ui.tmp'
	},
	shim: {
		'vendor/game-shim': {
			exports: 'GameShim'
		}
	},
	stubModules: [
		'text'
	]
})