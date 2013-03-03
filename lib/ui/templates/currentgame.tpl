<!-- ko if: gametype() === 'team' || gametype() === 'ctf' || gametype() === 'nfctf' || gametype() === 'clanarena' || gametype() === 'rocketarena' -->
<div id="team-select">
	<table class="table">
		<thead>
			<tr>
				<th>Team</th>
				<th>Players</th>
			</tr>
		</thead>
		<tbody>
			<!-- ko if: gametype() === 'team' || gametype() === 'ctf' || gametype() === 'nfctf' || gametype() === 'clanarena' -->
			<tr>
				<td data-bind="event: { click: function () { joinTeam('red'); } }"><span class="red">RED</span></td>
				<td data-bind="event: { click: function () { joinTeam('red'); } }, text: currentArena().score1().count"></td>
			</tr>
			<tr>
				<td data-bind="event: { click: function () { joinTeam('blue'); } }"><span class="blue">BLUE</span></td>
				<td data-bind="event: { click: function () { joinTeam('blue'); } }, text: currentArena().score2().count"></td>
			</tr>
			<!-- /ko -->

			<!-- ko if: gametype() === 'rocketarena' -->
			<!-- ko foreach: currentArena().groups -->
			<tr>
				<td data-bind="event: { click: function () { $parent.joinTeam(name()); } }"><span data-bind="text: name"></span></td>
				<td data-bind="event: { click: function () { $parent.joinTeam(name()); } }, text: count() === $parent.currentArena().playersPerTeam() ? 'FULL' : count() + ' / ' + $parent.currentArena().playersPerTeam()"></td>
			</tr>
			<!-- /ko -->
			<tr>
				<td data-bind="event: { click: createTeam }" colspan="2">Create team</td>
			</tr>
			<!-- /ko -->
		</tbody>
	</table>
</div>
<!-- /ko -->

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
				<td data-bind="event: { click: function () { $parent.joinArena($index()); } }, text: numConnectedClients"></td>
			</tr>
		</tbody>
	</table>
</div>