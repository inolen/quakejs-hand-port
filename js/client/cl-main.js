define('client/cl-main', [], function () {
	return function (re, bg) {
		var cl = this;

		return {
			Init: function (canvas, gl) {
				cl.canvas = canvas;
				cl.gl = gl;
				cl.frameTime = cl.oldFrameTime = Date().now;
				cl.frameDelta = 0;
				cl.cla = Object.create(cl.clientActive_t);
				cl.clc = Object.create(cl.clientConnection_t);
				cl.pm = Object.create(bg.pmove_t);
				cl.commands = {};
				cl.keys = {};

				cl.InputInit();
				cl.CommandInit();
				cl.NetInit();
				re.Init(canvas, gl);

				re.LoadMap('q3tourney2');
			},

			Frame: function () {
				cl.oldFrameTime = cl.frameTime;
				cl.frameTime = Date().now;
				cl.frameDelta = cl.frameTime - cl.oldFrameTime;

				//
				cl.NetFrame();

				var refdef = Object.create(re.trRefdef_t);
				cl.SendCommand();
				cl.CalcViewValues(refdef);
				re.RenderScene(refdef);
			},

			CalcViewValues: function (refdef) {
				var cla = cl.cla;
				var pm = cl.pm;

				refdef.x = 0;
				refdef.y = 0;
				refdef.width = cl.canvas.width;
				refdef.height = cl.canvas.height;
				refdef.fov = 45;
				refdef.origin = /*pm.ps.origin ||*/ [0, 0, 0];
				refdef.angles = cla.viewangles;
			}
		};
	};
});