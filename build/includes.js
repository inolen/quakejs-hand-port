'use strict';

var fs = require('fs');
var path = require('path');

var args = process.argv.slice(2);

// Used by the build process.
if (args.length == 2 && args[0] === '--process') {
	var output = includes(args[1]);
	console.log(output);
	return;
}

function includes(scriptname) {
	var scriptdir = path.dirname(scriptname);
	var text = fs.readFileSync(scriptname, 'utf8');

	// console.log('Processing', scriptname);

	// Replace includes.
	text = text.replace(/(["'\{]{2,})\s+include\s+(.+?)\s+(["'\}]{2,})/g, function(match, open, filename, close) {
		// Process nested includes.
		var includename = path.normalize(scriptdir + '/' + filename);
		var contents = includes(includename);

		// Check to see if the include is being used as a string.
		if ((open.charAt(0) === "'" && close.charAt(close.length-1) === "'") || 
			(open.charAt(0) === '"' && close.charAt(close.length-1) === '"')) {
			// If so, replace newlines and escape quotation marks.
			contents = contents.replace(/[\r\n]+/g, '').replace(/'/g, "\\'");
			contents = "'" + contents + "'";
		}

		return contents;
	});

	return text;
}

module.exports = includes;