var uil;
var viewportUi;

function Init() {	
	var uiContext = sys.GetUIRenderContext();	
	viewportUi = uiContext.handle;

	uil = new UILocals();

	document.addEventListener('fullscreenchange', UpdateFontSizes, false);
	UpdateFontSizes();
}

function UpdateFontSizes() {
	var width = viewportUi.offsetWidth;
	var children = viewportUi.childNodes;

	for (var i = 0; i < children.length; i++) {
		var child = children[i];
		child.style['font-size' ] = (width / 64) + 'px';
	}
}

function GetView(name) {
	var view = uil.views['hud'];

	if (!view) {
		view = RegisterView(name);
	}

	return view;
}

function RegisterView(name) {
	var view = uil.views['hud'] = new UIView();
	var filename = 'templates/' + name + '.tpl';

	sys.ReadFile(filename, 'utf8', function (err, data) {
		if (err) return;
		view.template = _.template(data);
	});

	view.el = document.createElement('div');
	view.el.id = name;
	view.el.style['display'] = 'none';

	viewportUi.appendChild(view.el);

	//
	UpdateFontSizes();

	return view;
}

function DrawHud(model) {
	var view = GetView('hud');

	// Template may still be async loading.
	if (!view.template) {
		return;
	}

	// Don't re-render if the data hasn't changed.
	if (_.isEqual(model, view.oldModel)) {
		return;
	}

	// Make it visible.
	var el = view.el;
	el.style['display'] = 'block';

	// Render it.
	var output = view.template(model);
	el.innerHTML = output;

	view.oldModel = model;
}