<div class="close">×</div>
<h1>Choose a level</h1>
<div class="preview">
	<% if (defaultImg) { %><img src="<%= defaultImg %>" /><% } else { %>&nbsp;<% } %>
</div>
<ul class="levels">
<% _.each(levels, function (level, i) { %>
	<li data-idx="<%- i %>" class="button"><%- level.name %></li>
<% }); %>
</ul>