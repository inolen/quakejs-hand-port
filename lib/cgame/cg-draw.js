var FPS_FRAMES    = 4;
var previousTimes = new Array(FPS_FRAMES);
var previousTime  = 0;
var previousIdx   = 0;

/**
 * UpdateRenderCounters
 */
function UpdateRenderCounts() {
	// We calculate FPS on the client.
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

		cg_hud.setFPS(parseInt(1000 * FPS_FRAMES / total, 10));
	}

	// Grab everything else from the renderer.
	var counts = re.GetCounts();
	cg_hud.setShaders(counts.shaders);
	cg_hud.setVertexes(counts.vertexes);
	cg_hud.setIndexes(counts.indexes);
	cg_hud.setCulledFaces(counts.culledFaces);
	cg_hud.setCulledModelOut(counts.culledModelOut);
	cg_hud.setCulledModelIn(counts.culledModelIn);
	cg_hud.setCulledModelClip(counts.culledModelClip);
}