var express = require('express'),
	fs = require('fs'),
	http = require('http'),
	path = require('path');

var arguments = process.argv.splice(2);

// Used by the build process.
if (arguments.length == 2 && arguments[0] === '--processScript') {
	var output = processScript(arguments[1]);
	console.log(output);
	return;
}

function processScript(scriptname) {
	var scriptdir = path.dirname(scriptname);
	var text = fs.readFileSync(scriptname, 'utf8');

	// Replace includes.
	text = text.replace(/(["'\{]{2,})\s+include\s+(.+?)\s+(["'\}]{2,})/g, function(match, open, filename, close) {
		// Process nested includes.
		var contents = processScript(scriptdir + '/' + filename);

		// Check to see if the include is being used as a string.
		if ((open.charAt(0) === "'" && close.charAt(close.length-1) === "'") || 
			(open.charAt(0) === '"' && close.charAt(close.length-1) === '"')) {
			// If so, replace newlines and escape quotation marks.
			contents.replace(/[\r\n]+/g, '').replace(/'/g, "\\'");
			contents = "'" + contents + "'";
		}

		return contents;
	});

	return text;
}

function expressScript(req, res, next) {
	var scriptname = path.normalize(__dirname + req.url);
	var text = processScript(scriptname);
	res.send(text);
}

function main() {
	var app = express();
	var server = http.createServer(app);

	app.use(express.compress({
		filter: function(req, res){
			return /json|text|javascript|octet-stream/.test(res.getHeader('Content-Type'));
		}
	}));
	app.use(express.static(__dirname + '/public', { maxAge: 86400000 }));
	app.use('/bin', express.static(__dirname + '/bin'));
	app.get('*.js', expressScript);

	server.listen(9000);
	
	console.log('Server is now listening on port 9000');
}

main();