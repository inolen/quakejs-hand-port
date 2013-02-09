<div id="scoreboard-wrapper">
	<% if (gametype === 'ffa' || gametype === 'tournament') { %>
		<div class="scores">
			<div class="team team-free">
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Ping</th>
							<th>Score</th>
						</tr>
					</thead>
					<tbody>
						<% for (var i = 0; i < scores.free.length; i++) { %>
							<% var score = scores.free[i]; %>
							<tr>
								<td><%- score.clientInfo.name %></td>
								<td><%- score.ping %></td>
								<td><%- score.score %></td>
							</tr>
						<% } %>
					</tbody>
				</table>
			</div>
		</div>
	<% } else { %>
		<div class="summary">
			<% if (score1 > score2) { %>
				Red team leads Blue, <%- score1 %> to <%- score2 %>
			<% } else if (score2 > score1) { %>
				Blue team leads red, <%- score2 %> to <%- score1 %>
			<% } else { %>
				Teams are tied, <%- score1 %> to <%- score2 %>
			<% } %>
		</div>

		<div class="scores">
			<div class="team team-red">
				<div class="header">
					<span class="status"><span class="player" data-image="icons/player.png">&nbsp;</span> <%- scores.red.length %></span> Red Team
				</div>
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Ping</th>
							<th>Score</th>
						</tr>
					</thead>
					<tbody>
						<% for (var i = 0; i < scores.red.length; i++) { %>
							<% var score = scores.red[i]; %>
							<tr<% if (score.dead) { %> class="dead"<% } %>>
								<td><%- score.clientInfo.name %></td>
								<td><%- score.ping %></td>
								<td><%- score.score %></td>
							</tr>
						<% } %>
					</tbody>
				</table>
			</div>

			<div class="team team-blue">
				<div class="header">
					<span class="status"><span class="player" data-image="icons/player.png">&nbsp;</span> <%- scores.blue.length %></span> Blue Team
				</div>
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Ping</th>
							<th>Score</th>
						</tr>
					</thead>
					<tbody>
						<% for (var i = 0; i < scores.blue.length; i++) { %>
							<% var score = scores.blue[i]; %>
							<tr<% if (score.dead) { %> class="dead"<% } %>>
								<td><%- score.clientInfo.name %></td>
								<td><%- score.ping %></td>
								<td><%- score.score %></td>
							</tr>
						<% } %>
					</tbody>
				</table>
			</div>
		</div>
	<% } %>

	<div class="spectators">
		<div class="header">Spectators</div>
		<ul>
		<% for (var i = 0; i < scores.spectator.length; i++) { %>
			<% var score = scores.spectator[i]; %>
			<li><%- score.clientInfo.name %></li>
		<% } %>
		</ul>
	</div>
</div>