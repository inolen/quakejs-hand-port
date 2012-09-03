/*(function(q3w) {
  var cvars = {};

  function Cvar(defaultValue, changeCallback) {
    var currentValue = defaultValue;

    return function (newValue) {
      this.modified = false;

      if (arguments.length) {
        var oldValue = currentValue;
        currentValue = newValue;
        this.modified = true;
        //if (changeCallback) changeCallback(currentValue, oldValue);
      } else {
        return currentValue;
      }
    };
  }

  q3w.Cvar_Init = function () {
    this.CvarAdd('r_fullscreen', 0);
  };

  q3w.Cvar_Add = function (name, defaultValue) {
    var cvar = new Cvar(defaultValue);
    cvars[name] = cvar;
    return cvar;
  };

  q3w.Cvar_Get = function (name) {
    return cvars[name];
  };
})(window.q3w = window.q3w || {});*/
/*define('common/com-cvar', ['common/com'], function (q_com) {
  return q_com;
});*/