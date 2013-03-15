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

<!-- ko if: gametype() === 'practicearena' -->
<!-- ko if: currentArenaNum() === 0 -->
<p>This is a <span class="white">Rocket Arena</span> server.</p>
<p>On Rocket Arena servers, each level contains multiple arenas, each playing a different gametype. Select an arena from below, or run through a portal, to get started.</p>
<!-- /ko -->
<!-- /ko -->

<!-- ko if: gametype() === 'rocketarena' -->
<p>This is a <span class="white">Rocket Arena</span> game. Join a team or create a team of your own for others to join. You will wait in line for your chance against the champion(s). The winning team stays on the battleground until it is defeated.</p>
<p>When all members of one team are dead, the other team is declared the victor. If all members of both teams die, a tie is declared and the teams re-enter the arena.</p>
<!-- /ko -->

<!-- ko if: gametype() === 'clanarena' -->
<p>This is a <span class="white">Clan Arena</span> game. Join a team and wait for the current round to end. Once the round is over you will be placed in the arena.</p>

<p>When you die you will be placed in spectator mode and allowed to watch the rest of the round. The last team standing wins the round, a team wins the overall match once they've won the majority of the total number of rounds.</p>
<!-- /ko -->

<!-- ko if: gametype() !== 'rocketarena' && gametype() !== 'practicearena' -->
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
				<th>&nbsp;</th>
			</tr>
		</thead>
		<tbody>
			<!-- ko foreach: currentArena().groups -->
			<tr data-bind="css: { localplayer: $parent.currentGroup() === name() }">
				<td data-bind="event: { click: function () { $parent.joinTeam(name()); } }"><span data-bind="text: name"></span></td>
				<td data-bind="event: { click: function () { $parent.joinTeam(name()); } }, text: count() === $parent.currentArena().playersPerTeam() ? 'FULL' : count() + ' / ' + $parent.currentArena().playersPerTeam()"></td>
				<td class="join"><span>Join&nbsp;<i class="icon-chevron-right"></i></span></td>
			</tr>
			<!-- /ko -->
			<tr>
				<td data-bind="visible: currentGroup() === null, event: { click: createTeam }" colspan="3">Create team</td>
			</tr>
			<tr>
				<td data-bind="visible: currentGroup() !== null, event: { click: leaveTeam }" colspan="3">Leave team</td>
			</tr>
		</tbody>
	</table>
</div>
<!-- /ko -->
<!-- /ko -->

<!-- ko if: arenas().length > 1 -->
<div id="arena-select">
	<table class="table">
		<thead>
			<tr>
				<th>Arena</th>
				<th>Gametype</th>
				<th>Players</th>
				<th>&nbsp;</th>
			</tr>
		</thead>
		<tbody data-bind="foreach: arenas">
			<tr data-bind="visible: $index() !== 0">
				<td data-bind="event: { click: function () { $parent.joinArena($index()); } }, text: name"></td>
				<td data-bind="event: { click: function () { $parent.joinArena($index()); } }, text: type"></td>
				<td data-bind="event: { click: function () { $parent.joinArena($index()); } }, text: count"></td>
				<td class="join"><span>Join&nbsp;<i class="icon-chevron-right"></i></span></td>
			</tr>
		</tbody>
	</table>
</div>
<!-- /ko -->

<a class="btn btn-spectate" href="javascript:void(0)" data-bind="event: { click: function () { joinTeam('s'); } }">Join Spectators</a>

<a class="btn btn-leave-match" href="javascript:void(0)" data-bind="event: { click: function () { disconnect(); } }">Leave Server</a>