<table>
	<thead>
		<tr>
			<th>Team</th>
			<th>Name</th>
			<th>Ping</th>
			<th>Score</th>
		</tr>
	</thead>
	<tbody>
		<% for (var i = 0; i < scores.length; i++) { %>
			<tr>
				<td><%- scores[i].team %></td>
				<td><%- scores[i].clientInfo.name %></td>
				<td><%- scores[i].ping %></td>
				<td><%- scores[i].score %></td>
			</tr>
		<% } %>
	</tbody>
</table>
