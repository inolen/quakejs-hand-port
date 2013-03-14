<!-- ko if: gametype() === 'ffa' -->
<div class="header">
	<h2 data-bind="text: mapname"></h2>

	<div class="meta">
		<span class="label">Fraglimit <span data-bind="text: fraglimit"></span></span>
		<span class="label">Timelimit <span data-bind="text: timelimit"></span></span>
	</div>
</div>

<p>This is a <span class="white">Free For All</span> game. The object being to frag anything that moves, the match will end when the fraglimit is hit or time runs out.</p>

<a class="btn btn-join-match" href="javascript:void(0)" data-bind="visible: spectator, event: { click: function () { joinTeam('f'); } }">Join Match</a>

<div class="footer">
	<a class="btn btn-leave-match" href="javascript:void(0)" data-bind="event: { click: function () { disconnect(); } }">Leave Match</a>
	<span>Join the match to begin playing</span>
	<a class="btn btn-spectate" href="javascript:void(0)" data-bind="event: { click: function () { joinTeam('s'); } }">Spectate</a>
</div>
<!-- /ko -->

<!-- ko if: gametype() === 'tournament' -->
<h2>Tournament</h2>
<p>Players fight each other one-on-one, while future foes watch as spectators. The watchers wait their turns to be the challenger who wrests control of arena from the most recent victor.</p>
<!-- /ko -->

<!-- ko if: isTeamGame() -->
<div id="team-select">
	<table class="table">
		<thead>
			<tr>
				<th>Team</th>
				<th>Players</th>
			</tr>
		</thead>
		<tbody>
			<!-- ko if: gametype() !== 'rocketarena' -->
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
			<tr data-bind="css: { localplayer: $parent.currentGroup() === name() }">
				<td data-bind="event: { click: function () { $parent.joinTeam(name()); } }"><span data-bind="text: name"></span></td>
				<td data-bind="event: { click: function () { $parent.joinTeam(name()); } }, text: count() === $parent.currentArena().playersPerTeam() ? 'FULL' : count() + ' / ' + $parent.currentArena().playersPerTeam()"></td>
			</tr>
			<!-- /ko -->
			<tr>
				<td data-bind="visible: currentGroup() === null, event: { click: createTeam }" colspan="2">Create team</td>
				<td data-bind="visible: currentGroup() !== null, event: { click: leaveTeam }" colspan="2">Leave team</td>
			</tr>
			<!-- /ko -->
		</tbody>
	</table>
</div>
<!-- /ko -->

<!-- ko if: arenas().length > 1 -->
<div data-bind="text: arenas().length"></div>
<div id="arena-select">
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
				<td data-bind="event: { click: function () { $parent.joinArena($index()); } }, text: count"></td>
			</tr>
		</tbody>
	</table>
</div>
<!-- /ko -->