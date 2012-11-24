/**
 * InitViews
 */
function InitViews() {
	// The render event is triggered by child views when they've been re-rendered.
	// When that happens, we need to update centered elements.
	$viewportUI.on('qk_render', '.view', function () {
		UpdateCenteredElements($(this));
	});
}

/**
 * GetView
 */
function GetView(name) {
	var view = uil.views[name];

	if (!view) {
		view = RegisterView(name);
	}

	return view;
}

/**
 * RegisterView
 */
function RegisterView(name) {
	var view = uil.views[name] = new map[name](GetViewExports());

	// Add view class to all views.
	view.$el.addClass('view');

	// Append view to container.
	$viewportUI.append(view.$el);
	
	// Hide by default.
	HideView(view);

	return view;
}

/**
 * GetViewExports
 */
function GetViewExports() {
	return {
		sys_ReadFile:           imp.sys_ReadFile,
		
		com_GetCvarVal:         imp.com_GetCvarVal,
		com_SetCvarVal:         imp.com_SetCvarVal,
		com_LoadConfig:         imp.com_LoadConfig,
		com_SaveConfig:         imp.com_SaveConfig,
		com_ExecuteBuffer:      imp.com_ExecuteBuffer,
		
		cl_Bind:                imp.cl_Bind,
		cl_UnbindAll:           imp.cl_UnbindAll,
		cl_GetKeyNamesForCmd:   imp.cl_GetKeyNamesForCmd,
		cl_CaptureInput:        imp.cl_CaptureInput,
		cl_Disconnect:          imp.cl_Disconnect,

		ui_GetImageByHandle:    GetImageByHandle,
		ui_RegisterImage:       RegisterImage,
		ui_LoadImagesInElement: LoadImagesInElement,
		ui_PushMenu:            PushMenu,
		ui_PopMenu:             PopMenu,
		ui_PopAllMenus:         PopAllMenus
	};
}

/**
 * RenderView
 */
function RenderView(view) {
	if (view instanceof String) {
		view = RegisterView(view);
	}

	// Update visFrame so the main render can show active views.
	view.visFrame = uil.frameCount;
}

/**
 * ShowView
 */
function ShowView(view) {
	var visible = view.el.style.display !== 'none';

	if (!visible) {
		view.$el.show();

		// Let's make sure the view has the most up to date font sizes
		// as it may have not been visible on the last resize.
		UpdateCenteredElements(view.$el);
		UpdateFontSizes(view.$el);
	}
}

/**
 * HideView
 */
function HideView(view) {
	var visible = view.el.style.display !== 'none';

	if (visible) {
		view.$el.hide();
	}
}

/**
 * ScaleElements
 * 
 * Update cached viewport sizes as well as font-sizes for all views.
 */
function ScaleElements() {
	uil.vw = $viewportUI.width();
	uil.vh = $viewportUI.height();

	var views = uil.views;

	for (var name in views) {
		if (!views.hasOwnProperty(name)) {
			continue;
		}

		UpdateCenteredElements(views[name].$el);
		UpdateFontSizes(views[name].$el);
	}
}

/**
 * UpdateCenteredElements
 */
function UpdateCenteredElements($el) {
	var $centered = $el.find('.abscenter');

	$centered.css({
		position: 'absolute',
		margin: 0,
		top: uil.vh / 2 - $centered.outerHeight() / 2,
		left: uil.vw / 2 - $centered.outerWidth() / 2
	});
}

/**
 * UpdateFontSizes
 *
 * Update base font-size of view to be 1/100th of the viewport size.
 * This allows all of our text elements to scale properly with the window.
 */
function UpdateFontSizes($el) {
	$el.css('font-size', (uil.vw / 100) + 'px');
}