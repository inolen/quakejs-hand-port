({
	baseUrl: '../lib',
	optimize: 'none',
	paths: {
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