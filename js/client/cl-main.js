(function(q3w) {
  q3w.Cl_Init = function (canvas, gl) {
    this.canvas = canvas;
    this.gl = gl;
    this.cl = Object.create(q3w.clientActive_t);
    this.pm = Object.create(q3w.pmove_t);

    this.Cl_InitInput();
    this.R_Init(canvas, gl);

    this.Cl_LoadMap('q3tourney2');
  };

  q3w.Cl_Frame = function () {
    var refdef = Object.create(q3w.trRefdef_t);
    refdef.gl = this.gl;

    q3w.Cl_SendCommand();
    q3w.Cl_CalcViewValues(refdef);

    q3w.R_RenderScene(refdef);
  };

  q3w.Cl_CalcViewValues = function (refdef) {
    var cl = this.cl;
    var pm = this.pm;

    refdef.x = 0;
    refdef.y = 0;
    refdef.width = this.canvas.width;
    refdef.height = this.canvas.height;
    refdef.fov = 45;
    refdef.origin = /*pm.ps.origin ||*/ [0, 0, 0];
    refdef.angles = cl.viewangles;
  };

  q3w.Cl_LoadMap = function (mapName) {
    this.R_LoadMap(mapName);
  };
})(window.q3w = window.q3w || {});