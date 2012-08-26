(function(q3w) {
  var _eventHandlers = {},
    _events = [];

  q3w.Com_Init = function (canvas, gl) {
    this.Com_InitEventHandlers();
    this.In_Init();
    this.Cl_Init(canvas, gl);
  };

  q3w.Com_InitEventHandlers = function () {
    var eventTypes = this.Com_EventTypes;

    _eventHandlers[eventTypes.EVENT_KEYDOWN] = q3w.Cl_KeyDownEvent;
    _eventHandlers[eventTypes.EVENT_KEYUP] = q3w.Cl_KeyUpEvent;
    _eventHandlers[eventTypes.EVENT_MOUSE] = q3w.Cl_MouseEvent;
  };

  q3w.Com_Frame = function () {
    this.Com_ProcessEvents();
    this.Cl_Frame();
  };

  q3w.Com_ProcessEvents = function () {
    var ev = _events.shift();

    while (ev) {
      var handler = _eventHandlers[ev.type];

      if (!handler) {
        console.error("Could not find handler for event " + ev.type);
        continue;
      }

      handler.call(this, ev);

      ev = _events.shift();
    }
  };

  q3w.Com_QueueEvent = function (ev) {
    _events.push(ev);
  };
})(window.q3w = window.q3w || {});