var requirejs = require('requirejs');

requirejs.config({
	nodeRequire: require,
	baseUrl: 'js/bin'
});

requirejs(['system/dedicated/sys'], function (sys) {
	console.log(sys);
	sys.Init();
});