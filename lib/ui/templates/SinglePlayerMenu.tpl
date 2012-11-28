<div class="background fullscreen">
	<div class="dialog abscenter">
		<h3>Choose a level</h3>
		<div class="level-select-wrapper">
			<div class="preview">
			<% _.each(levels, function (level, i) { %>
				<div class="preview-image" data-himage="<%- level.himage %>" <% if (i === 0) { %>style="display: block;"<% } %>></div>
			<% }); %>
			</div>
			<ul class="levels">
			<% _.each(levels, function (level, i) { %>
				<li class="menu-item"><%- level.name %></li>
			<% }); %>
			</ul>
		</div>
		<div class="footer">
			<div class="button back">Back</div>
		</div>
	</div>
</div>
