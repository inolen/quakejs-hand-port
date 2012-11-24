/**
 * InitViews
 */
function InitViews() {
	// The render event is triggered by child views when they've
	// been re-rendered.
	// TODO Remove this. It'd be nice if perhaps this could be part of
	// our own base view class, but passing that do to view modules would
	// be troublesome.
	$viewportUI.on('qk_render', 'div', function () {
		PostProcessView($(this));
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

	// Append view to container.
	$viewportUI.append(view.$el);

	// Don't post-process until after it's been appended (and therefor has a width/height).
	PostProcessView(view.$el);
	
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

/**
 * PostProcessView
 *
 * View post-processing function ran after each successful render.
 */
function PostProcessView($el) {
	$el.find('[data-image], [data-himage]').each(function () {
		RegisterComponent(Img, this);
	});

	$el.on('qk_click', '[data-toggle="tab"]', function () {
		var tab = RegisterComponent(Tab, this);
		tab.show();
	});

	$el.find('.input-range').each(function () {
		RegisterComponent(RangeInput, this);
	});

	$el.find('.input-key').each(function () {
		RegisterComponent(KeyInput, this);
	});

	$el.find('.input-text').each(function () {
		RegisterComponent(TextInput, this);
	});

	UpdateCenteredElements($el);
	UpdateFontSizes($el);
}