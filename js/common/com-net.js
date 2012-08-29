(function(q3w) {
  q3w.Cvar_Init = function () {
    this.CvarAdd('r_fullscreen', 0);
  };

  q3w.Cvar_Add = function (name, defaultValue/*, changeCallback*/) {
    var cvar = new Cvar(defaultValue/*, changeCallback*/);
    cvars[name] = cvar;
    return cvar;
  };

  q3w.Cvar_Get = function (name) {
    return cvars[name];
  };
})(window.q3w = window.q3w || {});