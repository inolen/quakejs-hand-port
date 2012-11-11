<div class="background fullscreen">
	<div class="dialog dialog-abscenter">
		<h1>Choose a level</h1>
		<div class="level-select-wrapper">
			<div class="preview">
				<img src="<%= levels[previewLevel].url %>" />
			</div>
			<ul class="levels">
			<% _.each(levels, function (level, i) { %>
				<li data-idx="<%- i %>" class="menu-item"><%- level.name %></li>
			<% }); %>
			</ul>
		</div>
		<div class="footer">
			<div class="button back">Back</div>
		</div>
	</div>
</div>