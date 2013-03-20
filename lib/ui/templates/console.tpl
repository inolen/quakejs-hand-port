<div id="console" data-bind="event: { mousedown: onMouseDown }">
	<ul id="lines" data-bind="foreach: { data: lines, afterRender: scrollToBottom }, scrollable: {}, event: { scroll: onScroll }">
		<li span data-bind="pretty: $data"></li>
	</ul>
	<div id="input" class="input-text" data-bind="textinput: '', hasfocus: ko.observable(true), event: { hasfocus: true, blur: onBlur }"></div>
</div>