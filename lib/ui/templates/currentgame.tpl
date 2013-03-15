<div class="header">
	<h2 data-bind="text: mapname"></h2>
	<div class="meta">
		<!-- ko if: (gametype() === 'ffa' || gametype() === 'tournament' || gametype() === 'team') && fraglimit() > 0 -->
		<span class="label">Fraglimit <span data-bind="text: fraglimit"></span></span>
		<!-- /ko -->
		<!-- ko if: (gametype() === 'ctf' || gametype() === 'nfctf') && capturelimit() > 0 -->
		<span class="label">Capturelimit <span data-bind="text: capturelimit"></span></span>
		<!-- /ko -->
		<!-- ko if: timelimit() > 0 -->
		<span class="label">Timelimit <span data-bind="text: timelimit"></span></span>
		<!-- /ko -->
	</div>
</div>

<!-- ko if: !isTeamGame() -->
<!-- ko if: gametype() === 'ffa' -->
<p>This is a <span class="white">Free For All</span> game. The object being to frag anything that moves, the match will end when the fraglimit is hit or time runs out.</p>
<!-- /ko -->

<!-- ko if: gametype() === 'tournament' -->
<p>This is a <span class="white">Tournament</span> game. Players fight each other one-on-one, while future opponents wait for their turn as spectators.</p>
<!-- /ko -->

<a class="btn btn-yellow" href="javascript:void(0)" data-bind="visible: spectator, event: { click: function () { joinTeam('f'); } }">Join Match</a>
<!-- /ko -->

<!-- ko if: isTeamGame() -->

<!-- ko if: gametype() === 'team' -->
<p>This is a <span class="white">Team Deathmatch</span> game. Pick a team and help lead them to victory. The winning team is the team who hits the frag limit first, or the team with the highest score when the time limit is hit.</p>
<!-- /ko -->

<!-- ko if: gametype() === 'ctf' -->
<p>This is a <span class="white">Capture The Flag</span> game. Grab your enemies flag and bring it back and touch your own flag. The winning team is the team who hits the capture limit first, or the team with the highest score when the time limit is hit.</p>
<!-- /ko -->

<!-- ko if: gametype() !== 'rocketarena' -->
<div class="teaminfo">
	<div class="teaminfo-red btn btn-red" data-bind="event: { click: function () { joinTeam('red'); } }">
		<span class="teaminfo-title">Join Red</span>
		<span class="teaminfo-score" data-bind="text: currentArena().score1().count"></span>
	</div>

	<div class="teaminfo-blue btn btn-blue" data-bind="event: { click: function () { joinTeam('blue'); } }">
		<span class="teaminfo-title">Join Blue</span>
		<span class="teaminfo-score" data-bind="text: currentArena().score2().count"></span>
	</div>
</div>
<!-- /ko -->

<!-- ko if: gametype() === 'rocketarena' -->
<div id="team-select">
	<table class="table">
		<thead>
			<tr>
				<th>Team</th>
				<th>Players</th>
			</tr>
		</thead>
		<tbody>
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
		</tbody>
	</table>
</div>
<!-- /ko -->
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

<a class="btn btn-spectate" href="javascript:void(0)" data-bind="event: { click: function () { joinTeam('s'); } }">Join Spectators</a>

<a class="btn btn-leave-match" href="javascript:void(0)" data-bind="event: { click: function () { disconnect(); } }">Leave Match</a>