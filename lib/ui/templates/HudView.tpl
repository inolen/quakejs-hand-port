<div id="crosshair" class="centerx centery" data-image="gfx/2d/crosshaira"></div>
<div id="crosshair-name" class="centerx centery"><%- crosshairName || '' %></div>

<div id="gamestate-wrapper">
	<div class="gametype-info">
	</div>
	<div class="scores">
		<% if (gametype === 'team' || gametype === 'ctf' || gametype === 'ca') { %>
			<div class="score-wrapper score1 team-red<% if (score1 && score1.localplayer) { %> localplayer<% } %>">
				<span class="status"><span class="player" data-image="icons/player.png">&nbsp;</span> <% if (score1 !== null) { %><%- score1.count %><% } %></span>
				<span class="name">Red Team</span>
				<span class="score"><% if (score1 !== null) { %><%- score1.score %><% } %></span>
			</div>
			<div class="score-wrapper score2 team-blue<% if (score2 && score2.localplayer) { %> localplayer<% } %>">
				<span class="status"><span class="player" data-image="icons/player.png">&nbsp;</span> <% if (score2 !== null) { %><%- score2.count %><% } %></span>
				<span class="name">Blue Team</span>
				<span class="score"><% if (score2 !== null) { %><%- score2.score %><% } %></span>
			</div>
		<% } else { %>
			<div class="score-wrapper score1 team-free<% if (score1 && score1.localplayer) { %> localplayer<% } %>">
				<span class="name"><% if (score1 !== null) { %><%- score1.rank %>. <%- score1.name %><% } %></span>
				<span class="score"><% if (score1 !== null) { %><%- score1.score %><% } %></span>
			</div>
			<div class="score-wrapper score2 team-free<% if (score2 && score2.localplayer) { %> localplayer<% } %>">
				<span class="name"><% if (score2 !== null) { %><%- score2.rank %>. <%- score2.name %><% } %></span>
				<span class="score"><% if (score2 !== null) { %><%- score2.score %><% } %></span>
			</div>
		<% } %>
	</div>
</div>

<div id="events-wrapper">
	<ul id="events">
		<% for (var i = 0; i < events.length; i++) { %>
			<% var ev = events[i]; %>
			<li class="event event-<%- ev.type %>">
			<% if (ev.type === 'print') { %>
				<span class="text"><%- ev.text %></span>
			<% } else if (ev.type === 'chat' || ev.type === 'tchat') { %>
				<span class="name"><%- ev.name %>: </span><span class="text"><%- ev.text %></span>
			<% } %>
			</li>
		<% } %>
	</ul>
</div>

<div id="fps-wrapper">
	<span id="fps"><%- fps %></span> FPS
</div>

<div id="weapons-wrapper">
	<ul class="weapons">
		<% for (var i = 0; i < weapons.length; i++) { %>
			<% if (!weapons[i]) continue; %>
			<li data-index="<%- i %>" class="weapon<% if (i === weaponSelect) { %> selected<% } %>">
				<span class="icon" data-himage="<%= weapons[i].gfx.icon %>"></span>
				<span class="ammo"><% if (ammo[i] > 0) { print(ammo[i]); } else { print('&nbsp;'); } %></span>
			</li>
		<% } %>
	</ul>
</div>

<div id="health-wrapper">
	<span id="health-text"><%- health %></span>
	<span id="health-icon" data-image="icons/iconh_green.png"></span>
</div>

<div id="armor-wrapper">
	<span id="armor-icon" data-image="icons/iconr_yellow.png"></span>
	<span id="armor-text"><%- armor %></span>
</div>

<div id="lagometer-wrapper"<% if (!lagometerVisible) { %> style="display: none;"<% } %>>
	<% for (var i = 0; i < frames.samples.length; i++) { %>
		<div class="frame-wrapper">
			<div data-index="<%- i %>" class="lag-frame">&nbsp</div>
			<div data-index="<%- i %>" class="snapshot-frame">&nbsp</div>
		</div>
	<% } %>
</div>

<div id="counts-wrapper">
	<div><span class="count-label">Shaders:</span> <span id="count-shaders" class="count-value"><%- shaders %></span></div>
	<div><span class="count-label">Nodes:</span> <span id="count-nodes" class="count-value"><%- nodes %>/<%- leafs %></span></div>
	<div><span class="count-label">Surfaces:</span> <span id="count-surfaces" class="count-value"><%- surfaces %></span></div>
	<div><span class="count-label">Indexes:</span> <span id="count-indexes" class="count-value"><%- indexes %></span></div>
	<div><span class="count-label">Culled mod out:</span> <span id="count-culled-model-out" class="count-value"><%- culledModelOut %></span></div>
	<div><span class="count-label">Culled mod in:</span> <span id="count-culled-model-in" class="count-value"><%- culledModelIn %></span></div>
	<div><span class="count-label">Culled mod clip:</span> <span id="count-culled-model-clip" class="count-value"><%- culledModelClip %></span></div>
</div>