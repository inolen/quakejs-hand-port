var express = require('express'),
	http = require('http'),
	socketio = require('socket.io');

function createGameServer(server) {
	var io = socketio.listen(server);

	io.sockets.on('connection', function (socket) {
		socket.emit('news', { hello: 'world' });
		socket.on('my other event', function (data) {
			console.log(data);
		});
	});
}

function main() {
	var app = express();
	var server = http.createServer(app)

	app.use(express.static(__dirname));
	app.use(express.directory(__dirname));
	server.listen(9000);

	createGameServer(server);

	console.log('Server is now listening on port 9000');
}

main();