(function(q3w) {
  q3w.Cl_Init = function (canvas, gl) {
    this.canvas = canvas;
    this.gl = gl;
    this.cl = Object.create(q3w.clientActive_t);

    this.Cl_InitInput();
    this.R_Init(canvas, gl);
  };

  q3w.Cl_Frame = function () {
    var refdef = Object.create(q3w.trRefdef_t);
    refdef.gl = this.gl;

    q3w.Cl_SendCommand();
    q3w.Cl_CalcViewValues(refdef);

    q3w.R_RenderScene(refdef);
  };

  q3w.Cl_CalcViewValues = function (refdef) {
    refdef.x = 0;
    refdef.y = 0;
    refdef.width = this.canvas.width;
    refdef.height = this.canvas.height;
    refdef.fov = 45;
    refdef.origin = [0, 0, 0];
    refdef.angles = this.cl.viewangles;
  };
})(window.q3w = window.q3w || {});