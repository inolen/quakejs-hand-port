define('client/cl-main', [], function () {
	return function (q_r, q_bg) {
		return {
			Init: function (q_com, canvas, gl) {
				this.q_com = q_com;

				this.canvas = canvas;
				this.gl = gl;
				this.frameTime = this.oldFrameTime = Date().now;
				this.frameDelta = 0;
				this.cl = Object.create(this.clientActive_t);
				this.clc = Object.create(this.clientConnection_t);
				this.pm = Object.create(q_bg.pmove_t);
				this.commands = {};
				this.keys = {};

				this.InputInit();
				this.NetInit();
				q_r.Init(canvas, gl);

				//this.Cmd_LoadMap('q3tourney2');
			},

			Frame: function () {
				this.oldFrameTime = this.frameTime;
				this.frameTime = Date().now;
				this.frameDelta = this.frameTime - this.oldFrameTime;

				//
				this.NetFrame();

				var refdef = Object.create(q_r.trRefdef_t);
				this.SendCommand();
				this.CalcViewValues(refdef);
				q_r.RenderScene(refdef);
			},

			CalcViewValues: function (refdef) {
				var cl = this.cl;
				var pm = this.pm;

				refdef.x = 0;
				refdef.y = 0;
				refdef.width = this.canvas.width;
				refdef.height = this.canvas.height;
				refdef.fov = 45;
				refdef.origin = /*pm.ps.origin ||*/ [0, 0, 0];
				refdef.angles = cl.viewangles;
			}
		};
	};
});