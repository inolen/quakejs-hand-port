<div id="team-select">
	<table class="table">
		<thead>
			<tr>
				<th>Team</th>
				<th>Players</th>
			</tr>
		</thead>
		<tbody>
			<!-- ko if: gametype() === 'team' || gametype() === 'ctf' || gametype() === 'nfctf' || gametype() === 'ca' || gametype() === 'ra' -->
			<!-- ko foreach: currentArena().teams -->
			<!-- ko if: count() > 0 -->
			<tr>
				<td data-bind="event: { click: function () { joinTeam(name()); } }"><span data-bind="text: name"></span></td>
				<td data-bind="event: { click: function () { joinTeam(name()); } }, text: count"></td>
			</tr>
			<!-- /ko -->
			<!-- /ko -->
			<!-- /ko -->
			<!-- ko if: gametype() === 'ra' -->
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
				<td data-bind="event: { click: function () { $parent.joinArena($index()); } }, text: numConnectedClients"></td>
			</tr>
		</tbody>
	</table>
</div>