<table>
	<thead>
		<tr>
			<th>Name</th>
		</tr>
	</thead>
	<tbody>
	<% _.each(players, function (player) { %>
		<tr>
			<td><%- player.name %></td>
		</tr>
	<% }); %>
</table>