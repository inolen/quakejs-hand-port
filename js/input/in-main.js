(function(q3w) {
  q3w.In_Init = function () {
    var self = this;

    // TODO: Should pass this in as some sort of context.
    var viewportFrame = document.getElementById('viewport-frame');

    document.addEventListener('keydown', function (ev) { self.In_KeyDown(ev); });
    document.addEventListener('keyup', function (ev) { self.In_KeyUp(ev); });
    viewportFrame.addEventListener('mousemove', function (ev) { self.In_MouseMove(ev); });
  };

  q3w.In_Frame = function () {
    // TODO: Magic.
  };

  q3w.In_KeyDown = function (ev) {
    this.Com_QueueEvent({ type: this.Com_EventTypes.EVENT_KEYDOWN, keyCode: ev.keyCode });
  };

  q3w.In_KeyUp = function (ev) {
    this.Com_QueueEvent({ type: this.Com_EventTypes.EVENT_KEYUP, keyCode: ev.keyCode });
  };

  var _lastPageX = 0, _lastPageY = 0;
  q3w.In_MouseMove = function (ev) {
    var deltaX, deltaY;

    if (document.pointerLockElement) {
      deltaX = ev.movementX;
      deltaY = ev.movementY;
    } else {
      deltaX = ev.pageX - _lastPageX;
      deltaY = ev.pageY - _lastPageY;
      _lastPageX = ev.pageX;
      _lastPageY = ev.pageY;
    }

    this.Com_QueueEvent({ type: this.Com_EventTypes.EVENT_MOUSE, deltaX: deltaX, deltaY: deltaY });
  };
})(window.q3w = window.q3w || {});