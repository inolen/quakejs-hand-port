<div class="fullscreen" data-bind="attr: { id: title }">
	<script type="text/html" id="tab-pane">
		<div class="tab-pane" data-bind="attr: { id: id }"></div>
	</script>

	<div class="dialog">
		<div class="tabbable">
			<ul class="nav nav-tabs" data-bind="foreach: tabs">
				<li><a data-bind="attr: { href: '#' + id() }, text: title, tab: $index() === 0"></a></li>
			</ul>
			<div class="tab-content" data-bind="template: { name: 'tab-pane', foreach: tabs, afterRender: bindTab }">
			</div>
		</div>
	</div>
</div>