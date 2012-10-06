function CreateElement() {
	var el = document.createElement('div');

	el.setAttribute('style', 'display: none;');

	viewportUi.appendChild(el);

	return el;
}

function DeleteElement(el) {
	el.parentNode.removeChild(element);
}

function DrawText(el, x, y, str) {
	el.setAttribute('style', 'position: absolute; top: ' + y + 'px; left: ' + x + 'px;');
	el.innerHTML = str;
}

// TODO This needs to be called before rendering each scene
// It should toggle non drawn to elements display.
function UpdateInterfaceSurfaces() {
}