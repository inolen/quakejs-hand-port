<p data-bind="if: lobby()">
	Welcome! You're currently in the lobby. Select an arena from below or run through a portal to join an arena and get started fragging.
</p>
<p data-bind="if: rocketarena() && !lobby()">
	Currently on team <span data-bind="text: currentTeamName"></span> in <span data-bind="text: currentArena().name"></span>. You can change your team or arena by selecting one from below.
</p>

<div id="team-select" data-bind="if: !rocketarena() || (rocketarena() && !lobby())">
	<table class="table">
		<thead>
			<tr>
				<th>Name</th>
				<th>Players</th>
			</tr>
		</thead>
		<tbody>
			<!-- ko if: gametype() === 'team' || gametype() === 'ctf' || gametype() === 'nfctf' || (gametype() === 'ca' && !rocketarena()) || (gametype() === 'ca' && rocketarena() && currentArena().playersPerTeam() === 0) -->
			<tr>
				<td data-bind="event: { click: function () { joinTeam('red'); } }"><span class="red">RED</span></td>
				<td data-bind="event: { click: function () { joinTeam('red'); } }, text: currentArena().count1"></td>
			</tr>
			<tr>
				<td data-bind="event: { click: function () { joinTeam('blue'); } }"><span class="blue">BLUE</span></td>
				<td data-bind="event: { click: function () { joinTeam('blue'); } }, text: currentArena().count2"></td>
			</tr>
			<!-- /ko -->
			<!-- ko if: gametype() === 'ca' && rocketarena() && currentArena().playersPerTeam() !== 0 -->
			<tr>
				<td data-bind="event: { click: createTeam }" colspan="2">Create team</td>
			</tr>
			<!-- /ko -->
		</tbody>
	</table>
</div>

<div id="arena-select" data-bind="if: arenas().length > 1">
	<table class="table">
		<thead>
			<tr>
				<th>Arena</th>
				<th>Gametype</th>
				<th>Players</th>
			</tr>
		</thead>
		<tbody data-bind="foreach: arenas">
			<tr data-bind="visible: $index() !== 0">
				<td data-bind="event: { click: function () { $parent.joinArena($index()); } }, text: name"></td>
				<td data-bind="event: { click: function () { $parent.joinArena($index()); } }, text: type"></td>
				<td data-bind="event: { click: function () { $parent.joinArena($index()); } }, text: numClients"></td>
			</tr>
		</tbody>
	</table>
</div>