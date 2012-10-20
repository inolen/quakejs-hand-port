var uil;
var viewportUi;

/**
 * Init
 */
function Init() {	
	var uiContext = sys.GetUIRenderContext();	
	viewportUi = uiContext.handle;

	uil = new UILocals();

	document.addEventListener('fullscreenchange', UpdateFontSizes, false);

	sys.ReadFile('ui/css/font.css', 'utf8', function (err, data) {
		if (err) return err;
		EmbedCSS(data);
	});

	sys.ReadFile('ui/css/views.css', 'utf8', function (err, data) {
		if (err) return err;
		EmbedCSS(data);
	});
}

/**
 * EmbedCSS
 */
function EmbedCSS(data) {
	var head = document.getElementsByTagName('head')[0];
	var el = document.createElement('style');
	el.setAttribute('type', 'text/css');		
	el.appendChild(document.createTextNode(data));
	head.appendChild(el);
}

/**
 * RegisterView
 */
function RegisterView(name) {
	var view = uil.views[name] = new UIView();
	var filename = 'ui/templates/' + name + '.tpl';

	sys.ReadFile(filename, 'utf8', function (err, data) {
		if (err) return;
		view.template = _.template(data);
	});

	view.el = document.createElement('div');
	view.el.id = name;
	view.el.style['display'] = 'none';

	viewportUi.appendChild(view.el);

	return view;
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
 * RenderView
 *
 * Despite it's name, note that this does not immediately render a view.
 * It just sets its state so it's rendered on the next Refresh.
 */
function RenderView(name, model) {
	var view = GetView(name);

	// Make sure this is rendered next Refresh.
	view.visFrame = uil.frameCount;

	// Update the view's data.
	var oldModel = view.model;
	view.model = model;

	// Only refresh if the data has changed.
	view.dirty = !_.isEqual(model, view.oldModel);
}

/**
 * UpdateFontSizes
 *
 * Update base font-size of each child element to be 1/64th of the viewport size.
 * This allows all of our text elements to scale properly with the window.
 */
function UpdateFontSizes() {
	var width = viewportUi.offsetWidth;
	var children = viewportUi.childNodes;

	for (var i = 0; i < children.length; i++) {
		var child = children[i];
		child.style['font-size' ] = (width / 64) + 'px';
	}
}

/**
 * Refresh
 *
 * Show/hide/update all views.
 */
function Refresh() {
	var views = uil.views;

	for (var name in views) {
		if (!views.hasOwnProperty(name)) {
			continue;
		}

		RefreshView(views[name]);
	}

	uil.frameCount++;
}

function RefreshView(view) {
	// Ignore if the template hasn't finished loading.
	if (!view.template) {
		return;
	}

	// If the template wasn't rendered this frame, hide it.
	if (view.visFrame !== uil.frameCount) {
		HideView(view);
		return;
	}

	// Make it visible.
	var el = view.el;
	el.style['display'] = 'block';

	// Re-render if dirty.
	if (view.dirty) {
		var output = view.template(view.model);
		el.innerHTML = output;
	}
}

function HideView(view) {
	view.el.style['display'] = 'none';
}

function ShowView(view) {
	view.el.style['display'] = 'block';
}