<div id="#singleplayer" class="dialog">
	<div class="dialog-heading">
		<div class="dialog-title">Single player</div>
	</div>

	<div class="level-select-wrapper">
		<div class="preview">
		<% _.each(levels, function (level, i) { %>
			<div class="preview-image" data-image="<%- level.imagePath %>" <% if (i === 0) { %>style="display: block;"<% } %>></div>
		<% }); %>
		</div>
		<ul class="levels">
		<% _.each(levels, function (level, i) { %>
			<li class="menu-item"><%- level.name %></li>
		<% }); %>
		</ul>
	</div>
</div>