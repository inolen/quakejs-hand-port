define('renderer/r-image', [], function () {
	return function () {
		var re = this;
		var images = {};

		return {
			InitImages: function () {
				this.BuildWhiteTexture();
				this.BuildDefaultTexture();
			},

			BuildWhiteTexture: function () {
				this.CreateImage('*white', new Uint8Array([255,255,255,255]), 1, 1);
			},

			BuildDefaultTexture: function () {
				var self = this;

				var image =  images['*default'] = Object.create(this.image_t);
				image.imgName = name;

				var el = new Image();
				el.onload = function() {
					image.texnum = self.BuildTexture(el);
				};
				el.src = re.Q3W_BASE_FOLDER + '/webgl/no-shader.png';
			},

			BuildTexture: function (bufferOrImage, width, height, clamp) {
				var gl = this.gl,
					texture = gl.createTexture();

				gl.bindTexture(gl.TEXTURE_2D, texture);
				if (bufferOrImage instanceof Image) {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bufferOrImage);
				} else {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bufferOrImage);
				}
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
				if (clamp) {
					gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				}
				gl.generateMipmap(gl.TEXTURE_2D);

				return texture;
			},

			CreateImage: function (name, buffer, width, height, clamp) {
				var gl = this.gl;

				var image =  images[name] = Object.create(this.image_t);
				image.imgName = name;
				image.texnum = this.BuildTexture(buffer, width, height, clamp);

				return image;
			},

			FindImage: function(name, clamp) {
				var self = this;

				// Try to find the image in our cache.
				var image;
				if ((image = images[name])) {
					return image;
				} else {
					var image =  images[name] = Object.create(this.image_t);
					image.imgName = name;
				}

				// Load the image using the Image() class.
				var el = new Image(),
					retry = true;
				el.onerror = function () {
					if (!retry) return;
					// If we failed to load the .png, try the .jpg (and vice versa)
					var ext = name.indexOf('.png') === -1 ? '.png' : '.jpg';
					name = name.replace(/\.[^\.]+$/, ext);
					retry = false;
					el.src = re.Q3W_BASE_FOLDER + '/' + name;
				};
				el.onload = function() {
					image.texnum = self.BuildTexture(el, null, null, clamp);
				};
				//el.src = re.Q3W_BASE_FOLDER + '/' + name;
				el.src = re.Q3W_BASE_FOLDER + '/' + '/webgl/no-shader.png';

				return image;
			}
		};
	};
});