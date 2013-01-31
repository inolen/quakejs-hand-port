<div id="current-game" class="dialog">
	<div class="tab-heading">
		<span id="current-game">Current game</span>
		<span id="callvote">Call vote</span>
		<span id="settings">Settings</span>
	</div>

	<div class="content">
		<% if (gametype === 'team' || gametype === 'ctf' || gametype === 'ca') { %>
		<div class="teams">
			<h1>Teams</h1>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Players</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Red</td><td>2</td>
					</tr>
					<tr>
						<td>Blue</td><td>5</td>
					</tr>
				</tbody>
			</table>
		</div>
		<% } %>

		<% if (arenas && arenas.length > 1) { %>
		<div class="arenas">
			<h1>Arenas</h1>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Gametype</th>
						<th>Players</th>
					</tr>
				</thead>
				<tbody>
					<% for (var i = 1; i < arenas.length; i++) { %>
					<tr>
						<td><%- arenas[i] %></td><td>Pickup</td><td>2</td>
					</tr>
					<% } %>
				</tbody>
			</table>
		</div>
		<% } %>
	</div>
</div>