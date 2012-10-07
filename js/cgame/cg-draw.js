var FPS_FRAMES    = 4;
var fpsElement    = null;
var previousTimes = new Array(FPS_FRAMES);
var previousTime  = 0;
var previousIdx   = 0;

function DrawFPS() {
	var t = sys.GetMilliseconds();
	var frameTime = t - previousTime;
	previousTime = t;

	previousTimes[previousIdx % FPS_FRAMES] = frameTime;
	previousIdx++;

	if (previousIdx > FPS_FRAMES) {
		// average multiple frames together to smooth changes out a bit
		var total = 0;

		for (var i = 0; i < FPS_FRAMES; i++) {
			total += previousTimes[i];
		}

		if (!total) {
			total = 1;
		}

		var fps = parseInt(1000 * FPS_FRAMES / total);

		if (!fpsElement) {
			fpsElement = cl.CreateElement();
		}
		
		cl.DrawText(fpsElement, cg.refdef.width - 48, 5, fps + 'fps');
	}
}