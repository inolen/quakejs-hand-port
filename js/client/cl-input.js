(function(q3w) {
  q3w.Cl_InitInput = function () {
    // Add commands like +/- forward and what not.
  };

  /**
   * Process current input variables into userComamnd_t struct for transmission to server.
   */
  q3w.Cl_SendCommand = function () {
    this.Cl_GetCommand();
  };

  q3w.Cl_GetCommand = function () {
    var cmd = Object.create(q3w.usercmd_t);
    this.Cl_MouseMove(cmd);
  };

  q3w.Cl_MouseMove = function (cmd) {
    var cl = this.cl,
      oldAngles = cl.viewangles;

    cl.viewangles[1] += cl.mouseX * 0.0022;
    while (cl.viewangles[1] < 0)
        cl.viewangles[1] += Math.PI*2;
    while (cl.viewangles[1] >= Math.PI*2)
        cl.viewangles[1] -= Math.PI*2;

    cl.viewangles[0] += cl.mouseY * 0.0022;
    while (cl.viewangles[0] < -Math.PI*0.5)
        cl.viewangles[0] = -Math.PI*0.5;
    while (cl.viewangles[0] > Math.PI*0.5)
        cl.viewangles[0] = Math.PI*0.5;

    // reset
    cl.mouseX = 0;
    cl.mouseY = 0;

    cmd.angles = cl.viewangles;
  };

  /**
   * Responses to input layer events.
   */
  q3w.Cl_KeyDownEvent = function (ev) {
  };

  q3w.Cl_KeyUpEvent = function (ev) {
  };

  q3w.Cl_MouseEvent = function (ev) {
    var cl = this.cl;
    cl.mouseX += ev.deltaX;
    cl.mouseY += ev.deltaY;
  };
})(window.q3w = window.q3w || {});