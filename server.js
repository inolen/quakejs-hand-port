var express = require('express');
var fs = require('fs');
var http = require('http');
var path = require('path');

var gameRoot = __dirname;
var includes = require(gameRoot + '/build/includes.js');

function main() {
	var app = express();
	var server = http.createServer(app);

	app.use(express.compress());

	// Static files for the web project.
	app.use(express.static(__dirname + '/public'));

	// Pre-compiled JS files.
	app.use('/bin', express.static(gameRoot + '/bin'));

	// Source JS files that need to be processed.
	app.get('/lib/*.js', function (req, res, next) {
		var scriptname = path.normalize(gameRoot + req.url);
		var text = includes(scriptname);
		res.send(text);
	});

	server.listen(9000);
	
	console.log('Server is now listening on port 9000');
}

main();