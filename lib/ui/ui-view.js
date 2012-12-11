/**
 * GetViewConstructor
 */
function GetViewConstructor(name) {
	switch (name) {
		case 'connect':      return ConnectView;
		case 'hud':          return HudView;
		case 'scoreboard':   return ScoreboardView;
		case 'ingame':       return IngameMenu;
		case 'main':         return MainMenu;
		case 'singleplayer': return SinglePlayerMenu;
		case 'multiplayer':  return MultiPlayerMenu;
		case 'settings':     return SettingsMenu;
		default:             throw Error('Unsupported view');
	}
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
	var ctor = GetViewConstructor(name);

	// Create the element for the view and append
	// to the container.
	var $el = $('<div />', { id: name })
		.appendTo($viewportUI);

	// Create the view with the new element.
	var view = uil.views[name] = new ctor({ el: $el });
	
	// Hide by default.
	HideView(view);

	return view;
}

/**
 * RenderView
 */
function RenderView(view) {
	if (typeof(view) === 'string') {
		view = GetView(view);
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
	var $centerx = $el.find('.centerx');
	var $centery = $el.find('.centery');

	// Bind fake recenter event so views can force a recenter.
	$centerx.not('.centerx-bound').addClass('centerx-bound').bind('recenter', function () {
		var $this = $(this);
		var $parent = $this.offsetParent();
		var left = ($parent.outerWidth() / 2) - ($this.outerWidth() / 2);

		$this.css({
			position: 'absolute',
			left: left
		});
	});

	$centery.not('.centery-bound').addClass('centery-bound').bind('recenter', function () {
		var $this = $(this);
		var $parent = $this.offsetParent();
		var top = ($parent.outerHeight() / 2) - ($this.outerHeight() / 2);

		$this.css({
			position: 'absolute',
			top: top
		});
	});

	// Force recenter.
	$centerx.add($centery).trigger('recenter');
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
 * UIView
 *
 * This is the default Backbone view with the render
 * function shimmed to make the view integrate with our UI.
 */
var UIView = Backbone.View.extend({
	render: function () {
		this.renderView();
		this._postRender();
	},
	_postRender: function () {
		var self = this;
		
		this.$el.find('[data-image], [data-himage]').each(function () {
			RegisterComponent(AsyncImage, this);
		});

		this.$el.on('qk_click', '[data-toggle="tab"]', function () {
			var tab = RegisterComponent(Tab, this);
			tab.show();
			
			tab.trigger('recenter');
		});

		this.$el.find('.input-range').each(function () {
			RegisterComponent(RangeInput, this);
		});

		this.$el.find('.input-key').each(function () {
			RegisterComponent(KeyInput, this);
		});

		this.$el.find('.input-text').each(function () {
			RegisterComponent(TextInput, this);
		});

		UpdateCenteredElements(this.$el);
		UpdateFontSizes(this.$el);
	}
});