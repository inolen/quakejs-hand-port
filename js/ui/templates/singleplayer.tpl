<div class="dialog dialog-abscenter">
	<div class="close">×</div>
	<h1>Choose a level</h1>
	<div class="preview">
		<img src="<%= levels[previewLevel].url %>" />
	</div>
	<ul class="levels">
	<% _.each(levels, function (level, i) { %>
		<li data-idx="<%- i %>" class="menu-item"><%- level.name %></li>
	<% }); %>
	</ul>
</div>