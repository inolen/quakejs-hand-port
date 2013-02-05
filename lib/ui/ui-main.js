var uil;
var $viewportUI;

/**
 * log
 */
function log() {
	CL.Log.apply(this, arguments);
}

/**
 * error
 */
function error(str) {
	CL.Error(str);
}

/**
 * Init
 */
function Init(callback) {
	uil = new UILocals();

	log('Initializing');

	document.addEventListener('fullscreenchange', ScaleElements);
	window.addEventListener('resize', ScaleElements);

	//
	var context = SYS.GetUIContext();
	$viewportUI = $(context);

	// Reset the UI container.
	$viewportUI.empty();
	ScaleElements();

	// Embed our CSS.
	for (var i = 0; i < cssIncludes.length; i++) {
		var $style = $('<style>', { 'type': 'text/css'}).append(cssIncludes[i]);

		// Append to page.
		$style.appendTo('head');

		// Store for cleanup.
		uil.styles.push($style);
	}

	//
	InitImages();
	InitMenus();

	callback();
}

/**
 * Shutdown
 */
function Shutdown() {
	log('Shutdown');

	// Clean up and clear input handlers.
	PopAllMenus();

	// Remove our CSS.
	for (var i = 0; i < uil.styles.length; i++) {
		var $style = uil.styles[i];
		$style.remove();
	}

	// TODO Kill any pending image deferreds.
}

/**
 * Render
 *
 * Show/hide/update all views.
 */
function Render() {
	var views = uil.views;

	// Add active menu to view render list.
	var activeMenu = PeekMenu();
	if (activeMenu) {
		RenderView(activeMenu);
	}

	// Render any other views the client has requested.
	for (var name in views) {
		if (!views.hasOwnProperty(name)) {
			continue;
		}

		var view = views[name];

		// Hide the view if it's not active this frame.
		if (view.visFrame !== uil.frameCount) {
			HideView(view);
			continue;
		}

		ShowView(view);
	}

	uil.frameCount++;
}