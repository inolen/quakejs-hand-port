var express = require('express'),
	http = require('http'),
	path = require('path');

function main() {
	var app = express();
	var server = http.createServer(app);

	app.engine('ejs', require('ejs').__express);
	app.use(express.compress({
		filter: function(req, res){
			return /json|text|javascript|octet-stream/.test(res.getHeader('Content-Type'));
		}
	}));
	app.use(express.static(__dirname + '/public', { maxAge: 86400000 }));
	app.use('/lib', express.static(__dirname + '/lib'));
	app.use('/bin', express.static(__dirname + '/bin'));

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
	
	console.log('Server is now listening on port 9000');
}

main();