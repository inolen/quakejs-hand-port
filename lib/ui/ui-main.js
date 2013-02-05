var $viewportUI = null;
var $ptr        = null;
var styles      = [];    // styles we've pushed into the head element
var frameCount  = 0;
var views       = {};
var activeMenus = [];    // active view stack
var hoverEls    = null;  // currently hovered element
var focusEl     = null;  // currently focused element
var mx          = 0;     // mouse x
var my          = 0;     // mouse y
var vw          = 0;     // viewport width
var vh          = 0;     // viewport height
var images      = null;

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
		styles.push($style);
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
	for (var i = 0; i < styles.length; i++) {
		var $style = styles[i];
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
	var views = views;

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
		if (view.visFrame !== frameCount) {
			HideView(view);
			continue;
		}

		ShowView(view);
	}

	frameCount++;
}