var uil;
var $viewportUI;

var map = {
	'connect':      ConnectView,
	'hud':          HudView,
	'scoreboard':   ScoreboardView,
	'ingame':       IngameMenu,
	'main':         MainMenu,
	'singleplayer': SinglePlayerMenu,
	'multiplayer':  MultiPlayerMenu,
	'settings':     SettingsMenu
};

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'UI:');
	Function.apply.call(console.log, console, args);
}

/**
 * Init
 */
function Init() {
	uil = new UILocals();

	document.addEventListener('fullscreenchange', ScaleElements);
	window.addEventListener('resize', ScaleElements);

	//
	var context = imp.sys_GetUIContext();
	$viewportUI = $(context);

	// Reset the UI container.
	$viewportUI.empty();
	ScaleElements();

	// Embed our CSS.
	var css = [viewsCss, normalizeCss];

	for (var i = 0; i < css.length; i++) {
		var $style = $('<style>', { 'type': 'text/css'}).append(css[i]);
		$style.appendTo('head');
	}

	// 
	InitMenus();
	InitViews();
}

/**
 * Shutdown
 */
function Shutdown() {
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