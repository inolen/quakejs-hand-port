.PHONY: browser dedicated

OPTIMIZE := optimize=uglify
#OPTIMIZE := optimize=none
OUT_DIR := dist
TMP_DIR := js_tmp

define rwildcard
	$(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2)$(filter $(subst *,%,$2),$d))
endef

define create_js_tmp
	mkdir -p $(TMP_DIR)
	cp -r js/* $(TMP_DIR)
endef

define remove_js_tmp
	rm -r $(TMP_DIR)
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

TMP_EJS := $(call rwildcard,$(TMP_DIR),*.js.ejs)

browser:
	$(call create_js_tmp)
	@$(MAKE) browser_finish

browser_finish:
	$(call preprocess_all_ejs, $(TMP_EJS))
	@node js/vendor/r.js -o build/browser.build.js baseUrl=$(TMP_DIR) name=system/browser/sys out=$(OUT_DIR)/q3-browser-min.js $(OPTIMIZE)
	$(call remove_js_tmp)

dedicated:
	$(call create_js_tmp)
	@$(MAKE) dedicated_finish

dedicated_finish:
	$(call preprocess_all_ejs, $(TMP_EJS))
	@node js/vendor/r.js -o build/dedicated.build.js baseUrl=$(TMP_DIR) name=system/dedicated/sys out=$(OUT_DIR)/q3-dedicated-min.js $(OPTIMIZE)
	$(call remove_js_tmp)