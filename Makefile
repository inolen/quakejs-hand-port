default:

protocol:
	~/protojs/pbj js/common/protocol/Net.pbj js/common/protocol/Net.pbj.js

%.js: %.js.ejs
	node preprocess.js $< $@

.PHONY: protocol