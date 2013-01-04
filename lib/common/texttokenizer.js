define('common/texttokenizer', [], function () {

var TextTokenizer = function (src) {
	// Strip out comments
	src = src.replace(/\/\/.*$/mg, ''); // C++ style (//...)
	src = src.replace(/\/\*[^*\/]*\*\//mg, ''); // C style (/*...*/) (Do the shaders even use these?)

	// Split everything by whitespace, grouping quoted
	// sections together.
	this.tokens = [];

	var tokenizer = /([^\s\n\r\"]+)|"([^\"]+)"/mg;
	var match;
	while ((match = tokenizer.exec(src)) !== null) {
		this.tokens.push(match[1] || match[2]);
	}

	this.offset = 0;
};

TextTokenizer.prototype.EOF = function() {
	if (this.tokens === null) { return true; }
	var token = this.tokens[this.offset];
	while(token === '' && this.offset < this.tokens.length) {
		this.offset++;
		token = this.tokens[this.offset];
	}
	return this.offset >= this.tokens.length;
};

TextTokenizer.prototype.next = function() {
	if (this.tokens === null) { return; }
	var token = '';
	while(token === '' && this.offset < this.tokens.length) {
		token = this.tokens[this.offset++];
	}
	return token;
};

TextTokenizer.prototype.prev = function() {
	if (this.tokens === null) { return; }
	var token = '';
	while(token === '' && this.offset >= 0) {
		token = this.tokens[this.offset--];
	}
	return token;
};

return TextTokenizer;

});