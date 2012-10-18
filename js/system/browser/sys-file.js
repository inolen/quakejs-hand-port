function ReadFile(path, encoding, callback) {
	var binary = encoding === 'binary';

	var request = new XMLHttpRequest();
	request.open('GET', Q3W_BASE_FOLDER + '/' + path, true);

	if (binary) {
		request.setRequestHeader('Content-Type', 'application/octet-stream');
		request.responseType = 'arraybuffer';
	} else {
		request.setRequestHeader('Content-Type', 'text/plain');
	}

	request.addEventListener('load', function () {
		if (request.readyState !== 4 || request.status !== 200) {
			return callback(new Error('ReadFile received response code ' + request.readyState));
		}

		return callback(null, binary ? request.response : request.responseText);
	});
	request.send(null);
}