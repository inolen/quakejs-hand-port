var http = require('http');
var express = require('express');

var port = 8080;
var contentPort = 9000;

function main() {
	//
	// Get the available network addresses.
	//
	var details = getNetworkAddresses();

	if (!details) {
		console.log('No network addresses found.');
		return;
	}

	console.log('Found', details.length, 'network addresses:');
	for (var i = 0; i < details.length; i++) {
		console.log('\t' + details[i].address + ' (internal: ' + details[i].internal + ')');
	}

	//
	// Find the first external IP address, otherwise, use
	// the first internal address.
	//
	var address;

	for (var i = 0; i < details.length; i++) {
		if (!details[i].internal) {
			address = details[i].address;
			break;
		}
	}
	if (!address) {
		address = details[0].address;
	}

	console.log('Using:\n\t' + address);

	//
	// Create a content server on localhost at contentPort.
	//
	createContentServer(contentPort);

	//
	// Create the example server passing it the local network
	// address to use as the content server address.
	//
	createExampleServer(port, address, contentPort);
}

function getNetworkAddresses() {
	var interfaces = require('os').networkInterfaces();
	var addresses = [];

	for (k in interfaces) {
		var device = interfaces[k];

		for (k2 in device) {
			var details = device[k2];

			if (details.family === 'IPv4') {
				addresses.push(details);
			}
		}
	}

	return addresses.length ? addresses : null;
}

function createContentServer(port) {
	return require('../content').createServer(port);
}

function createExampleServer(port, contentHost, contentPort) {
	var app = express();

	app.set('views', __dirname);
	app.set('view engine', 'ejs');

	app.use(express.static(__dirname));
	app.use(function (req, res, next) {
		res.locals.content = {
			host: contentHost,
			port: contentPort
		};

		res.render('index');
	});

	var server = http.createServer(app);
	server.listen(port, function () {
		console.log('Example server is now listening on port', server.address().address, server.address().port);
	});

	return server;
}

main();