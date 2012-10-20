var uil;
var viewportUi;

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

function EmbedCSS(data) {
	var head = document.getElementsByTagName('head')[0];
	var el = document.createElement('style');
	el.setAttribute('type', 'text/css');		
	el.appendChild(document.createTextNode(data));
	head.appendChild(el);
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
	var view = uil.views[name];

	if (!view) {
		view = RegisterView(name);
	}

	return view;
}

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

	//
	UpdateFontSizes();

	return view;
}

function RenderView(name, model) {
	var view = GetView(name);

	if (!view.template || _.isEqual(model, view.oldModel)) {
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