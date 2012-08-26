(function(q3w) {
  var CMD_BACKUP = 64;

  q3w.clientActive_t = {
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
  };
})(window.q3w = window.q3w || {});