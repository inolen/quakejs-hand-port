<div id="scoreboard" class="fullscreen">
	<div id="scoreboard-wrapper" class="dialog" data-bind="css: { 'dialog-wide': isTeamGame() }">
		<div class="match-description">
		<h1 data-bind="text: mapname"></h2> <span data-bind="text: gametype, visible: gametype() !== 'lobby'" class="label"></span> <span class="label" data-bind="text: 'Timelimit ' + timelimit(), visible: timelimit() !== 0"></span> <span class="label" data-bind="text: 'Fraglimit ' + fraglimit(), visible: gametype() === 'ffa' || gametype() === 'tournament'"></span> <span class="label" data-bind="text: 'Capturelimit ' + capturelimit(), visible: gametype() === 'ctf' || gametype() === 'nfctf'"></span>
		</div>

		<!-- ko if: !isTeamGame() -->
		<div class="scores">
			<div class="team team-free">
				<table class="table">
					<thead>
						<tr>
							<th>Player</th>
							<th>Score</th>
							<th>Frags</th>
							<th>Deaths</th>
							<th>Time</th>
							<th>Ping</th>
						</tr>
					</thead>
					<tbody data-bind="foreach: freeScores()">
						<tr>
							<td data-bind="text: name"></td>
							<td data-bind="text: score"></td>
							<td data-bind="text: frags"></td>
							<td data-bind="text: deaths"></td>
							<td data-bind="text: time"></td>
							<td data-bind="text: ping"></td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
		<!-- /ko -->

		<!-- ko if: isTeamGame() -->
		<div class="summary">
			<span data-bind="if: score1() > score2()">
				Red team leads Blue, <span data-bind="text: score1"></span> to <span data-bind="text: score2"></span>
			</span>
			<span data-bind="if: score2() > score1()">
				Blue team leads red, <span data-bind="text: score2"></span> to <span data-bind="text: score1"></span>
			</span>
			<span data-bind="if: score1() === score2()">
				Teams are tied, <span data-bind="text: score1"></span> to <span data-bind="text: score2"></span>
			</span>
		</div>

		<div class="scores">
			<div class="team team-red">
				<div class="header">
					<span class="status"><i class="icon-user"></i> <span data-bind="text: redScores().length"></span></span> Red Team
				</div>
				<table class="table">
					<thead>
						<tr>
							<th>Player</th>
							<th>Score</th>
							<th>Frags</th>
							<th>Deaths</th>
							<th>Time</th>
							<th>Ping</th>
						</tr>
					</thead>
					<tbody data-bind="foreach: redScores()">
						<tr data-bind="css: { localplayer: localPlayer, eliminated: eliminated }">
							<td data-bind="text: name"></td>
							<td data-bind="text: score"></td>
							<td data-bind="text: frags"></td>
							<td data-bind="text: deaths"></td>
							<td data-bind="text: time"></td>
							<td data-bind="text: ping"></td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="team team-blue">
				<div class="header">
					<span class="status"><i class="icon-user"></i> <span data-bind="text: blueScores().length"></span></span> Blue Team
				</div>
				<table class="table">
					<thead>
						<tr>
							<th>Player</th>
							<th>Score</th>
							<th>Frags</th>
							<th>Deaths</th>
							<th>Time</th>
							<th>Ping</th>
						</tr>
					</thead>
					<tbody data-bind="foreach: blueScores()">
						<tr data-bind="css: { localplayer: localPlayer, eliminated: eliminated }">
							<td data-bind="text: name"></td>
							<td data-bind="text: score"></td>
							<td data-bind="text: frags"></td>
							<td data-bind="text: deaths"></td>
							<td data-bind="text: time"></td>
							<td data-bind="text: ping"></td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
		<!-- /ko -->

		<div class="spectators">
			<div class="header"><span class="label label-green">Spectators</span></div>
			<ul data-bind="foreach: specScores()">
				<li data-bind="text: name"></li>
			</ul>
		</div>
	</div>
</div>