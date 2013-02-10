<div data-bind="visible: visible, attr: { id: title }">
	<script type="text/html" id="tab-pane">
		<div class="tab-pane" data-bind="attr: { id: id }"></div>
	</script>

	<div class="dialog">
		<ul class="sections" data-bind="foreach: tabs">
			<li><a data-bind="attr: { href: '#' + id() }, text: title, tab: $index() === 0"></a></li>
		</ul>

		<div class="content" data-bind="template: { name: 'tab-pane', foreach: tabs, afterRender: bindTab }">
		</div>
	</div>
</div>