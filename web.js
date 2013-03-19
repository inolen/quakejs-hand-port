var express = require('express');
var http = require('http');
var path = require('path');

var argv = require('optimist')
	.describe('config', 'Location of the configuration file').default('config', './web.json')
	.argv;

if (argv.h || argv.help) {
	opt.showHelp();
	return;
}

function main() {
	var config = loadConfig();

	var app = express();

	app.set('views', path.join(__dirname, 'web'));
	app.set('view engine', 'ejs');

	app.use(express.static(path.join(__dirname, 'web')));
	app.use(function (req, res, next) {
		res.locals.content = {
			host: config.content.host,
			port: config.content.port
		};

		res.render('index');
	});

	var server = http.createServer(app);
	server.listen(config.port, function () {
		console.log('Example web server is now listening on port', server.address().address, server.address().port);
	});

	return server;
}

function loadConfig() {
	var config = {
		port: 8080,
		content: {
			host: getMostVisibleAddress(),
			port: 9000
		}
	};
	try {
		console.log('Loading config file from ' + argv.config + '..');
		var data = require(argv.config);
		_.extend(config, data);
	} catch (e) {
	}

	return config;
}

/**
 * Most people will use the content server on their local
 * machine for dev work. However, if they want someone to
 * hit their web server to play a quick match, we want to
 * try and, by default, use the most public IP we can find
 * so that the connecting player can resolve their content
 * server properly
 */
function getMostVisibleAddress() {
	// Get the available network addresses.
	var details = getNetworkAddresses();

	if (!details) {
		console.log('No network addresses found.');
		return;
	}

	console.log('Found', details.length, 'network addresses:');
	for (var i = 0; i < details.length; i++) {
		console.log('\t' + details[i].address + ' (internal: ' + details[i].internal + ')');
	}

	// Find the first external IP address, otherwise, use
	// the first internal address.
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

	return address;
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

main();