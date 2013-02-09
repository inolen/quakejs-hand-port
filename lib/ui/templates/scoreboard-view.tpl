<div id="scoreboard" data-bind="visible: visible">
	<div id="scoreboard-wrapper">
		<!-- ko if: gametype() === 'ffa' || gametype() === 'tournament' -->
		<div class="scores">
			<div class="team team-free">
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Ping</th>
							<th>Score</th>
						</tr>
					</thead>
					<tbody data-bind="foreach: freeScores">
						<tr>
							<td data-bind="text: name"></td>
							<td data-bind="text: ping"></td>
							<td data-bind="text: score"></td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
		<!-- /ko -->

		<!-- ko if: gametype() === 'team' || gametype() === 'ctf' || gametype() === 'nfctf' || gametype() === 'ca' -->
		<div class="summary">
			<span data-bind="if: score1 > score2">
				Red team leads Blue, <span data-bind="text: score1"></span> to <span data-bind="text: score2"></span>
			</span>
			<span data-bind="if: score2 > score1">
				Blue team leads red, <span data-bind="text: score2"></span> to <span data-bind="text: score1"></span>
			</span>
			<span data-bind="if: score1() === score2()">
				Teams are tied, <span data-bind="text: score1"></span> to <span data-bind="text: score2"></span>
			</span>
		</div>

		<div class="scores">
			<div class="team team-red">
				<div class="header">
					<span class="status"><span class="player" data-image="icons/player.png">&nbsp;</span> <span data-bind="text: redScores().length"></span></span> Red Team
				</div>
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Ping</th>
							<th>Score</th>
						</tr>
					</thead>
					<tbody data-bind="foreach: redScores">
						<tr data-bind="css: { eliminated: score.eliminated }">
							<td data-bind="text: name"></td>
							<td data-bind="text: ping"></td>
							<td data-bind="text: score"></td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="team team-blue">
				<div class="header">
					<span class="status"><span class="player" data-image="icons/player.png">&nbsp;</span> <span data-bind="text: blueScores().length"></span> Blue Team
				</div>
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Ping</th>
							<th>Score</th>
						</tr>
					</thead>
					<tbody data-bind="foreach: blueScores">
						<tr data-bind="css: { eliminated: score.eliminated }">
							<td data-bind="text: name"></td>
							<td data-bind="text: ping"></td>
							<td data-bind="text: score"></td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
		<!-- /ko -->

		<div class="spectators">
			<div class="header">Spectators</div>
			<ul data-bind="foreach: specScores">
				<li data-bind="text: name"></li>
			</ul>
		</div>
	</div>
</div>