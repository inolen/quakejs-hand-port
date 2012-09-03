define('common/com-main', [], function () {
	return function (q_cl) {
		return {
			Init: function (canvas, gl) {
				this.frameTime = this.oldFrameTime = Date().now;
				this.frameDelta = 0;

				q_cl.Init(canvas, gl);
			},

			Frame: function () {
				this.oldFrameTime = this.frameTime;
				this.frameTime = Date().now;
				this.frameDelta = this.frameTime - this.oldFrameTime;

				q_cl.Frame();
			}
		};
	};
});