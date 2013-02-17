define(['text'], function (text) {
	var includeRegex = /include\('(.+?)'\)/g;

	var process = function (name, req, callback) {
		var self = this;
		var url = req.toUrl(name);

		text.get(url, function (data) {
			// Find all of the includes for this file.
			var matches = [];
			var match;

			while ((match = includeRegex.exec(data)) !== null) {
				matches.push(match);
			}

			// Early out if no files were found.
			if (matches.length === 0) {
				callback(data);
			}

			// Replace the include markup for all matches.
			var done = 0;

			for (var i = 0; i < matches.length; i++) {
				(function (match) {
					var name2 = match[1];
					var url2 = req.toUrl(name2);

					// Replace include markup with file contents.
					text.get(url2, function (data2) {
						data = data.replace(match[0], data2);

						if (++done === matches.length) {
							callback(data);
						}
					});
				})(matches[i]);
			}
		});
	};

	return {
		load: function (name, req, load, config) {
			process(name, req, function (data) {
				if (config.isBuild) {
					buildMap[name] = data;
				}

				load.fromText(name, data);
			});
		}
	};
});