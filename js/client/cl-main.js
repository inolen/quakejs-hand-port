define('client/cl-main', [], function () {
	return function (re, bg) {
		var cl = this;

		function Init(canvas, gl) {
			cl.canvas = canvas;
			cl.gl = gl;
			cl.frameTime = cl.oldFrameTime = Date().now;
			cl.frameDelta = 0;
			cl.cla = Object.create(cl.ClientActive);
			cl.clc = Object.create(cl.ClientConnection);
			cl.pm = Object.create(bg.Pmove);
			cl.commands = {};
			cl.keys = {};

			cl.InputInit();
			cl.CmdInit();
			cl.NetInit();
			re.Init(canvas, gl);

			re.LoadMap('q3tourney2');
		}

		function Frame() {
			cl.oldFrameTime = cl.frameTime;
			cl.frameTime = Date().now;
			cl.frameDelta = cl.frameTime - cl.oldFrameTime;

			//
			cl.NetFrame();

			var refdef = Object.create(re.ReRefDef);
			cl.SendCommand();
			cl.CalcViewValues(refdef);
			re.RenderScene(refdef);
		}

		function MapLoading() {
			cl.NetConnect('localhost', 9000);
		}

		function CalcViewValues(refdef) {
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

		return {
			Init: Init,
			Frame: Frame,
			MapLoading: MapLoading,
			CalcViewValues: CalcViewValues
		};
	};
});