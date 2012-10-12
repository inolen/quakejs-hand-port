var http = require('http');
var WebSocketServer = require('websocket').server;

var server;

function CreateServer(addr) {
	server = http.createServer(function(request, response) {
		console.log((new Date()) + ' Received request for ' + request.url);
		response.writeHead(404);
		response.end();
	});
	server.listen(9001, function() {
		console.log((new Date()) + ' Server is listening on port 8080');
	});

	var wsServer = new WebSocketServer({
		httpServer: server,
		autoAcceptConnections: false
	});

	function originIsAllowed(origin) {
		return true;
	}

	var test = new EventEmitter();

	wsServer.on('request', function(request) {
		var connection = request.accept('q3js', request.origin);
		console.log((new Date()) + ' Connection accepted.');

		var addr = new NetAdr(NetAdrType.NA_IP, connection.remoteAddress, 0);
		var queue = new Array();

		var foobar = _.extend({
			GetPacket: function () {
				return queue.shift();
			},
			SendPacket: function (ab, length) {
				var buffer = new Buffer(ab.byteLength);
				var view = new Uint8Array(ab);
				for (var i = 0; i < buffer.length; ++i) {
					buffer[i] = view[i];
				}
				connection.sendBytes(buffer);
			}
		}, EventEmitter.prototype);

		test.emitEvent('accept', [addr, foobar]);

		connection.on('message', function (message) {
			queue.push({
				addr: addr,
				buffer: message.binaryData,
				length: message.binaryData.length
			});
		});

		connection.on('close', function(reasonCode, description) {
			console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
		});
	});

	return test;
}

function ConnectToServer(addr) {
	throw new Error('Dedicated server');
}