var fpsEl;

function DrawFPS() {
	if (!fpsEl) {
		fpsEl = cl.CreateElement();
	}

	cl.DrawText(fpsEl, 100, 100, 'foobar:' + sys.GetMilliseconds());
}