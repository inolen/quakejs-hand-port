.PHONY: modules protocol

#default: modules protocol

###########################################################
# Build the cgame, game and sys modules. We're being
# overzealous with our dependencies, but alas, KISS.
###########################################################
ALL_MODULES = \
	js/cgame/cg.js \
	js/client/cl.js \
	js/clipmap/cm.js \
	js/common/com.js \
	js/game/bg.js \
	js/game/gm.js \
	js/server/sv.js \
	js/renderer/re.js \
	js/ui/ui.js \
	js/system/browser/sys.js \
	js/system/dedicated/sys.js \
	js/vendor/byte-buffer.js \
	js/vendor/gl-matrix.js \
	js/vendor/underscore.js

ALL_MODULES_OUT = $(subst js/,js/bin/, $(ALL_MODULES))

define preprocess_ejs_includes
	@mkdir -p $(dir $2)
	@node -e "\
		var input = require('fs').readFileSync('$(strip $1)', 'utf8'); \
		var output = require('ejs').render(input, { filename: '$(strip $1)'}); \
		console.log(output)" > $2
endef

# Preprocess EJS files
js/bin/%.js: js/%.js.ejs
	$(call preprocess_ejs_includes, $<, $@)

# Just copy regular files
js/bin/%.js: js/%.js
	@mkdir -p $(dir $@)
	cp $< $@

#define optimize
#	@node r.js -o name=$(strip $1) out=$(strip $2) baseUrl=js
#endef

modules: $(ALL_MODULES_OUT)