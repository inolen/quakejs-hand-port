<% var rocketarena = arenas && arenas.length > 1 && gametype === 'ca'; %>
<%
	var teamcolor = 'white';
	if (team === 'RED') {
		teamcolor = 'red';
	} else if (team === 'BLUE') {
		teamcolor = 'blue';
	}
%>

<% if (rocketarena) { %>
	<% if (arenaNum === 0) { %>
		<p>
			Welcome! You're currently in the lobby. Select an arena from below or run through a portal to join an arena and get started fragging.
		</p>
	<% } else { %>
		<p>
			Currently on team <span class="<%- teamcolor %>"><%- team %></span> in <span class="yellow"><%- arenas[arenaNum].name %></span>. You can change your team or arena by selecting one from below.
		</p>
	<% } %>
<% } %>

<% if (arenas && arenaNum !== null && (gametype === 'team' || gametype === 'ctf' || gametype === 'ca') &&
	(!rocketarena || (rocketarena && arenaNum !== 0))) { %>
<div id="team-select">
	<table class="table">
		<thead>
			<tr>
				<th>Name</th>
				<th>Players</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td class="join-team" data-team="red"><span class="red">RED</span></td>
				<td class="join-team" data-team="red"><%- arenas[arenaNum].count1 %></td>
			</tr>
			<tr>
				<td class="join-team" data-team="blue"><span class="blue">BLUE</span></td>
				<td class="join-team" data-team="blue"><%- arenas[arenaNum].count2 %></td>
			</tr>
		</tbody>
	</table>
</div>
<% } %>

<% if (arenas && arenas.length > 1) { %>
<div id="arena-select">
	<table class="table">
		<thead>
			<tr>
				<th>Arena</th>
				<th>Gametype</th>
				<th>Players</th>
			</tr>
		</thead>
		<tbody>
			<% for (var i = 1; i < arenas.length; i++) { %>
			<% var arena = arenas[i]; %>
			<tr>
				<td class="join-arena" data-arena="<%- i %>"><%- arena.name %></td>
				<td class="join-arena" data-arena="<%- i %>"><%- arena.playersPerTeam === 0 ? 'Pickup' : arena.playersPerTeam + 'v' + arena.playersPerTeam %></td>
				<td class="join-arena" data-arena="<%- i %>"><%- arena.numPlayingClients %></td>
			</tr>
			<% } %>
		</tbody>
	</table>
</div>
<% } %>