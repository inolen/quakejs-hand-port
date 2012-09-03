define('client/cl-main', [], function () {
	return function (q_shared, q_r, q_bg) {
		return {
			clientActive_t: {
				mouseX: 0,
				mouseY: 0,

				/*usercmd_t cmds[CMD_BACKUP]; // each mesage will send several old cmds
				int       cmdNumber;        // incremented each frame, because multiple
																		// frames may need to be packed into a single packet*/

				// the client maintains its own idea of view angles, which are
				// sent to the server each frame.  It is cleared to 0 upon entering each level.
				// the server sends a delta each frame which is added to the locally
				// tracked view angles to account for standing on rotating objects,
				// and teleport direction changes
				viewangles: [0, 0, 0]
			},

			keyState_t: {
				active: false,
				downtime: 0,
				partial: 0,
				binding: null
			},

			Init: function (canvas, gl) {
				this.canvas = canvas;
				this.gl = gl;
				this.cl = Object.create(this.clientActive_t);
				this.pm = Object.create(q_bg.pmove_t);
				this.commands = {};
				this.keys = {};

				this.InitInput();
				q_r.Init(canvas, gl);

				this.LoadMap('q3tourney2');
			},

			Frame: function () {
				var refdef = Object.create(q_r.trRefdef_t);
				refdef.gl = this.gl;

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
			},

			LoadMap: function (mapName) {
				q_r.LoadMap(mapName);
			}
		};
	};
});