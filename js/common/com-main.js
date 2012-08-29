(function(q3w) {
  var _eventHandlers = {},
    _events = [];

  q3w.Com_Init = function (canvas, gl) {
    this.frameTime = this.oldFrameTime = Date().now;
    this.frameDelta = 0;

    this.Com_InitEventHandlers();
    this.In_Init();
    this.Cl_Init(canvas, gl);
  };

  q3w.Com_InitEventHandlers = function () {
    var eventTypes = this.inputEventTypes;

    _eventHandlers[eventTypes.EVENT_KEYDOWN] = q3w.Cl_KeyDownEvent;
    _eventHandlers[eventTypes.EVENT_KEYUP] = q3w.Cl_KeyUpEvent;
    _eventHandlers[eventTypes.EVENT_MOUSEMOVE] = q3w.Cl_MouseMoveEvent;
  };

  q3w.Com_Frame = function () {
    this.oldFrameTime = this.frameTime;
    this.frameTime = Date().now;
    this.frameDelta = this.frameTime - this.oldFrameTime;

    this.Com_EventLoop();
    this.Cl_Frame();
  };

  q3w.Com_EventLoop = function () {
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
    ev.time = Date().now;
    _events.push(ev);
  };
})(window.q3w = window.q3w || {});