<div id="scoreboard-wrapper">
	<% if (gametype === 'ffa' || gametype === 'tournament' || gametype === 'single') { %>
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Ping</th>
					<th>Score</th>
				</tr>
			</thead>
			<tbody>
				<% for (var i = 0; i < scores.length; i++) { %>
					<tr>
						<td><%- scores[i].clientInfo.name %></td>
						<td><%- scores[i].ping %></td>
						<td><%- scores[i].score %></td>
					</tr>
				<% } %>
			</tbody>
		</table>
	<% } else { %>
		<table class="team-red">
			<thead>
				<tr>
					<th>Name</th>
					<th>Ping</th>
					<th>Score</th>
				</tr>
			</thead>
			<tbody>
				<% for (var i = 0; i < scores.length; i++) { %>
					<% if (scores[i].team !== 1) continue; %>
					<tr>
						<td><%- scores[i].clientInfo.name %></td>
						<td><%- scores[i].ping %></td>
						<td><%- scores[i].score %></td>
					</tr>
				<% } %>
			</tbody>
		</table>

		<table class="team-blue">
			<thead>
				<tr>
					<th>Name</th>
					<th>Ping</th>
					<th>Score</th>
				</tr>
			</thead>
			<tbody>
				<% for (var i = 0; i < scores.length; i++) { %>
					<% if (scores[i].team !== 2) continue; %>
					<tr>
						<td><%- scores[i].clientInfo.name %></td>
						<td><%- scores[i].ping %></td>
						<td><%- scores[i].score %></td>
					</tr>
				<% } %>
			</tbody>
		</table>
	<% } %>
</div>