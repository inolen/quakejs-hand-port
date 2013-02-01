<% var rocketarena = arenas && arenas.length > 1 && gametype === 'ca'; %>

<div id="ingame-dialog" class="dialog">
	<div class="tab-heading">
		<span id="current-game">Current game</span>
		<span id="callvote">Call vote</span>
		<span id="settings">Settings</span>
	</div>

	<div class="content">
		<% if (rocketarena && currentArenaNum === 0) { %>
			<p>
				Welcome! You're currently in the lobby. Select an arena from below or run through a portal to join an arena and get started fragging.
			</p>
		<% } %>

		<% if (arenas && currentArenaNum !== null && (gametype === 'team' || gametype === 'ctf' || gametype === 'ca') &&
			(!rocketarena || (rocketarena && currentArenaNum !== 0))) { %>
		<div class="teams tabset">
			<div class="tabset-heading">Teams</div>
			<div class="tabset-content">
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Players</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Red</td><td><%- arenas[currentArenaNum].count1 %></td><td><span class="join-team" data-team="red">JOIN</span></td>
						</tr>
						<tr>
							<td>Blue</td><td><%- arenas[currentArenaNum].count2 %></td><td><span class="join-team" data-team="blue">JOIN</span></td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
		<% } %>

		<% if (arenas && arenas.length > 1) { %>
		<div class="arenas tabset">
			<div class="tabset-heading">Arenas</div>
			<div class="tabset-content">
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Gametype</th>
							<th>Players</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						<% for (var i = 1; i < arenas.length; i++) { %>
						<% var arena = arenas[i]; %>
						<tr>
							<td><%- arena.name %></td><td>Pickup</td><td>2</td><td><span class="join-arena" data-arena="<%- i %>">JOIN</span></td>
						</tr>
						<% } %>
					</tbody>
				</table>
			</div>
		</div>
		<% } %>
	</div>
</div>