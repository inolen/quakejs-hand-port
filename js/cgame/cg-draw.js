var FPS_FRAMES    = 4;
var previousTimes = new Array(FPS_FRAMES);
var previousTime  = 0;
var previousIdx   = 0;

/**
 * UpdateFPS
 */
function UpdateFPS() {
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

		cg_hud.setFPS(parseInt(1000 * FPS_FRAMES / total));
	}

	return 0;
}