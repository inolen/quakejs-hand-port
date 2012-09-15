define('common/com-main', ['server/sv', 'client/cl'], function (q_sv, q_cl) {
	return function () {
		var q_com = this;

		return {
			Init: function (canvas, gl) {
				q_sv.Init(q_com);
				q_cl.Init(q_com, canvas, gl);

				// Provide the user a way to interface with the client.
				Object.defineProperty(window, '$', {
					get: function () {
						return q_com.CommandGetAll();
					}
				});

				// Main loop.
				function onRequestedFrame(timestamp) {
					window.requestAnimationFrame(onRequestedFrame, canvas);
					q_sv.Frame();
					q_cl.Frame();
				}
				window.requestAnimationFrame(onRequestedFrame, canvas);
			}
		};
	};
});