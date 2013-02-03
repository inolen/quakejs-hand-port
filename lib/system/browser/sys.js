
/*global setMatrixArrayType: true */

define('system/browser/sys',
['underscore', 'gameshim', 'glmatrix', 'common/qshared', 'common/com'],
function (_, gameshim, glmatrix, QS, COM) {
	var cssIncludes = [
		'{{ include css/main.css }}',
		'{{ include css/normalize.css }}'
	];

	{{ include ../sys-defines.js }}
	{{ include ../sys-file.js }}
	{{ include sys-main.js }}
	{{ include sys-file.js }}
	{{ include sys-input.js }}
	{{ include sys-net.js }}

	return {
		Init: Init
	};
});
