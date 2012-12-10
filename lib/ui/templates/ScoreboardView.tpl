<table>
	<thead>
		<tr>
			<th>Name</th>
			<th>Time</th>
			<th>Score</th>
		</tr>
	</thead>
	<tbody>
		<% for (var i = 0; i < scores.length; i++) { %>
			<tr>
				<td><%- scores[i].clientInfo.name %></td>
				<td><%- scores[i].time %></td>
				<td><%- scores[i].score %></td>
			</tr>
		<% } %>
	</tbody>
</table>
