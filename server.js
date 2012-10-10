var express = require('express'),
	http = require('http'),
	path = require('path'),
	WebSocketServer = require('websocket').server;/*,
	sys = require('./js/system/sys');*/

function createGameServer(server) {
	wsServer = new WebSocketServer({
		httpServer: server,
		autoAcceptConnections: false
	});

	function originIsAllowed(origin) {
		return true;
	}

	wsServer.on('request', function(request) {
		if (!originIsAllowed(request.origin)) {
			// Make sure we only accept requests from an allowed origin
			request.reject();
			console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
			return;
		}

		var connection = request.accept('q3js', request.origin);
		console.log((new Date()) + ' Connection accepted.');
		connection.on('message', function(message) {
			if (message.type === 'utf8') {
				console.log('Received Message: ' + message.utf8Data);
				connection.sendUTF(message.utf8Data);
			}
			else if (message.type === 'binary') {
				console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
				connection.sendBytes(message.binaryData);
			}
		});
		connection.on('close', function(reasonCode, description) {
			console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
		});
	});
}

function main() {
	var app = express();
	var server = http.createServer(app)

	app.engine('ejs', require('ejs').__express);
	app.engine('jade', require('jade').__express);
	app.use(express.static(__dirname));

	// Our build process will pre-process these .ejs views,
	// but if they don't exist we need to build them at runtime.
	app.get('*.js', function (req, res, next) {
		var file = __dirname + req.params[0] + '.js.ejs';

		path.exists(file, function(exists) {
			if (!exists) return next();
			return res.render(file);
		});
	});

	server.listen(9000);

	createGameServer(server);

	console.log('Server is now listening on port 9000');
}

main();