<% _.each(levels, function (level) { %>
	<img data-name="<%- level.name %>" src="<%= level.url %>" />
<% }); %>
<div class="close">Close</div>