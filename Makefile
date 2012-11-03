.PHONY: jshint browser dedicated assets

#
# Javascript variables
#
JS_OPTIMIZE = optimize=none #uglify
JS_DIR = js
JS_OUT_DIR = dist
JS_TMP_DIR = js_tmp
JS_EJS = $(call rwildcard,$(JS_DIR),*.js.ejs)

BROWSER_R_SCRIPT = build/browser.build.js
BROWSER_R_NAME = system/browser/sys
BROWSER_R_OUT = $(JS_OUT_DIR)/q3-browser-min.js

DEDICATED_R_SCRIPT = build/dedicated.build.js
DEDICATED_R_NAME = system/dedicated/sys
DEDICATED_R_OUT = $(JS_OUT_DIR)/q3-dedicated-min.js

#
# Asset variables
#
ASSET_DIR = baseq3

ASSET_JPG = $(call rwildcard,$(ASSET_DIR),*.jpg)
ASSET_TGA = $(call rwildcard,$(ASSET_DIR),*.tga)
ASSET_DDS = $(subst .jpg,.dds,$(ASSET_JPG)) $(subst .tga,.dds,$(ASSET_TGA))

#
# General helper functions
#
define rwildcard
	$(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2)$(filter $(subst *,%,$2),$d))
endef

#
# Javascript helper functions
#
define create_js_tmp
	mkdir -p $(JS_TMP_DIR)
	cp -r js/* $(JS_TMP_DIR)
endef

define remove_js_tmp
	rm -r $(JS_TMP_DIR)
endef

define preprocess_ejs
	@mkdir -p $(dir $2)
	@node -e "\
		var input = require('fs').readFileSync('$(strip $1)', 'utf8'); \
		var output = require('ejs').render(input, { filename: '$(strip $1)'}); \
		console.log(output)" > $2
endef

define preprocess_all_ejs
	$(foreach f,$1,$(call preprocess_ejs,$(f),$(subst .ejs,,$(f))))
endef

#
# Javascript targets
#
jshint:
	find . -type d \( -name node_modules -o -name dist -o -name vendor \) -prune -o -name '*.js' -print0 | xargs -0 jshint

browser: $(BROWSER_R_SCRIPT) $(JS_EJS)
	$(call create_js_tmp)
	$(call preprocess_all_ejs, $(subst $(JS_DIR)/, $(JS_TMP_DIR)/, $(JS_EJS)))
	@node js/vendor/r.js -o $(BROWSER_R_SCRIPT) baseUrl=$(JS_TMP_DIR) name=$(BROWSER_R_NAME) out=$(BROWSER_R_OUT) $(OPTIMIZE)
	$(call remove_js_tmp)

dedicated: $(DEDICATED_R_SCRIPT) $(JS_EJS)
	$(call create_js_tmp)
	$(call preprocess_all_ejs, $(subst $(JS_DIR)/, $(JS_TMP_DIR)/, $(JS_EJS)))
	@node js/vendor/r.js -o $(DEDICATED_R_SCRIPT) baseUrl=$(JS_TMP_DIR) name=$(DEDICATED_R_NAME) out=$(DEDICATED_R_OUT) $(OPTIMIZE)
	$(call remove_js_tmp)

#
# Asset targets
# 
%.dds: %.tga
	crunch -file $< -rescalemode nearest -fileformat dds -dxt5 -outsamedir

%.dds: %.jpg
	crunch -file $< -rescalemode nearest -fileformat dds -dxt5 -outsamedir

assets: $(ASSET_DDS)