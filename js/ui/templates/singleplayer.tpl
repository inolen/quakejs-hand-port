<div class="close">×</div>
<% _.each(levels, function (level) { %>
	<img data-name="<%- level.name %>" src="<%= level.url %>" />
<% }); %>