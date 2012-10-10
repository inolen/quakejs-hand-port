var ejs = require('ejs');
var fs = require('fs');

var src = process.argv[2];
var dest = process.argv[3];

if (!src) {
	console.log('No source path specified');
	return;
} else if (!dest) {
	console.log('No destination path specified');
	return;	
}

// Read in the src file and process includes.
var input = fs.readFileSync(src, 'utf8');
var output = ejs.render(input, { filename: src });

fs.writeFileSync(dest, output, 'utf8');