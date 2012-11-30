var express = require('express'),
	fs = require('fs'),
	http = require('http'),
	path = require('path');

var arguments = process.argv.splice(2);
var gameRoot = path.normalize(__dirname + '/../game');

// Used by the build process.
if (arguments.length == 2 && arguments[0] === '--processScript') {
	var output = processScript(arguments[1]);
	console.log(output);
	return;
}

function processScript(scriptname) {
	var scriptdir = path.dirname(scriptname);
	var text = fs.readFileSync(scriptname, 'utf8');

	// console.log('Processing', scriptname);

	// Replace includes.
	text = text.replace(/(["'\{]{2,})\s+include\s+(.+?)\s+(["'\}]{2,})/g, function(match, open, filename, close) {
		// Process nested includes.
		var includename = path.normalize(scriptdir + '/' + filename);
		var contents = processScript(includename);

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

function main() {
	var app = express();
	var server = http.createServer(app);

	app.use(express.compress({
		filter: function(req, res){
			return /json|text|javascript|octet-stream/.test(res.getHeader('Content-Type'));
		}
	}));

	// Static files for the web project.
	app.use(express.static(__dirname + '/public', { maxAge: 86400000 }));

	// Pre-compiled JS files.
	app.use('/bin', express.static(gameRoot + '/bin'));

	// Source JS files that need to be processed.
	app.get('/lib/*.js', function (req, res, next) {
		var scriptname = path.normalize(gameRoot + req.url);
		var text = processScript(scriptname);
		res.send(text);
	});

	server.listen(9000);
	
	console.log('Server is now listening on port 9000');
}

main();