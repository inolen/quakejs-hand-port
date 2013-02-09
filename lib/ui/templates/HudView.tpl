<div id="hud" data-bind="visible: visible">
	<div id="gamestate-wrapper">
		<div class="gametype-info">
		</div>
		<div class="scores">
			<!-- ko if: gametype() === 'team' || gametype() === 'ctf' || gametype() === 'nfctf' || gametype() === 'ca' -->
				<div class="score-wrapper score1 team-red" data-bind="css: { localplayer: score1.localplayer }">
					<span class="status"><span class="player" data-bind="img: 'icons/player.png'">&nbsp;</span> <span data-bind="text: score1.count"></span></span>
					<span class="name">Red Team</span>
					<span class="score" data-bind="text: score1.score"></span>
				</div>
				<div class="score-wrapper score2 team-blue" data-bind="css: { localplayer: score2.localplayer }">
					<span class="status"><span class="player" data-bind="img: 'icons/player.png'">&nbsp;</span> <span data-bind="text: score2.count"></span></span>
					<span class="name">Blue Team</span>
					<span class="score" data-bind="text: score2.score"></span>
				</div>
			<!-- /ko -->
			<!-- ko if: gametype() === 'ffa' || gametype() === 'tourney' -->
				<div class="score-wrapper score1 team-free" data-bind="css: { localplayer: score1.localplayer }">
					<span class="name" data-bind="text: score1.rank + '. ' + score1.name"></span>
					<span class="score" data-bind="text: score1.score"></span>
				</div>
				<div class="score-wrapper score2 team-free" data-bind="css: { localplayer: score2.localplayer }">
					<span class="name" data-bind="text: score2.rank + '. ' + score2.name"></span>
					<span class="score" data-bind="text: score2.score"></span>
				</div>
			<!-- /ko -->
		</div>
	</div>

	<div id="events-wrapper">
		<ul id="events" data-bind="foreach: events">
			<li class="event">
				<span data-bind="text: text"></span>
			</li>
		</ul>
	</div>

	<div id="crosshair" data-image="gfx/2d/crosshairb"></div>
	<div id="crosshair-name" data-bind="text: crosshairName"></div>

	<div id="fps-wrapper">
		<span id="fps" data-bind="text: fps"></span> FPS
	</div>

	<div id="weapons-wrapper">
		<ul class="weapons" data-bind="foreach: weapons">
			<!-- ko if: $data && icon -->
			<li class="weapon" data-bind="css: { selected: $index() === $parent.weaponSelect() }">
				<span class="icon" data-bind="img: icon"></span>
				<span class="ammo" data-bind="text: ammo > -1 ? ammo : '&nbsp'"></span>
			</li>
			<!-- /ko -->
		</ul>
	</div>

	<div id="health-wrapper">
		<span id="health-text" data-bind="text: health"></span>
		<span id="health-icon" data-bind="img: 'icons/iconh_green.png'"></span>
	</div>

	<div id="armor-wrapper">
		<span id="armor-icon" data-bind="img: 'icons/iconr_yellow.png'"></span>
		<span id="armor-text" data-bind="text: armor"></span>
	</div>

	<div id="lagometer-wrapper" data-bind="visible: lagometerVisible">
		<div class="lag-frames" data-bind="foreach: frames">
			<div class="lag-frame" data-bind="style: { height: Math.abs((val() / 1000) * 10) + 'em', bottom: (val() / 1000) * 10 < 0 ? ((val() / 1000) * 10) + 'em' : 0 }">&nbsp</div>
		</div>
		<div class="snapshot-frames" data-bind="foreach: snapshots">
			<div class="snapshot-frame" data-bind="style: { height: Math.abs((val() / 1000) * 10) + 'em', bottom: (val() / 1000) * 10 < 0 ? ((val() / 1000) * 10) + 'em' : 0 }">&nbsp</div>
		</div>
	</div>

	<div id="counts-wrapper">
		<div><span class="count-label">Shaders:</span> <span class="count-value" data-bind="text: shaders"></span></div>
		<div><span class="count-label">Nodes:</span> <span class="count-value" data-bind="text: nodes() + '/' + leafs()"></span></div>
		<div><span class="count-label">Surfaces:</span> <span class="count-value" data-bind="text: surfaces"><%- surfaces %></span></div>
		<div><span class="count-label">Indexes:</span> <span class="count-value" data-bind="text: indexes"><%- indexes %></span></div>
		<div><span class="count-label">Culled mod out:</span> <span class="count-value" data-bind="text: culledModelOut"><%- culledModelOut %></span></div>
		<div><span class="count-label">Culled mod in:</span> <span class="count-value" data-bind="text: culledModelIn"><%- culledModelIn %></span></div>
		<div><span class="count-label">Culled mod clip:</span> <span class="count-value" data-bind="text: culledModelClip"><%- culledModelClip %></span>
	</div>
</div>