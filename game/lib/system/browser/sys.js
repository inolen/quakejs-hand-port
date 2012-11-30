define('system/browser/sys',
['underscore', 'common/sh', 'common/com'],
function (_, sh, com) {
	// Use the following namespaces.
	var using = _.extend({},
		sh.constants,
		com.enums
	);
	for (var key in using) {
		if (using.hasOwnProperty(key)) {
			eval('var ' + key + ' = using[key];');
		}
	}
	
	{{ include ../sys-defines.js }}
	{{ include sys-main.js }}
	{{ include sys-file.js }}
	{{ include sys-input.js }}
	{{ include sys-net.js }}
	
	return {
		Init: Init
	};
});
